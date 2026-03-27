import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import User from '@/models/User';

interface StudentData {
  name: string;
  rollNumber: string;
  degreeTitle: string;
  branch: string;
  cgpa: number;
  email: string;
  batchId: string;
  institutionName: string;
}

export async function POST(request: Request) {
  try {
    const { students, institutionId } = await request.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No student data provided' }, { status: 400 });
    }

    if (!institutionId) {
      return NextResponse.json({ error: 'institutionId (wallet address) is required' }, { status: 400 });
    }

    await connectDB();

    const normalizedInstId = institutionId.toLowerCase();

    // ── DOMAIN VERIFICATION ──
    // Fetch the institution user to get their verified domain
    const institution = await User.findOne({ walletAddress: normalizedInstId });
    
    if (!institution) {
      return NextResponse.json({ error: 'Institution not found. Please complete your profile.' }, { status: 404 });
    }

    if (institution.role !== 'institution') {
      return NextResponse.json({ error: 'Unauthorized. Only institutions can issue certificates.' }, { status: 403 });
    }

    const officialDomain = institution.officialEmailDomain?.toLowerCase().trim();
    if (!officialDomain) {
      return NextResponse.json({ 
        error: 'Institution domain not verified. Please contact HQ to verify your official email domain.' 
      }, { status: 403 });
    }

    // Validate each student email against the official domain
    const invalidEmails = students.filter((s: StudentData) => {
      const emailDomain = s.email?.split('@')[1]?.toLowerCase().trim();
      return emailDomain !== officialDomain;
    });

    if (invalidEmails.length > 0) {
      return NextResponse.json({ 
        error: `Domain mismatch. ${invalidEmails.length} students have emails not ending in @${officialDomain}.`,
        details: invalidEmails.map(s => `${s.name} (${s.email})`)
      }, { status: 400 });
    }

    // Simply process each student and save to the database in a "PENDING" state
    const bulkOps = students.map((student: StudentData) => {
      return {
        updateOne: {
          filter: { rollNumber: student.rollNumber, batchId: student.batchId },
          update: {
            $set: {
              ...student,
              institutionId: normalizedInstId,
              batchId: student.batchId?.trim(),
              issuedAt: new Date(),
              revoked: false,
              status: "PENDING"
            }
          },
          upsert: true
        }
      };
    });

    const result = await Degree.bulkWrite(bulkOps as any);
    const totalSaved = result.upsertedCount + result.modifiedCount + (result.insertedCount || 0);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully uploaded ${totalSaved} student records to the database. They are now pending minting.`,
      totalSaved
    });

  } catch (error: any) {
    console.error('API Error /institution/issue-bulk:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
