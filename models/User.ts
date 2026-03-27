import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  role?: 'student' | 'institution' | 'hq';
  subRole?: 'admin' | 'worker';
  isProfileComplete: boolean;
  name?: string;
  email?: string;
  rollNumber?: string;
  branch?: string;
  institutionName?: string;
  institutionId?: mongoose.Types.ObjectId;
  officialEmailDomain?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  workerStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  institutionLogo?: string;
  location?: string;
  website?: string;
  isGovtRegistered?: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true },
    role: { type: String, enum: ['student', 'institution', 'hq'] },
    subRole: { type: String, enum: ['admin', 'worker'] },
    isProfileComplete: { type: Boolean, default: false },
    name: { type: String },
    email: { type: String },
    rollNumber: { type: String },
    branch: { type: String },
  
  // Institution specific
  institutionName: { type: String, trim: true },
  institutionId: { type: Schema.Types.ObjectId, ref: 'User' },
  officialEmailDomain: { type: String, trim: true, lowercase: true },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING',
  },
  workerStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
  },
  
  // Student specific
    institutionLogo: { type: String },
    location: { type: String },
    website: { type: String },
    isGovtRegistered: { type: Boolean },
  },
  {
    collection: 'users',
    timestamps: true,
  }
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
