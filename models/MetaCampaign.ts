import mongoose, { Document, Schema } from "mongoose";

export interface IMetaCampaign extends Document {
  adAccountId: mongoose.Types.ObjectId;
  fbCampaignId: string;
  name: string | null;
  status?: string | null;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const metaCampaignSchema = new Schema<IMetaCampaign>(
  {
    adAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "AdAccount", required: true },
    fbCampaignId: { type: String, required: true },
    name: { type: String },
    status: { type: String },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

metaCampaignSchema.index({ adAccountId: 1, fbCampaignId: 1 }, { unique: true });

const MetaCampaign =
  mongoose.models.MetaCampaign || mongoose.model<IMetaCampaign>("MetaCampaign", metaCampaignSchema);

export default MetaCampaign;
