import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the InstagramPost document
interface IInstagramPost extends Document {
  instagramAccountId: mongoose.Types.ObjectId;
  metric: Record<string, any>; // You can replace `any` with a more specific type if needed
  history: Record<string, any>;
  postid: string;
  created_time: string;
  full_picture: string;
  permalink_url: string;
  createdAt: Date;
}

// Define the schema for the InstagramPost model
const instagramPostSchema = new Schema<IInstagramPost>({
  instagramAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstagramAccount' },
  metric: { type: Object },
  history: { type: Object },
  postid: { type: String },
  created_time: { type: String },
  full_picture: { type: String },
  permalink_url: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Create the InstagramPost model
const InstagramPost = mongoose.models.InstagramPost || mongoose.model<IInstagramPost>('InstagramPost', instagramPostSchema);

export default InstagramPost;
