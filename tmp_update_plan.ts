import mongoose from "mongoose";
import dotenv from "dotenv";
import Plan from "./models/Plan";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("Connected to DB");

        const result = await Plan.updateMany(
            { name: /Basic/i },
            { $set: { maxUsers: 1 } }
        );

        console.log(`Updated ${result.modifiedCount} plans.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
