import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { extractFromImage, OcrResult } from '@/lib/ocr';
import Degree from '@/models/Degree';
import { computeLeaf } from '@/lib/merkle';

// Simple reference extractor (inlined from removed url-extractor.ts)
const REFERENCE_PATTERNS = [
  /https?:\/\/[^\s]+\/verify\/[^\s]+/i,
  /0x[a-fA-F0-9]{64}/,
];

function extractReference(text: string): string | null {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const hash = formData.get('hash') as string;

    if (!file) {
      return NextResponse.json({ error: 'No certificate file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Run OCR on the uploaded certificate
    const ocrResult = await extractFromImage(buffer);

    if (!ocrResult || (!ocrResult.rollNumber && !ocrResult.name)) {
      return NextResponse.json({ 
        error: 'Could not extract data from the certificate image. Try a higher resolution scan.',
        ocrResult: ocrResult ? {
          name: ocrResult.name,
          rollNumber: ocrResult.rollNumber,
          cgpa: ocrResult.cgpa,
          confidence: ocrResult.confidence,
        } : null,
      }, { status: 422 });
    }

    // 2. Fetch the official/expected metadata
    let expected: { name: string; rollNumber: string; cgpa: number; degreeTitle?: string; institutionName?: string; issuedAt?: any; credentialHash?: string };
    let dbTampered = false;

    // Use provided hash or try to detect from OCR text
    const reference = hash || extractReference(ocrResult.rawText);

    await connectDB();

    let credentialFromRef = null;
    if (reference) {
      // extract hash from either "0x..." or "https://.../0x..."
      const parts = reference.split('/');
      const potentialHash = parts[parts.length - 1];
      const normalizedHash = potentialHash.startsWith('0x') ? potentialHash : `0x${potentialHash}`;
      const rawHash = normalizedHash.replace('0x', '');

      credentialFromRef = await Degree.findOne({
        $or: [
          { credentialHash: normalizedHash },
          { credentialHash: rawHash }
        ]
      }).lean();
    }

    if (credentialFromRef) {
      // 2a. Handle found reference
      const credential = credentialFromRef;
      expected = {
        name: credential.name,
        rollNumber: credential.rollNumber,
        cgpa: credential.cgpa,
        degreeTitle: credential.degreeTitle,
        institutionName: credential.institutionName,
        issuedAt: credential.issuedAt,
        credentialHash: credential.credentialHash
      };

      // Tamper check using canonical computeLeaf
      const calculatedHash = '0x' + computeLeaf({
        name: credential.name,
        rollNumber: credential.rollNumber,
        degreeTitle: credential.degreeTitle,
        cgpa: credential.cgpa,
        institutionName: credential.institutionName || '',
      }).toString('hex');
      dbTampered = credential.credentialHash ? calculatedHash !== credential.credentialHash : false;

    } else {
      // 2b. No hash provided or found — look up by OCR-extracted fields
      let credential = null;

      if (ocrResult.rollNumber) {
        credential = await Degree.findOne({
          rollNumber: { $regex: new RegExp(`^${ocrResult.rollNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean();
      }

      if (!credential && ocrResult.name) {
        credential = await Degree.findOne({
          name: { $regex: new RegExp(`^${ocrResult.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean();
      }

      // Fuzzy match
      if (!credential && ocrResult.name) {
        const nameParts = ocrResult.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          credential = await Degree.findOne({
            name: { $regex: new RegExp(`${nameParts[0]}.*${nameParts[nameParts.length - 1]}`, 'i') }
          }).lean();
        }
      }

      if (!credential) {
        return NextResponse.json({ 
          error: 'No matching record found. Please provide a credential hash or ensure the certificate is registered.',
          ocrFound: {
            name: ocrResult.name,
            rollNumber: ocrResult.rollNumber,
            cgpa: ocrResult.cgpa,
          }
        }, { status: 404 });
      }

      expected = {
        name: credential.name,
        rollNumber: credential.rollNumber,
        cgpa: credential.cgpa,
        degreeTitle: credential.degreeTitle,
        institutionName: credential.institutionName,
        issuedAt: credential.issuedAt,
        credentialHash: credential.credentialHash
      };

      // Tamper check
      const calculatedHash = '0x' + computeLeaf({
        name: credential.name,
        rollNumber: credential.rollNumber,
        degreeTitle: credential.degreeTitle,
        cgpa: credential.cgpa,
        institutionName: credential.institutionName || '',
      }).toString('hex');
      dbTampered = credential.credentialHash ? calculatedHash !== credential.credentialHash : false;
    }

    // 3. Compare data
    const mismatches: { field: string; expected: any; actual: any }[] = [];

    // Normalize strings for OCR comparison
    const normalizeStr = (str: any) => String(str || '').replace(/\s+/g, '').toLowerCase();

    // Name comparison
    if (ocrResult.name && normalizeStr(ocrResult.name) !== normalizeStr(expected.name)) {
      mismatches.push({ field: 'Student Name', expected: expected.name, actual: ocrResult.name });
    }

    // Roll number comparison
    if (ocrResult.rollNumber && normalizeStr(ocrResult.rollNumber) !== normalizeStr(expected.rollNumber)) {
      mismatches.push({ field: 'Roll Number', expected: expected.rollNumber, actual: ocrResult.rollNumber });
    }

    // CGPA comparison (allowing small floating point difference)
    if (ocrResult.cgpa > 0 && Math.abs(ocrResult.cgpa - expected.cgpa) > 0.05) {
      mismatches.push({ field: 'CGPA', expected: expected.cgpa, actual: ocrResult.cgpa });
    }

    // 4. Determine status
    let status: 'verified' | 'mismatched' | 'tampered' = 'verified';
    if (mismatches.length > 0) {
      status = 'mismatched';
    }
    if (dbTampered) {
      status = 'tampered';
    }

    return NextResponse.json({
      status,
      mismatches,
      ocrResult: {
        name: ocrResult.name,
        rollNumber: ocrResult.rollNumber,
        cgpa: ocrResult.cgpa,
        degreeTitle: ocrResult.degreeTitle,
        confidence: ocrResult.confidence,
        rawText: ocrResult.rawText
      },
      officialRecord: expected,
      dbTampered
    });

  } catch (error) {
    console.error('API Error /verify/compare:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
