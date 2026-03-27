import mongoose from 'mongoose';
import dns from 'dns';

// Set DNS servers and preference to bypass local resolution issues with mongodb+srv
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  console.warn('⚠️ Failed to set custom DNS settings:', e);
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('❌ Missing MONGODB_URI in environment variables');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare global cache to survive hot-reloads in Next.js dev
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('🔌 Initializing MongoDB connection...');
    
    // Standard Mongoose connection options for reliability on Windows/Atlas
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000, 
      family: 4, // Force IPv4 to match dns.setDefaultResultOrder
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection failed:');
        console.error('   Error Message:', error.message);
        console.error('   Code:', error.code || 'N/A');
        console.error('   Syscall:', error.syscall || 'N/A');
        
        cached.promise = null; // Important to allow retry on next request
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('⚠️ Failed to await MongoDB connection promise:', error);
    cached.promise = null;
    throw error;
  }
}

export default connectDB;
