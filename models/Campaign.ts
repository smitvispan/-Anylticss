import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the Campaign document
interface ICampaign extends Document {
  campaignId: string;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  campaignBudgetAmountMicros: string;
  metrics: Record<string, any>; // You can replace `any` with a more specific type if needed
  biddingStrategyType: string;
  customerId: string;
  subAccountId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the Campaign model
const campaignSchema = new Schema<ICampaign>({
  campaignId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String },
  name: { type: String },
  status: { type: String },
  advertisingChannelType: { type: String },
  campaignBudgetAmountMicros: { type: String },
  metrics: { type: Object },
  biddingStrategyType: { type: String },
  customerId: { type: String },
  subAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubAccount' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Create the Campaign model
const Campaign = mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', campaignSchema);

export default Campaign;
