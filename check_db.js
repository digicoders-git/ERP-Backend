require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (let collection of collections) {
    const count = await mongoose.connection.db.collection(collection.name).countDocuments();
    if (collection.name.toLowerCase().includes('staff') || count > 0) {
      console.log(`Collection: ${collection.name}, Count: ${count}`);
    }
  }

  process.exit();
}

check().catch(console.error);
