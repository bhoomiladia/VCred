import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import Degree from '../models/Degree';

// Ensure we load .env from the root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

async function resetDegrees() {
  console.log('🔄 Connecting to MongoDB...');
  
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB.');

    // Count before deleting
    const count = await Degree.countDocuments();
    console.log(`📊 Found ${count} existing degree records.`);

    if (count > 0) {
      console.log('🗑️  Deleting all degree records to prepare for new CSV uploads...');
      const result = await Degree.deleteMany({});
      console.log(`✨ Successfully deleted ${result.deletedCount} records.`);
    } else {
      console.log('✨ Collection is already empty. Nothing to do.');
    }

  } catch (error) {
    console.error('❌ Error during database reset:', error);
  } finally {
    console.log('🔌 Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('👋 Done.');
    process.exit(0);
  }
}

resetDegrees();
