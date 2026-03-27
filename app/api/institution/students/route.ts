import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';

// GET /api/institution/students?batch=HIT-2026-B1&walletAddress=0x...
// Returns all student degree records, optionally filtered by batchId, scoped by institution
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch');
    const walletAddress = searchParams.get('walletAddress');

    const query: Record<string, any> = {};
    if (batchId) query.batchId = batchId;
    if (walletAddress) query.institutionId = walletAddress.toLowerCase();

    await connectDB();

    const records = await Degree.find(query)
      .sort({ batchId: 1, name: 1 })
      .lean();

    // Compute unique batches for the filter dropdown
    const batches = [...new Set(records.map((r: any) => r.batchId))].sort();

    return NextResponse.json({ records, batches });
  } catch (error) {
    console.error('API Error /institution/students:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/institution/students — revoke (toggle status on a credential)  
export async function POST(request: Request) {
  try {
    const { credentialHash, action } = await request.json();
    if (!credentialHash || !['revoke', 'activate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await connectDB();

    // We store a `revoked` boolean on the Degree model
    const degree = await Degree.findOneAndUpdate(
      { credentialHash },
      { revoked: action === 'revoke' },
      { new: true }
    );

    if (!degree) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

    return NextResponse.json({ success: true, degree });
  } catch (error) {
    console.error('API Error POST /institution/students:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
