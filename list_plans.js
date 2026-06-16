const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const plans = await db.collection('plans').find({}).toArray();
        console.log(JSON.stringify(plans, null, 2));
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
