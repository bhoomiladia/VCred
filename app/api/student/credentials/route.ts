import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const credentials = await Degree.find({ rollNumber: user.rollNumber }).sort({ issuedAt: -1 });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('API Error /student/credentials:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
