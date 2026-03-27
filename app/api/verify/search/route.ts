import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    let credential = null;

    // Strategy 1: Credential Hash lookup only
    const normalizedHash = query.startsWith('0x') ? query : `0x${query}`;
    const rawHash = normalizedHash.replace('0x', '');
    
    credential = await Degree.findOne({
      credentialHash: { $in: [normalizedHash, rawHash] },
    }).lean();

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found in registry' }, { status: 404 });
    }

    // Tamper check
    const dataString = `${credential.name}${credential.rollNumber}${credential.degreeTitle}${credential.cgpa}`;
    const calculatedHash = `0x${crypto.createHash('sha256').update(Buffer.from(dataString)).digest('hex')}`;
    const dbTampered = credential.credentialHash
      ? calculatedHash !== credential.credentialHash
      : false;

    return NextResponse.json({
      credential: {
        ...credential,
        dbTampered,
      },
    });
  } catch (error) {
    console.error('API Error /verify/search:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
