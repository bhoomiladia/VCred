import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import { computeLeaf } from '@/lib/merkle';

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    let credential = null;

    // Strategy 1: Credential Hash lookup
    const normalizedHash = query.startsWith('0x') ? query : `0x${query}`;
    const rawHash = normalizedHash.replace('0x', '');
    
    credential = await Degree.findOne({
      credentialHash: { $in: [normalizedHash, rawHash] },
    }).lean();

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found in registry' }, { status: 404 });
    }

    // Tamper check using canonical computeLeaf
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
    });
  } catch (error) {
    console.error('API Error /verify/search:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
