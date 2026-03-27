import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDegree extends Document {
  name: string;
  rollNumber: string;
  degreeTitle: string;
  branch: string;
  cgpa: number;
  email: string;
  batchId: string;
  credentialHash?: string;   // keccak256 leaf, empty if pending
  merkleProof?: string[];    // path from leaf to batch Merkle root
  merkleRoot?: string;       // Master batch root
  issuedAt: Date;
  revoked?: boolean;
  walletAddress?: string;
  status: "PENDING" | "MINTED";
  isPublished?: boolean;
  blockchainTxHash?: string;
  institutionName?: string;
  templateId?: string;
  ipfsCid?: string;
  layoutConfig?: any;
  institutionId?: string;
  isClaimed?: boolean;
  mintTxHash?: string;
}

const DegreeSchema = new Schema<IDegree>(
  {
    name:           { type: String, required: true },
    rollNumber:     { type: String, required: true },
    degreeTitle:    { type: String, required: true },
    branch:         { type: String, required: true },
    cgpa:           { type: Number, required: true },
    email:          { type: String, required: true },
    batchId:        { type: String, required: true },
    credentialHash: { type: String, required: false },
    merkleProof:    { type: [String], required: false },
    merkleRoot:     { type: String, required: false },
    issuedAt:       { type: Date, default: Date.now },
    revoked:        { type: Boolean, default: false },
    walletAddress:  { type: String, required: false },
    status:         { type: String, default: "PENDING" },
    isPublished:    { type: Boolean, default: false },
    blockchainTxHash: { type: String, required: false },
    institutionName: { type: String, required: false },
    templateId:     { type: String, required: false },
    ipfsCid:        { type: String, required: false },
    layoutConfig:   { type: Schema.Types.Mixed, required: false },
    institutionId:  { type: String, required: false, index: true },
    isClaimed:      { type: Boolean, default: false },
    mintTxHash:     { type: String, required: false },
  },
  {
    collection: 'degrees',
    timestamps: true,
  }
);

// Compound unique index: Roll Number + Batch ID
DegreeSchema.index({ rollNumber: 1, batchId: 1 }, { unique: true });

// Avoid model re-compilation in Next.js dev hot-reloads
const Degree: Model<IDegree> =
  (mongoose.models.Degree as Model<IDegree>) ||
  mongoose.model<IDegree>('Degree', DegreeSchema);

export default Degree;
