import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOtpAuth extends Document {
  email: string;
  otp: string;
  createdAt: Date;
}

const OtpAuthSchema = new Schema<IOtpAuth>(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }, // 5 min TTL
  },
  {
    collection: 'otpauth',
  }
);

const OtpAuth: Model<IOtpAuth> =
  (mongoose.models.OtpAuth as Model<IOtpAuth>) ||
  mongoose.model<IOtpAuth>('OtpAuth', OtpAuthSchema);

export default OtpAuth;
