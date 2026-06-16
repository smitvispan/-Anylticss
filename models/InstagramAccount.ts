import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the InstagramAccount document
interface IInstagramAccount extends Document {
  igId: string;
  username: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  pageId: string;
  name: string;
  pageAccessToken: string;
  userId: mongoose.Types.ObjectId;
}

// Define the schema for the InstagramAccount model
const instagramAccountSchema = new Schema<IInstagramAccount>({
  igId: { type: String },
  username: { type: String },
  profile_picture_url: { type: String },
  followers_count: { type: Number },
  follows_count: { type: Number },
  media_count: { type: Number },
  pageId: { type: String },
  name: { type: String },
  pageAccessToken: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Create the InstagramAccount model
const InstagramAccount = mongoose.models.InstagramAccount || mongoose.model<IInstagramAccount>('InstagramAccount', instagramAccountSchema);

export default InstagramAccount;
