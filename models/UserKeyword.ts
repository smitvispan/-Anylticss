import mongoose, { Document, Schema } from "mongoose";

export interface IUserKeyword extends Document {
  userId: string;
  scopeKey: string;
  siteUrl?: string | null;
  gscSiteId?: string | null;
  keyword: string;
  keywordNormalized: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserKeywordSchema = new Schema<IUserKeyword>(
  {
    userId: { type: String, required: true, index: true },
    scopeKey: { type: String, required: true, index: true },
    siteUrl: { type: String, default: null },
    gscSiteId: { type: String, default: null },
    keyword: { type: String, required: true },
    keywordNormalized: { type: String, required: true },
  },
  { timestamps: true }
);

UserKeywordSchema.index(
  { userId: 1, scopeKey: 1, keywordNormalized: 1 },
  { unique: true, name: "unique_user_keyword_per_scope" }
);

const UserKeyword =
  mongoose.models.UserKeyword ||
  mongoose.model<IUserKeyword>("UserKeyword", UserKeywordSchema);

export default UserKeyword;
