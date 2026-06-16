import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local BEFORE importing anything else that might check for env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import Plan from '../models/Plan';
import { PLAN_CATALOG } from '../lib/plan-catalog';

async function seedPlans() {
    await connectDB();
    console.log('Connected to DB...');

    for (const planData of PLAN_CATALOG) {
        await Plan.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(planData._id) },
            {
                ...planData,
                _id: new mongoose.Types.ObjectId(planData._id),
            },
            { upsert: true, new: true }
        );
        console.log(`Seeded plan: ${planData.name}`);
    }

    console.log('Seeding complete.');
    process.exit(0);
}

seedPlans().catch(err => {
    console.error(err);
    process.exit(1);
});
