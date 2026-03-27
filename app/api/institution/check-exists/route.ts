import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Missing institution name' }, { status: 400 });
    }

    await connectDB();

    // Search for a VERIFIED institution with this name (owned by an admin)
    const institution = await User.findOne({ 
      institutionName: { $regex: new RegExp(`^${name}$`, 'i') },
      role: 'institution',
      subRole: 'admin',
      verificationStatus: 'VERIFIED'
    });

    if (institution) {
      return NextResponse.json({ 
        exists: true, 
        institutionId: institution._id,
        institutionName: institution.institutionName
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error('API Error /institution/check-exists:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
