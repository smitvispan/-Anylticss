import mongoose, { Schema, Document } from 'mongoose';

interface IGoogleUser extends Document {
  googleId: string;
  email: string;
  name: string;
  profilePic: string;
  adminId: mongoose.Schema.Types.ObjectId | null; // Added adminId field

  // OAuth data for the Google identity we use to fetch downstream products
  accessToken?: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: number;
  tokenType?: string;
}

const GoogleUserSchema = new Schema<IGoogleUser>({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  profilePic: { type: String, required: true },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // Reference to Admin model
    default: null
  },
  accessToken: { type: String, default: null },
  refreshToken: { type: String, default: null },
  scope: { type: String, default: null },
  expiresAt: { type: Number, default: null },
  tokenType: { type: String, default: null },
}, {
  timestamps: true,
});

const GoogleUser = mongoose.models.GoogleUser || mongoose.model<IGoogleUser>('GoogleUser', GoogleUserSchema);
export default GoogleUser;
