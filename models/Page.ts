import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the Page document
interface IPage extends Document {
  userId: mongoose.Types.ObjectId;
  pageId: string;
  link: string;
  name: string;
  accessToken: string;
  category: string;
  about: string;
  page_token: string;
  picture: string;
  category_list: Record<string, any>; // You can replace `any` with a more specific type if needed
  otherFields: Record<string, any>; // Same as above
  insights: mongoose.Types.ObjectId;
  posts: mongoose.Types.ObjectId[];
}

// Define the schema for the Page model
const pageSchema = new Schema<IPage>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pageId: { type: String },
  link: { type: String },
  name: { type: String },
  accessToken: { type: String },
  category: { type: String },
  about: { type: String },
  page_token: { type: String },
  picture: { type: String },
  category_list: { type: Object },
  otherFields: { type: Object },
  insights: { type: mongoose.Schema.Types.ObjectId, ref: 'PageInsights' },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PagePost' }],
}, { timestamps: true });

// Create the Page model
const Page = mongoose.models.Page || mongoose.model<IPage>('Page', pageSchema);

export default Page;
