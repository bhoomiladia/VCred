import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';

export async function POST(request: Request) {
  try {
    let { batchId, templateId, layoutConfig } = await request.json();
    batchId = batchId?.trim();

    if (!batchId || !templateId) {
      return NextResponse.json({ error: 'batchId and templateId are required' }, { status: 400 });
    }

    await connectDB();

    // Update all degrees in this batch with the selected template
    await Degree.updateMany(
      { batchId: batchId },
      { 
        $set: { 
          templateId,
          layoutConfig: layoutConfig || {}
        } 
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: `Template "${templateId}" assigned to batch ${batchId}.` 
    });

  } catch (error: any) {
    console.error('API Error /institution/save-template:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
