/**
 * scripts/issueBatch.ts
 * Smart Issuance Engine for VCred
 *
 * Usage:  npx tsx scripts/issueBatch.ts
 *
 * What it does:
 *  1. Reads students.csv
 *  2. Filters students with cgpa < 6.0 (these are not issued degrees)
 *  3. Groups remaining students by batchId
 *  4. Builds a Merkle Tree per batch using keccak256 with sortPairs: true
 *     (compatible with OpenZeppelin's MerkleProof.sol)
 *  5. Saves each student to MongoDB with their credentialHash and merkleProof
 *  6. Logs each batchId and its Merkle root
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import mongoose from 'mongoose';
import connectDB from '../lib/mongodb.js';
import Degree from '../models/Degree.js';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface StudentCSVRow {
  name: string;
  rollNumber: string;
  degreeTitle: string;
  branch: string;
  cgpa: number;       // parsed from string → number
  email: string;
  batchId: string;
}

interface BatchGroup {
  batchId: string;
  students: StudentCSVRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the keccak256 leaf for a student.
 * Formula: keccak256(name + rollNumber + degreeTitle + cgpa)
 * This is the same formula that the Solidity verifier will use.
 */
function computeLeaf(student: StudentCSVRow): Buffer {
  return keccak256(
    Buffer.from(
      student.name + student.rollNumber + student.degreeTitle + student.cgpa
    )
  );
}

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

function parseCSV(filePath: string): Promise<StudentCSVRow[]> {
  return new Promise((resolve, reject) => {
    const rows: StudentCSVRow[] = [];

    createReadStream(filePath)
      .pipe(csv())
      .on('data', (raw: Record<string, string>) => {
        const row: StudentCSVRow = {
          name:        raw['name']?.trim(),
          rollNumber:  raw['rollNumber']?.trim(),
          degreeTitle: raw['degreeTitle']?.trim(),
          branch:      raw['branch']?.trim(),
          cgpa:        parseFloat(raw['cgpa']),
          email:       raw['email']?.trim(),
          batchId:     raw['batchId']?.trim(),
        };
        rows.push(row);
      })
      .on('end', () => resolve(rows))
      .on('error', (err: Error) => reject(err));
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Parse the CSV
  const csvPath = path.resolve(process.cwd(), 'students.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`❌ students.csv not found at: ${csvPath}`);
  }

  console.log(`\n📄 Parsing ${csvPath} ...`);
  const allStudents = await parseCSV(csvPath);
  console.log(`📊 Total rows parsed: ${allStudents.length}`);

  // 3. Filter: skip students with cgpa < 6.0
  const passing = allStudents.filter(s => s.cgpa >= 6.0);
  const filtered = allStudents.length - passing.length;
  console.log(`🚫 Filtered out (cgpa < 6.0): ${filtered} student(s)`);
  console.log(`✅ Eligible students: ${passing.length}`);

  // 4. Group by batchId
  const batchMap = new Map<string, StudentCSVRow[]>();
  for (const student of passing) {
    const group = batchMap.get(student.batchId) ?? [];
    group.push(student);
    batchMap.set(student.batchId, group);
  }

  const batches: BatchGroup[] = Array.from(batchMap.entries()).map(
    ([batchId, students]) => ({ batchId, students })
  );

  console.log(`\n🗂  Batches found: ${batches.map(b => b.batchId).join(', ')}\n`);
  console.log('─'.repeat(60));

  // 5. For each batch: build Merkle Tree → save students to DB
  for (const batch of batches) {
    const { batchId, students } = batch;

    // Compute leaves
    const leaves: Buffer[] = students.map(computeLeaf);

    // Build tree with sortPairs: true (OpenZeppelin compatible)
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const hexRoot = tree.getHexRoot();

    console.log(`\n🌳 Batch: ${batchId}`);
    console.log(`   Students: ${students.length}`);
    console.log(`   Merkle Root: ${hexRoot}`);

    // 6. Upsert each student into MongoDB
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const leaf = leaves[i];
      const credentialHash = '0x' + leaf.toString('hex');
      const merkleProof: string[] = tree.getHexProof(leaf);

      await Degree.findOneAndUpdate(
        { rollNumber: student.rollNumber },
        {
          name:           student.name,
          rollNumber:     student.rollNumber,
          degreeTitle:    student.degreeTitle,
          branch:         student.branch,
          cgpa:           student.cgpa,
          email:          student.email,
          batchId:        student.batchId,
          credentialHash,
          merkleProof,
          merkleRoot:     hexRoot,
          issuedAt:       new Date(),
        },
        { upsert: true, new: true }
      );
    }

    console.log(`   ✅ Saved ${students.length} record(s) to MongoDB`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n🎉 Smart Issuance complete!\n');
  console.log('📦 Batch Summary:');
  for (const batch of batches) {
    const leaves: Buffer[] = batch.students.map(computeLeaf);
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    console.log(`   ${batch.batchId}  →  Root: ${tree.getHexRoot()}`);
  }

  // 7. Close MongoDB connection
  await mongoose.connection.close();
  console.log('\n🔒 MongoDB connection closed. Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error in issueBatch:', err);
  mongoose.connection.close().finally(() => process.exit(1));
});
