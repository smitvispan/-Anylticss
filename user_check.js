const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const users = await db.collection("users").find({ role: "user" }).sort({_id: -1}).limit(5).toArray();
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}
check();
