const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI not found in .env.local");

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const plans = db.collection('plans');

        const result = await plans.updateMany(
            { name: /Basic/i },
            { $set: { maxUsers: 1 } }
        );

        console.log(`Updated ${result.modifiedCount} plans.`);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
