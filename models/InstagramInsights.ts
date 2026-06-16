import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the InstagramInsights document
interface IInstagramInsights extends Document {
  instagramAccountId: mongoose.Types.ObjectId;
  metric: Record<string, any>; // You can replace `any` with a more specific type if needed
  history: Record<string, any>;
  createdAt: Date;
}

// Define the schema for the InstagramInsights model
const instagramInsightsSchema = new Schema<IInstagramInsights>({
  instagramAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstagramAccount' },
  metric: { type: Object },
  history: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

// Create the InstagramInsights model
const InstagramInsights = mongoose.models.InstagramInsights || mongoose.model<IInstagramInsights>('InstagramInsights', instagramInsightsSchema);

export default InstagramInsights;
