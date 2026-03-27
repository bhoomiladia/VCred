import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function checkDomains() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI in .env');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  // Using direct collection instead of model to avoid issues with schema registration
  const db = mongoose.connection.db;
  if (!db) {
    console.error('No DB connection');
    process.exit(1);
  }
  const users = await db.collection('users').find({ role: 'institution' }).toArray();
  
  console.log(`Found ${users.length} institutions.`);
  users.forEach(u => {
    console.log(`- Name: "${u.name}", Domain: "${u.officialEmailDomain}"`);
  });
  
  process.exit(0);
}

checkDomains().catch(console.error);
