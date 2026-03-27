import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import OtpAuth from '@/models/OtpAuth';
import { sendOtpEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Extract domain and check if an institution exists with this officialEmailDomain
    const domainMatch = email.match(/@(.+)$/);
    const domain = domainMatch ? domainMatch[1].toLowerCase().trim() : null;

    if (!domain) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await connectDB();

    const institution = await User.findOne({
      role: 'institution',
      officialEmailDomain: domain,
    });

    if (!institution) {
      return NextResponse.json(
        { error: 'This email does not belong to a registered institution.' },
        { status: 403 }
      );
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save to OTP collection (upsert by email so previous OTP is overwritten)
    await OtpAuth.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // 4. Send Email via centralized helper
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await sendOtpEmail(email, otp);
      } else {
        // Fallback logger for dev without email credentials
        console.log(`\n📧 [DEV MODE] Email to ${email} -> OTP: ${otp}\n`);
      }
    } catch (mailError) {
      console.error('Mail Error:', mailError);
      return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error: any) {
    console.error('API Error /onboard/student/send-otp:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
