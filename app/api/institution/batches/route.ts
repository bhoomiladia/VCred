import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    // Build institution filter for multi-tenant isolation
    const matchFilter: Record<string, any> = {};
    if (walletAddress) {
      matchFilter.institutionId = walletAddress.toLowerCase();
    }
    
    // Group degrees by batchId to yield unique Merkle Roots for the blockchain
    const batches = await Degree.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$batchId",
          batchId: { $first: "$batchId" },
          merkleRoot: { $first: "$merkleRoot" },
          // If any student is PENDING, the batch should appear in Pending Mints
          // Lexically: "PENDING" > "MINTED". So $max gives "PENDING" if any exist.
          status: { $max: "$status" },
          isPublished: { $first: "$isPublished" },
          institutionName: { $first: "$institutionName" },
          studentCount: { $sum: 1 },
          issuedAt: { $first: "$issuedAt" },
          templateId: { $first: "$templateId" }
        }
      },
      { $sort: { issuedAt: -1 } }
    ]);

    return NextResponse.json({ batches });
  } catch (error) {
    console.error('API Error /institution/batches:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
