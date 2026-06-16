import mongoose, { Document, Schema } from "mongoose";

export interface IPendingSignup extends Document {
  agencyName: string;
  website: string | null;
  email: string;
  passwordHash: string;
  planId: mongoose.Types.ObjectId;
  orderId?: string | null;
  paymentId?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  status: "pending" | "completed" | "expired";
  createdAt: Date;
  updatedAt: Date;
}

const pendingSignupSchema = new Schema<IPendingSignup>(
  {
    agencyName: { type: String, required: true },
    website: { type: String, default: null },
    email: { type: String, required: true, index: true },
    passwordHash: { type: String, required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    orderId: { type: String, default: null },
    paymentId: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["pending", "completed", "expired"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

const PendingSignup =
  (mongoose.models.PendingSignup as mongoose.Model<IPendingSignup> | undefined) ||
  mongoose.model<IPendingSignup>("PendingSignup", pendingSignupSchema);

export default PendingSignup;
