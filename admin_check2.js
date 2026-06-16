const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const admin = await db.collection("users").findOne({ role: "admin" });
  console.log("ADMIN 2 EMAIL: ", admin?.email);
  process.exit(0);
}
check();
