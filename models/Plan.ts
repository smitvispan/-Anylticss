import mongoose, { Document, Schema } from 'mongoose';

export interface IPlan extends Document {
    name: string;
    price: number;
    description: string;
    maxUsers: number;
    maxFacebookPages: number;
    maxInstagramAccounts: number;
    maxAdAccounts: number;
    maxGoogleAdsAccounts: number;
    maxSeoReports: number;
    canResell: boolean;
    maxSubClients: number;
    validityMonths: number;
    createdAt: Date;
    updatedAt: Date;
}

const planSchema = new Schema<IPlan>({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    maxUsers: { type: Number, default: 0 },
    maxFacebookPages: { type: Number, default: 0 },
    maxInstagramAccounts: { type: Number, default: 0 },
    maxAdAccounts: { type: Number, default: 0 },
    maxGoogleAdsAccounts: { type: Number, default: 0 },
    maxSeoReports: { type: Number, default: 0 },
    canResell: { type: Boolean, default: false },
    maxSubClients: { type: Number, default: 0 },
    validityMonths: { type: Number, default: 12 },
}, { timestamps: true });

const Plan = mongoose.models.Plan || mongoose.model<IPlan>('Plan', planSchema);

export default Plan;
