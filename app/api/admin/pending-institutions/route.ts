import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    await connectDB();

    // Find all institutions that are waiting for HQ approval
    const pendingInstitutions = await User.find({
      role: 'institution',
      verificationStatus: 'PENDING',
    }).select('-__v');

    return NextResponse.json({ institutions: pendingInstitutions });
  } catch (error: any) {
    console.error('API Error /admin/pending-institutions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
