const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const users = await db.collection("users").find({}).project({ email: 1, role: 1, isAdmin: 1 }).toArray();
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}
check();
