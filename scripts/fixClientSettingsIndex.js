const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ERP';

async function fixIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('clientsettings');
    
    // Step 1: Delete all existing documents
    const deleteResult = await collection.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} old documents`);

    // Step 2: Drop all indexes except _id
    try {
      const indexes = await collection.getIndexes();
      for (const indexName in indexes) {
        if (indexName !== '_id_') {
          await collection.dropIndex(indexName);
          console.log(`✓ Dropped index: ${indexName}`);
        }
      }
    } catch (err) {
      console.log('No indexes to drop');
    }

    // Step 3: Create new compound unique index
    await collection.createIndex(
      { client: 1, branchId: 1 },
      { unique: true }
    );
    console.log('✓ Created new compound unique index on client + branchId');

    console.log('\n✓✓✓ Index migration completed successfully! ✓✓✓');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixIndex();
