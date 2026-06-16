import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the AdAccount document
interface IAdAccount extends Document {
  userId: mongoose.Types.ObjectId;
  adAccountId: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the AdAccount model
const adAccountSchema = new Schema<IAdAccount>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adAccountId: { type: String },
  name: { type: String },
  account_status: { type: Number },
  currency: { type: String },
  timezone_name: { type: String },
  accessToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Create an index on the userId field for faster queries
adAccountSchema.index({ userId: 1 });

// Create the AdAccount model
const AdAccount = mongoose.models.AdAccount || mongoose.model<IAdAccount>('AdAccount', adAccountSchema);

export default AdAccount;
