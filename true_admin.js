const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const admins = await db.collection("admins").find({}).toArray();
  console.log("Admins:", JSON.stringify(admins, null, 2));
  process.exit(0);
}
check();
