import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import User from '@/models/User';
import crypto from 'crypto';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    await connectDB();
    const { hash } = await params;
    
    // Normalize the hash - match with or without 0x prefix
    const normalizedHash = hash.startsWith('0x') ? hash : `0x${hash}`;
    const rawHash = normalizedHash.replace('0x', '');

    const credential = await Degree.findOne({ 
      credentialHash: { $in: [normalizedHash, rawHash] }
    }).lean();

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found in registry' }, { status: 404 });
    }

    const dataString = 
      credential.name + 
      credential.rollNumber + 
      credential.degreeTitle + 
      credential.cgpa + 
      (credential.institutionName || "");
    const calculatedHash = `0x${crypto.createHash('sha256').update(dataString).digest('hex')}`;
    
    // Live lookup of institution name
    let instUser = null;
    if (credential.institutionId) {
      instUser = await User.findOne({ walletAddress: credential.institutionId.toLowerCase() }).lean();
    }

    // Assign dbTampered status to detect MongoDB alterations
    const credentialWithTamper = {
      ...credential,
      // Priority: 1. Live Name from User doc, 2. Saved name from Degree doc, 3. Default
      institutionName: instUser?.institutionName || credential.institutionName || "Registered Tech University",
      dbTampered: calculatedHash !== credential.credentialHash
    };

    return NextResponse.json({ credential: credentialWithTamper });
  } catch (error) {
    console.error('API Error /verify/[hash]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
