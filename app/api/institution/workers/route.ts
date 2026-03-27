import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET all workers for an institution
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminAddress = searchParams.get('adminAddress');

    if (!adminAddress) {
      return NextResponse.json({ error: 'Missing admin address' }, { status: 400 });
    }

    await connectDB();

    const admin = await User.findOne({ walletAddress: adminAddress.toLowerCase(), role: 'institution', subRole: 'admin' });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const workers = await User.find({ 
      institutionId: admin._id,
      role: 'institution',
      subRole: 'worker'
    }).sort({ createdAt: -1 });

    return NextResponse.json({ workers });
  } catch (error: any) {
    console.error('API Error /institution/workers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// UPDATE worker status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { workerId, status, adminAddress } = body;

    if (!workerId || !status || !adminAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Verify requester is the admin of this institution
    const admin = await User.findOne({ walletAddress: adminAddress.toLowerCase(), role: 'institution', subRole: 'admin' });
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const worker = await User.findOneAndUpdate(
      { _id: workerId, institutionId: admin._id },
      { workerStatus: status },
      { new: true }
    );

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, worker });
  } catch (error: any) {
    console.error('API Error /institution/workers (PUT):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
