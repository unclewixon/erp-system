import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Total collections:', collections.length);

  // Find and drop empty collections
  let dropped = 0;
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    if (count === 0 && !col.name.startsWith('system')) {
      console.log('Dropping empty collection:', col.name);
      await db.dropCollection(col.name);
      dropped++;
    }
  }

  console.log('Dropped', dropped, 'empty collections');

  const remainingCollections = await db.listCollections().toArray();
  console.log('Remaining collections:', remainingCollections.length);

  await mongoose.disconnect();
}

cleanup().catch(console.error);
