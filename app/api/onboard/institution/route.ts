import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      walletAddress, 
      institutionName, 
      officialEmailDomain, 
      adminEmail, 
      location, 
      website, 
      institutionLogo, 
      isGovtRegistered,
      subRole,
      workerStatus,
      institutionId,
      name,
      roll,
      dept
    } = body;

    if (!walletAddress || !institutionName || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      {
        role: 'institution',
        subRole: subRole || 'admin',
        isProfileComplete: true,
        institutionName,
        name,
        officialEmailDomain,
        email: adminEmail,
        location,
        website,
        institutionLogo,
        isGovtRegistered,
        workerStatus: workerStatus || (subRole === 'worker' ? 'PENDING' : undefined),
        institutionId: institutionId || undefined,
        rollNumber: roll || undefined,
        branch: dept || undefined,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('API Error /onboard/institution:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
