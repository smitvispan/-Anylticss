import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Plan from '../models/Plan';
import Subscription from '../models/Subscription';

async function assignDefaultPlans() {
    await connectDB();
    console.log('Connected to DB...');

    const basicPlan = await Plan.findOne({ name: 'Basic' });
    if (!basicPlan) {
        console.error('Basic plan not found. Please run seed-plans.ts first.');
        process.exit(1);
    }

    const usersWithoutSubscription = await User.find({
        isAdmin: false,
        activeSubscription: null
    });

    console.log(`Found ${usersWithoutSubscription.length} users without a subscription.`);

    for (const user of usersWithoutSubscription) {
        const subscription = await Subscription.create({
            userId: user._id,
            planId: basicPlan._id,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        await User.findByIdAndUpdate(user._id, { activeSubscription: subscription._id });
        console.log(`Assigned Basic plan to: ${user.email}`);
    }

    console.log('Assignment complete.');
    process.exit(0);
}

assignDefaultPlans().catch(err => {
    console.error(err);
    process.exit(1);
});
