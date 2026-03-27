import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ walletAddress: address.toLowerCase() });

    if (!user) {
      return NextResponse.json({
        exists: false,
        isProfileComplete: false,
      });
    }

    return NextResponse.json({
      exists: true,
      isProfileComplete: user.isProfileComplete,
      role: user.role,
      verificationStatus: user.verificationStatus,
      user: user,
    });
  } catch (error: any) {
    console.error('API Error /user/status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
