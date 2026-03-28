import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { extractFromImage } from '@/lib/ocr';
import Degree from '@/models/Degree';
import { computeLeaf } from '@/lib/merkle';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Run OCR to extract student data
    const ocrResult = await extractFromImage(buffer);

    if (!ocrResult || (!ocrResult.rollNumber && !ocrResult.name)) {
      return NextResponse.json({ 
        error: 'Could not extract data from certificate. Try a higher resolution scan.',
        ocrResult: ocrResult || null,
      }, { status: 422 });
    }

    await connectDB();

    // Multi-strategy DB lookup
    let credential = null;

    // Strategy 1: Look for roll number (most reliable)
    if (ocrResult.rollNumber) {
      credential = await Degree.findOne({
        rollNumber: { $regex: new RegExp(`^${ocrResult.rollNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).lean();
    }

    // Strategy 2: Look for name
    if (!credential && ocrResult.name) {
      credential = await Degree.findOne({
        name: { $regex: new RegExp(`^${ocrResult.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).lean();
    }

    // Strategy 3: Fuzzy name match (first + last name)
    if (!credential && ocrResult.name) {
      const nameParts = ocrResult.name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        credential = await Degree.findOne({
          name: { $regex: new RegExp(`${firstName}.*${lastName}`, 'i') }
        }).lean();
      }
    }

    if (!credential) {
      return NextResponse.json({ 
        error: 'Credential not found in registry', 
        ocrResult: {
          name: ocrResult.name,
          rollNumber: ocrResult.rollNumber,
          cgpa: ocrResult.cgpa,
          degreeTitle: ocrResult.degreeTitle,
          confidence: ocrResult.confidence,
        }
      }, { status: 404 });
    }

    // Tamper check using the canonical computeLeaf
    const calculatedHash = '0x' + computeLeaf({
      name: credential.name,
      rollNumber: credential.rollNumber,
      degreeTitle: credential.degreeTitle,
      cgpa: credential.cgpa,
      institutionName: credential.institutionName || '',
    }).toString('hex');

    const dbTampered = credential.credentialHash
      ? calculatedHash !== credential.credentialHash
      : false;

    return NextResponse.json({
      credential: {
        ...credential,
        dbTampered,
      },
      ocrResult: {
        name: ocrResult.name,
        rollNumber: ocrResult.rollNumber,
        cgpa: ocrResult.cgpa,
        degreeTitle: ocrResult.degreeTitle,
        branch: ocrResult.branch,
        institutionName: ocrResult.institutionName,
        confidence: ocrResult.confidence,
        filterUsed: ocrResult.filterUsed,
        needsReview: ocrResult.needsReview,
      }
    });

  } catch (error) {
    console.error('API Error /verify/ocr:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
