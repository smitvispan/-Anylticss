import mongoose, { Document, Schema } from "mongoose";

export interface IGoogleAdsInsight extends Document {
  googleAdsAccountId: mongoose.Types.ObjectId;
  campaignId?: string;
  customerId?: string;
  name?: string;
  dateRange?: {
    since?: string;
    until?: string;
  };
  metric: Record<string, any>;
  history: Array<{
    metric: Record<string, any>;
    archivedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleAdsInsightSchema = new Schema<IGoogleAdsInsight>(
  {
    googleAdsAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "GoogleAdsAccount" },
    campaignId: { type: String },
    customerId: { type: String },
    name: { type: String },
    dateRange: {
      since: { type: String },
      until: { type: String },
    },
    metric: { type: Schema.Types.Mixed, default: {} },
    history: {
      type: [
        {
          metric: { type: Schema.Types.Mixed, default: {} },
          archivedAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

GoogleAdsInsightSchema.index(
  {
    googleAdsAccountId: 1,
    campaignId: 1,
    "dateRange.since": 1,
    "dateRange.until": 1,
  },
  { unique: false }
);

const GoogleAdsInsight =
  mongoose.models.GoogleAdsInsight ||
  mongoose.model<IGoogleAdsInsight>("GoogleAdsInsight", GoogleAdsInsightSchema);

export default GoogleAdsInsight;
