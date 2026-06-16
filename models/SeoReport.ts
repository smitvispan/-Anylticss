import mongoose, { Schema, Document } from "mongoose";

export interface ISeoReport extends Document {
  userId: mongoose.Types.ObjectId;
  siteUrl: string;
  query: string;
  page: string;
  country: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SeoReportSchema = new Schema<ISeoReport>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    siteUrl: { type: String, required: true },
    query: { type: String, default: "" },
    page: { type: String, default: "" },
    country: { type: String, default: "all" },
    device: { type: String, default: "all" },
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

SeoReportSchema.index(
  { userId: 1, siteUrl: 1, query: 1, page: 1, date: 1, country: 1, device: 1 },
  { unique: true, name: "unique_seo_report" }
);

const SeoReport = mongoose.models.SeoReport || mongoose.model<ISeoReport>("SeoReport", SeoReportSchema);

export default SeoReport;
