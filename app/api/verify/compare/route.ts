import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { extractFromImage, OcrResult } from '@/lib/ocr';
import Degree from '@/models/Degree';
import crypto from 'crypto';
import { fetchExternalData } from '@/lib/external-fetcher';
import { extractReference } from '@/lib/url-extractor';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const hash = formData.get('hash') as string;

    if (!file) {
      return NextResponse.json({ error: 'No certificate file provided' }, { status: 400 });
    }

    // hash is optional now, we might detect it from OCR

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Run OCR on the uploaded certificate
    const ocrResult = await extractFromImage(buffer);

    if (!ocrResult || (!ocrResult.rollNumber && !ocrResult.name)) {
      return NextResponse.json({ error: 'Could not extract data from the certificate image' }, { status: 422 });
    }

    // 2. Fetch the official/expected metadata
    let expected: { name: string; rollNumber: string; cgpa: number; degreeTitle?: string; institutionName?: string; issuedAt?: any; credentialHash?: string };
    let dbTampered = false;

    // Use provided hash or try to detect from OCR
    const reference = hash || extractReference(ocrResult.rawText);

    if (!reference) {
      return NextResponse.json({ 
        error: 'No reference hash or link provided, and none could be detected from the certificate text.',
        ocrFound: {
          name: ocrResult.name,
          rollNumber: ocrResult.rollNumber,
          cgpa: ocrResult.cgpa
        }
      }, { status: 400 });
    }

    if (reference.startsWith('http://') || reference.startsWith('https://')) {
      // 2a. Handle External URL (e.g., NPTEL)
      const externalResult = await fetchExternalData(reference);
      if (!externalResult) {
        return NextResponse.json({ error: 'Failed to extract data from the external link' }, { status: 400 });
      }
      expected = {
        name: externalResult.name,
        rollNumber: externalResult.rollNumber,
        cgpa: externalResult.cgpa,
        degreeTitle: "External Certificate",
        institutionName: new URL(reference).hostname
      };
    } else {
      // 2b. Handle Blockchain Hash (default)
      await connectDB();
      const cleanHash = reference.split('/').pop() || reference;
      
      const credential = await Degree.findOne({
        $or: [
          { credentialHash: cleanHash },
          { credentialHash: `0x${cleanHash.replace(/^0x/, '')}` }
        ]
      }).lean();

      if (!credential) {
        return NextResponse.json({ 
          error: 'Official record not found in the registry',
          ocrFound: {
            name: ocrResult.name,
            rollNumber: ocrResult.rollNumber,
            cgpa: ocrResult.cgpa
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

      // Secondary Check: If the DB record itself is tampered (Hash mismatch in DB)
      const dataString =
        credential.name +
        credential.rollNumber +
        credential.degreeTitle +
        credential.cgpa +
        (credential.institutionName || '');
      const calculatedHash = `0x${crypto.createHash('sha256').update(Buffer.from(dataString)).digest('hex')}`;
      dbTampered = credential.credentialHash ? calculatedHash !== credential.credentialHash : false;
    }

    // 3. Compare data
    const mismatches: { field: string; expected: any; actual: any }[] = [];

    // Helper to normalize strings for OCR comparison (remove all spaces and convert to lowercase)
    const normalizeStr = (str: any) => String(str || '').replace(/\s+/g, '').toLowerCase();

    // Name comparison
    if (normalizeStr(ocrResult.name) !== normalizeStr(expected.name)) {
      mismatches.push({ field: 'Student Name', expected: expected.name, actual: ocrResult.name });
    }



    // CGPA comparison (allowing small floating point difference)
    if (Math.abs(ocrResult.cgpa - expected.cgpa) > 0.01) {
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
