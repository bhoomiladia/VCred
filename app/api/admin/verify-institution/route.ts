import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { userId, action } = await request.json();

    if (!userId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    await connectDB();

    const updatedStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

    const user = await User.findByIdAndUpdate(
      userId,
      { verificationStatus: updatedStatus },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('API Error /admin/verify-institution:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
