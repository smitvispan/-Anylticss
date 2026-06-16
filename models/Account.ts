import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the Account document
interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  provider: string;
  providerAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
  tokenType: string;
  scope: string;
  idToken: string;
  sessionState: string;
}

// Define the schema for the Account model
const accountSchema = new Schema<IAccount>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String },
  provider: { type: String },
  providerAccountId: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  expiresAt: { type: Date, default: null },
  tokenType: { type: String },
  scope: { type: String },
  idToken: { type: String },
  sessionState: { type: String },
}, { timestamps: true });

// Create an index on the userId field for faster queries
accountSchema.index({ userId: 1 });

// Create the Account model
const Account = mongoose.models.Account || mongoose.model<IAccount>('Account', accountSchema);

export default Account;
