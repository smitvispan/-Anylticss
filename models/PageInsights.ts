import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the PageInsights document
interface IPageInsights extends Document {
  pageId: mongoose.Types.ObjectId;
  metric: Record<string, any>; // You can change this to a more specific type if needed
  history: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the PageInsights model
const pageInsightsSchema = new Schema<IPageInsights>({
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', unique: true },
  metric: { type: Object },
  history: { type: Object },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create the PageInsights model
const PageInsights = mongoose.models.PageInsights || mongoose.model<IPageInsights>('PageInsights', pageInsightsSchema);

export default PageInsights;
