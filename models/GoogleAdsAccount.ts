import mongoose, { Schema, Document } from "mongoose";

export interface IGoogleAdsAccount extends Document {
  accountId: string;
  descriptiveName?: string;
  manager: boolean;
  level?: string;
  timeZone?: string;
  resourceName?: string;
  customerId?: string;

  adminId?: string;
  googleUserId?: string;

  userEmail?: string;
  isActive: boolean;
  lastSynced?: Date;

  // OAuth fields
  accessToken?: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: number;
  tokenType?: string;

  createdAt: Date;
  updatedAt: Date;
}

const GoogleAdsAccountSchema = new Schema<IGoogleAdsAccount>(
  {
    accountId: { type: String, required: true },

    descriptiveName: { type: String, default: null },
    manager: { type: Boolean, default: false },
    level: { type: String, default: null },
    timeZone: { type: String, default: null },
    resourceName: { type: String, default: null },
    customerId: { type: String, default: null },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    googleUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoogleUser",
      default: null,
    },

    userEmail: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastSynced: { type: Date, default: null },

    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    scope: { type: String, default: null },
    expiresAt: { type: Number, default: null },
    tokenType: { type: String, default: null },
  },
  { timestamps: true }
);

// Same unique indexes as before
GoogleAdsAccountSchema.index({ accountId: 1, customerId: 1 }, { unique: true });

const GoogleAdsAccount =
  mongoose.models.GoogleAdsAccount ||
  mongoose.model<IGoogleAdsAccount>(
    "GoogleAdsAccount",
    GoogleAdsAccountSchema
  );

export default GoogleAdsAccount;
