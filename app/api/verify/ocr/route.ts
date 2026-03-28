import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { extractFromImage } from '@/lib/ocr';
import Degree from '@/models/Degree';
import crypto from 'crypto';

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
      return NextResponse.json({ error: 'Could not extract data from certificate' }, { status: 404 });
    }

    await connectDB();

    // Strategy 1: Look for roll number
    let credential = null;
    if (ocrResult.rollNumber) {
      credential = await Degree.findOne({
        rollNumber: { $regex: new RegExp(`^${ocrResult.rollNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).lean();
    }

    // Strategy 2: Look for name (if roll number fails)
    if (!credential && ocrResult.name) {
      credential = await Degree.findOne({
        name: { $regex: new RegExp(`^${ocrResult.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).lean();
    }

    if (!credential) {
      return NextResponse.json({ 
        error: 'Credential not found in registry', 
        ocrFound: ocrResult 
      }, { status: 404 });
    }

    // Tamper check
    const dataString =
      credential.name +
      credential.rollNumber +
      credential.degreeTitle +
      credential.cgpa +
      (credential.institutionName || '');
    const calculatedHash = `0x${crypto.createHash('sha256').update(Buffer.from(dataString)).digest('hex')}`;
    const dbTampered = credential.credentialHash
      ? calculatedHash !== credential.credentialHash
      : false;

    return NextResponse.json({
      credential: {
        ...credential,
        dbTampered,
      },
      ocrResult
    });

  } catch (error) {
    console.error('API Error /verify/ocr:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
