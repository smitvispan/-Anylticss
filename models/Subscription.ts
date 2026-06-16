import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    status: 'active' | 'expired' | 'pending' | 'canceled';
    startDate: Date;
    endDate: Date;
    paymentId?: string;
    orderId?: string;
    amountPaid?: number;
    planPrice?: number;
    creditApplied?: number;
    previousSubscriptionId?: mongoose.Types.ObjectId;
    previousPlanId?: mongoose.Types.ObjectId;
    recordSource?: string;
    canceledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: {
        type: String,
        enum: ['active', 'expired', 'pending', 'canceled'],
        default: 'pending'
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    paymentId: { type: String },
    orderId: { type: String },
    amountPaid: { type: Number, default: 0 },
    planPrice: { type: Number, default: 0 },
    creditApplied: { type: Number, default: 0 },
    previousSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    previousPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    recordSource: { type: String, default: null },
    canceledAt: { type: Date },
}, { timestamps: true });

const existingSubscriptionModel = mongoose.models.Subscription as mongoose.Model<ISubscription> | undefined;
const modelRegistry = mongoose.models as Record<string, mongoose.Model<any> | undefined>;
const connectionModelRegistry = mongoose.connection.models as Record<string, mongoose.Model<any> | undefined>;

if (existingSubscriptionModel && !existingSubscriptionModel.schema.path("previousPlanId")) {
    delete modelRegistry.Subscription;
    delete connectionModelRegistry.Subscription;
}

const Subscription =
    (mongoose.models.Subscription as mongoose.Model<ISubscription> | undefined) ||
    mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export default Subscription;
