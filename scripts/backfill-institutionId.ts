/**
 * One-time migration script: Backfill institutionId on existing Degree records.
 *
 * For each Degree that has an `institutionName` but no `institutionId`, this
 * script looks up the institution's User record and stamps the institution
 * admin's wallet address as the `institutionId`.
 *
 * Usage:
 *   npx tsx scripts/backfill-institutionId.ts
 *
 * Requires: MONGODB_URI in .env
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';

// Bypass local DNS resolution issues with mongodb+srv on Windows/Node 18+
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  console.warn('⚠️ Failed to set custom DNS settings:', e);
}

// ── Inline schemas (to avoid Next.js module resolution issues) ───────────────

const DegreeSchema = new mongoose.Schema(
  {
    name:             { type: String },
    rollNumber:       { type: String },
    degreeTitle:      { type: String },
    branch:           { type: String },
    cgpa:             { type: Number },
    email:            { type: String },
    batchId:          { type: String },
    institutionName:  { type: String },
    institutionId:    { type: String },
    status:           { type: String },
  },
  { collection: 'degrees' }
);

const UserSchema = new mongoose.Schema(
  {
    walletAddress:    { type: String },
    role:             { type: String },
    subRole:          { type: String },
    institutionName:  { type: String },
  },
  { collection: 'users' }
);

const Degree = mongoose.models.Degree || mongoose.model('Degree', DegreeSchema);
const User   = mongoose.models.User   || mongoose.model('User', UserSchema);

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri, {
    family: 4, 
    serverSelectionTimeoutMS: 15000 
  });
  console.log('✅ Connected.\n');

  // Find all degrees missing an institutionId
  const orphans = await Degree.find({
    $or: [
      { institutionId: { $exists: false } },
      { institutionId: null },
      { institutionId: '' },
    ],
  }).lean();

  console.log(`📋 Found ${orphans.length} Degree records without institutionId.\n`);

  if (orphans.length === 0) {
    console.log('Nothing to do — all records already have an institutionId.');
    await mongoose.disconnect();
    return;
  }

  // Build a cache of institutionName → walletAddress
  const institutionAdmins = await User.find({
    role: 'institution',
    subRole: 'admin',
  }).lean();

  const nameToWallet = new Map<string, string>();
  for (const inst of institutionAdmins) {
    if (inst.institutionName && inst.walletAddress) {
      nameToWallet.set(
        inst.institutionName.trim().toLowerCase(),
        inst.walletAddress.toLowerCase()
      );
    }
  }

  console.log(`🏛️  Found ${nameToWallet.size} institution admin(s) to map from.\n`);

  let updated = 0;
  let skipped = 0;

  for (const degree of orphans as any[]) {
    const instName = degree.institutionName?.trim().toLowerCase();
    if (!instName) {
      skipped++;
      continue;
    }

    const walletAddress = nameToWallet.get(instName);
    if (!walletAddress) {
      console.log(`  ⚠️  No admin found for institution "${degree.institutionName}" (degree _id=${degree._id})`);
      skipped++;
      continue;
    }

    await Degree.updateOne(
      { _id: degree._id },
      { $set: { institutionId: walletAddress } }
    );
    updated++;
  }

  console.log(`\n✅ Migration complete: ${updated} updated, ${skipped} skipped.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
