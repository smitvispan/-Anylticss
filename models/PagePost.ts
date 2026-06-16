import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the PagePost document
interface IPagePost extends Document {
  pageId: mongoose.Types.ObjectId;
  metric: Record<string, any>; // This is a more type-safe version of `Object`
  history: Record<string, any>;
  postid: string;
  created_time: string;
  full_picture: string;
  permalink_url: string;
  createdAt: Date;
}

// Define the schema for the PagePost model
const pagePostSchema = new Schema<IPagePost>({
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', unique: true },
  metric: { type: Object },
  history: { type: Object },
  postid: { type: String },
  created_time: { type: String },
  full_picture: { type: String },
  permalink_url: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Create the PagePost model
const PagePost = mongoose.models.PagePost || mongoose.model<IPagePost>('PagePost', pagePostSchema);

export default PagePost;
