import mongoose, { Schema, Document } from "mongoose";

export interface IGoogleSearchConsoleAccount extends Document {
  siteUrl: string;
  permissionLevel: string;

  adminId?: string;
  googleUserId?: string;

  userEmail?: string;
  isActive: boolean;
  lastSynced?: Date;

  // OAuth tokens
  accessToken?: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: number;
  tokenType?: string;

  createdAt: Date;
  updatedAt: Date;
}

const GoogleSearchConsoleAccountSchema =
  new Schema<IGoogleSearchConsoleAccount>(
    {
      siteUrl: { type: String, required: true },
      permissionLevel: { type: String, required: true },

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

// Unique index corrected for adminId
GoogleSearchConsoleAccountSchema.index(
  { siteUrl: 1, adminId: 1 },
  { unique: true }
);

const GoogleSearchConsoleAccount =
  mongoose.models.GoogleSearchConsoleAccount ||
  mongoose.model<IGoogleSearchConsoleAccount>(
    "GoogleSearchConsoleAccount",
    GoogleSearchConsoleAccountSchema
  );

export default GoogleSearchConsoleAccount;
