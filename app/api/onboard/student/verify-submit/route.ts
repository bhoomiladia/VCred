import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import OtpAuth from '@/models/OtpAuth';

export async function POST(request: Request) {
  try {
    const { 
      walletAddress, 
      name, 
      rollNumber, 
      email, 
      branch, 
      otp 
    } = await request.json();

    if (!walletAddress || !name || !rollNumber || !email || !branch || !otp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // 1. Verify OTP
    const validOtp = await OtpAuth.findOne({
      email: email.toLowerCase(),
      otp: otp,
    });

    if (!validOtp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please try again.' },
        { status: 401 }
      );
    }

    // 2. Fetch the matched Institution to link name (optional, but good for UX)
    const domainMatch = email.match(/@(.+)$/);
    const domain = domainMatch ? domainMatch[1].toLowerCase() : '';
    const institution = await User.findOne({
      role: 'institution',
      officialEmailDomain: domain,
    });

    // 3. Delete OTP so it cannot be reused
    await OtpAuth.deleteOne({ _id: validOtp._id });

    // 4. Update the User profile
    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      {
        role: 'student',
        isProfileComplete: true,
        name,
        email: email.toLowerCase(),
        rollNumber,
        branch,
        institutionName: institution ? institution.institutionName : 'Unknown Institution',
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('API Error /onboard/student/verify-submit:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
