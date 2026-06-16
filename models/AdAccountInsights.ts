import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the AdAccountInsights document
interface IAdAccountInsights extends Document {
  adAccountId: mongoose.Types.ObjectId;
  name: string;
  fbEntityId: string;
  adsetname: string;
  adsetid: string;
  metric: Record<string, any>; // You can replace `any` with a more specific type if needed
  history: Record<string, any>;
  createdAt: Date;
}

// Define the schema for the AdAccountInsights model
const adAccountInsightsSchema = new Schema<IAdAccountInsights>({
  adAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdAccount' },
  name: { type: String },
  fbEntityId: { type: String },
  adsetname: { type: String },
  adsetid: { type: String },
  metric: { type: Object },
  history: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

// Create the AdAccountInsights model
const AdAccountInsights = mongoose.models.AdAccountInsights || mongoose.model<IAdAccountInsights>('AdAccountInsights', adAccountInsightsSchema);

export default AdAccountInsights;
