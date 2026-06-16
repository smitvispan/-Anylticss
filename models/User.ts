import mongoose, { Document, Schema } from 'mongoose';

// Define an interface that describes the properties of the User document
interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: Date | null;
  password: string;
  image: string | null;
  isAdmin: boolean;
  accounts: mongoose.Types.ObjectId[];
  sessions: mongoose.Types.ObjectId[];
  pages: mongoose.Types.ObjectId[];
  adAccounts: mongoose.Types.ObjectId[];
  instagramAccounts: mongoose.Types.ObjectId[];
  mainPage: mongoose.Types.ObjectId | null;
  mainInstagram: mongoose.Types.ObjectId | null;
  mainAd: mongoose.Types.ObjectId | null;
  mainGoogleAd: mongoose.Types.ObjectId | null;
  mainSEOsites: mongoose.Types.ObjectId | null;
  googleSearchConsoleAccounts: mongoose.Types.ObjectId[];
  googleAdsAccounts: mongoose.Types.ObjectId[];
  campaigns: mongoose.Types.ObjectId[];
  seoReports: mongoose.Types.ObjectId[];
  client_id: string | null;
  contact_id: string | null;
  ERP_token: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the User model
const userSchema = new Schema<IUser>({
  name: { type: String },
  email: { type: String, unique: true },
  emailVerified: { type: Date, default: null },
  password: { type: String },
  image: { type: String, default: null },
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }],
  sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now, required: true },
  pages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Page' }],
  adAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdAccount' }],
  instagramAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstagramAccount' }],
  mainPage: { type: mongoose.Schema.Types.ObjectId, ref: 'Page' },
  mainInstagram: { type: mongoose.Schema.Types.ObjectId, ref: 'InstagramAccount' },
  mainAd: { type: mongoose.Schema.Types.ObjectId, ref: 'AdAccount' },
  mainGoogleAd: { type: mongoose.Schema.Types.ObjectId, ref: 'AdAccount' },
  mainSEOsites: { type: mongoose.Schema.Types.ObjectId, ref: 'GscSite' },
  isAdmin: { type: Boolean, default: false },
  googleSearchConsoleAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GoogleSearchConsoleAccount' }],
  googleAdsAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GoogleAdsAccount' }],
  campaigns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }],
  seoReports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SeoReport' }],
  client_id: { type: String, default: null },
  contact_id: { type: String, default: null },
  ERP_token: { type: String, default: null },
}, { timestamps: true });

// Export the model
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
