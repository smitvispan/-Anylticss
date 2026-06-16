import mongoose, { Document, Schema } from "mongoose";

export interface IFacebookUser extends Document {
  facebookId: string;
  adminId: string;
  email: string | null;
  name: string | null;
  accessToken: string;
  tokenType: string | null;
  expiresAt: Date | null;
  state?: string | null;
}

const FacebookUserSchema = new Schema<IFacebookUser>(
  {
    facebookId: { type: String, required: true, unique: true },
    adminId: { type: String, required: true },
    email: { type: String, default: null },
    name: { type: String, default: null },
    accessToken: { type: String, required: true },
    tokenType: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    state: { type: String, default: null },
  },
  { timestamps: true }
);

// Force recompile to pick up schema changes in dev/hot-reload
if (mongoose.models.FacebookUser) {
  delete mongoose.models.FacebookUser;
}
const FacebookUser = mongoose.model<IFacebookUser>("FacebookUser", FacebookUserSchema);

export default FacebookUser;
