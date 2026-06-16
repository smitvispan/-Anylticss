import mongoose, { Document, Schema } from "mongoose";

export interface IMetaAdset extends Document {
  adAccountId: mongoose.Types.ObjectId;
  fbCampaignId: string;
  fbCampaignName?: string | null;
  fbAdsetId: string;
  fbAdsetName?: string | null;
  since: string;
  until: string;
  metrics: Record<string, any>;
  adAccountMongoId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const metaAdsetSchema = new Schema<IMetaAdset>(
  {
    adAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "AdAccount", required: true },
    fbCampaignId: { type: String, required: true },
    fbCampaignName: { type: String },
    fbAdsetId: { type: String, required: true },
    fbAdsetName: { type: String },
    since: { type: String, required: true },
    until: { type: String, required: true },
    metrics: { type: Object, required: true },
    adAccountMongoId: { type: String },
  },
  { timestamps: true }
);

metaAdsetSchema.index({ fbAdsetId: 1, since: 1, until: 1 }, { unique: true });
metaAdsetSchema.index({ adAccountId: 1, fbCampaignId: 1 });

const MetaAdset = mongoose.models.MetaAdset || mongoose.model<IMetaAdset>("MetaAdset", metaAdsetSchema);

export default MetaAdset;
