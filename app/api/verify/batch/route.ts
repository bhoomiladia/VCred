import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Degree from '@/models/Degree';
import crypto from 'crypto';

interface BatchEntry {
  credentialHash?: string;
  rollNumber?: string;
  name?: string;
  degreeTitle?: string;
  cgpa?: number | string;
  branch?: string;
  email?: string;
  [key: string]: any;
}

// Normalize varied CSV/JSON keys to expected field names
const KEY_MAP: Record<string, string> = {
  name: 'name', studentname: 'name', student_name: 'name', fullname: 'name', full_name: 'name',
  rollnumber: 'rollNumber', roll_number: 'rollNumber', rollno: 'rollNumber', roll_no: 'rollNumber', roll: 'rollNumber',
  degreetitle: 'degreeTitle', degree_title: 'degreeTitle', degree: 'degreeTitle', program: 'degreeTitle', programme: 'degreeTitle', course: 'degreeTitle',
  cgpa: 'cgpa', gpa: 'cgpa', grade: 'cgpa',
  credentialhash: 'credentialHash', credential_hash: 'credentialHash', hash: 'credentialHash',
  branch: 'branch', department: 'branch', dept: 'branch',
  email: 'email', emailid: 'email', email_id: 'email',
};

const COMPARABLE_FIELDS = ['name', 'rollNumber', 'degreeTitle', 'cgpa', 'branch', 'email', 'credentialHash'];

function normalizeEntry(raw: Record<string, any>): BatchEntry {
  const result: BatchEntry = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = KEY_MAP[key.toLowerCase().replace(/[\s_-]+/g, '')] || key;
    result[normalizedKey] = value;
  }
  return result;
}

function compareFields(entry: BatchEntry, credential: any) {
  const mismatches: { field: string; provided: string; expected: string }[] = [];

  for (const field of COMPARABLE_FIELDS) {
    const provided = entry[field];
    if (provided === undefined || provided === null || provided === '') continue;

    const dbValue = credential[field];
    if (dbValue === undefined || dbValue === null) continue;

    const provStr = String(provided).trim().toLowerCase();
    const dbStr = String(dbValue).trim().toLowerCase();

    if (field === 'cgpa') {
      const provNum = parseFloat(String(provided));
      const dbNum = parseFloat(String(dbValue));
      if (!isNaN(provNum) && !isNaN(dbNum) && Math.abs(provNum - dbNum) > 0.001) {
        mismatches.push({ field, provided: String(provided), expected: String(dbValue) });
      }
      continue;
    }

    if (provStr !== dbStr) {
      mismatches.push({ field, provided: String(provided).trim(), expected: String(dbValue).trim() });
    }
  }

  return mismatches;
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const rawEntries: Record<string, any>[] = body.entries;

    if (!rawEntries || !Array.isArray(rawEntries) || rawEntries.length === 0) {
      return NextResponse.json(
        { error: 'Request must include a non-empty "entries" array' },
        { status: 400 }
      );
    }

    if (rawEntries.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 entries per batch' },
        { status: 400 }
      );
    }

    const entries = rawEntries.map(normalizeEntry);

    const results = await Promise.all(
      entries.map(async (entry, index) => {
        try {
          let credential = null;

          // Strategy 1: Direct hash lookup
          if (entry.credentialHash) {
            const hash = String(entry.credentialHash).trim();
            const normalizedHash = hash.startsWith('0x') ? hash : `0x${hash}`;
            const rawHash = normalizedHash.replace('0x', '');
            credential = await Degree.findOne({
              credentialHash: { $in: [normalizedHash, rawHash] },
            }).lean();
          }

          // Strategy 2: Lookup by rollNumber only
          if (!credential && entry.rollNumber) {
            const roll = String(entry.rollNumber).trim();
            credential = await Degree.findOne({
              rollNumber: { $regex: new RegExp(`^${roll.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            }).lean();
          }

          // Strategy 3: Lookup by name only
          if (!credential && entry.name) {
            const nameQuery = String(entry.name).trim();
            credential = await Degree.findOne({
              name: { $regex: new RegExp(`^${nameQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            }).lean();
          }

          // Strategy 4: Lookup by email
          if (!credential && entry.email) {
            const emailQuery = String(entry.email).trim();
            credential = await Degree.findOne({
              email: { $regex: new RegExp(`^${emailQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            }).lean();
          }

          if (!credential) {
            return {
              row: index + 1,
              input: entry,
              status: 'not-found' as const,
              found: false,
            };
          }

          // Field-by-field comparison
          const mismatches = compareFields(entry, credential);

          // Tamper check: recalculate hash
          const dataString = `${credential.name}${credential.rollNumber}${credential.degreeTitle}${credential.cgpa}`;
          const calculatedHash = `0x${crypto.createHash('sha256').update(Buffer.from(dataString)).digest('hex')}`;
          const dbTampered = credential.credentialHash
            ? calculatedHash !== credential.credentialHash
            : false;

          let status: 'verified' | 'tampered' | 'mismatched' = 'verified';
          if (mismatches.length > 0) status = 'mismatched';
          else if (dbTampered) status = 'tampered';

          return {
            row: index + 1,
            input: entry,
            status,
            found: true,
            credential: {
              name: credential.name,
              rollNumber: credential.rollNumber,
              degreeTitle: credential.degreeTitle,
              branch: credential.branch,
              cgpa: credential.cgpa,
              email: credential.email,
              credentialHash: credential.credentialHash,
              merkleRoot: credential.merkleRoot,
              issuedAt: credential.issuedAt,
              institutionName: credential.institutionName,
              revoked: credential.revoked,
              status: credential.status,
            },
            mismatches: mismatches.length > 0 ? mismatches : undefined,
            dbTampered,
          };
        } catch (err) {
          return {
            row: index + 1,
            input: entry,
            status: 'error' as const,
            found: false,
            error: 'Failed to process entry',
          };
        }
      })
    );

    const summary = {
      total: results.length,
      verified: results.filter((r) => r.status === 'verified').length,
      notFound: results.filter((r) => r.status === 'not-found').length,
      tampered: results.filter((r) => r.status === 'tampered').length,
      mismatched: results.filter((r) => r.status === 'mismatched').length,
      errors: results.filter((r) => r.status === 'error').length,
    };

    return NextResponse.json({ results, summary });
  } catch (error) {
    console.error('API Error /verify/batch:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
