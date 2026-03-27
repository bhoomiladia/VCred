import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import { sendIssuanceEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { batchId: rawBatchId, txHash, institutionId } = await request.json();
    const batchId = rawBatchId?.trim();

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    await connectDB();

    // Build scoped filter for multi-tenant isolation
    const filter: Record<string, any> = { batchId };
    if (institutionId) filter.institutionId = institutionId.toLowerCase();

    // Mark all degrees in this batch as published
    const updateResult = await Degree.updateMany(
      filter,
      { 
        $set: { 
          isPublished: true,
          blockchainTxHash: txHash || "" 
        } 
      }
    );

    console.log(`Updated ${updateResult.modifiedCount} records for batch ${batchId}`);

    // Fetch students to notify them
    const students = await Degree.find(filter);
    console.log(`Found ${students.length} students to notify for batch ${batchId}`);
    
    // Notify students sequentially to prevent SMTP rate limits (421 error)
    for (const student of students) {
      if (student.email) {
        await sendIssuanceEmail(student.email, student.name, student.degreeTitle);
        // Small delay between each email to prevent Google SMTP "Temporary System Problem"
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Batch ${batchId} marked as published and ${students.length} students notified.` 
    });

  } catch (error: any) {
    console.error('API Error /institution/mark-published:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
