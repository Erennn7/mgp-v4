const { MongoClient } = require('mongodb');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

async function fixNullHuids() {
  console.log('Starting final HUID null value fix...');
  
  let client;
  try {
    // Connect directly with MongoClient for more control
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('jewelry-management');
    
    // 1. Get count of products with null HUID
    const nullCount = await db.collection('products').countDocuments({ 
      huidNumber: null 
    });
    console.log(`Found ${nullCount} products with null HUID value`);
    
    // 2. Find and unset huidNumber on products with null value
    const result = await db.collection('products').updateMany(
      { huidNumber: null },
      { $unset: { huidNumber: "" } }
    );
    console.log(`Removed huidNumber field from ${result.modifiedCount} products`);
    
    // 3. Drop and recreate the index to make sure it's properly sparse
    try {
      await db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped huidNumber index');
    } catch (err) {
      console.log('No index to drop or error:', err.message);
    }
    
    await db.collection('products').createIndex(
      { huidNumber: 1 },
      { 
        unique: true, 
        sparse: true, 
        background: true,
        name: 'huidNumber_1'
      }
    );
    console.log('Created new proper sparse unique index');
    
    // 4. Final verification
    const newNullCount = await db.collection('products').countDocuments({ 
      huidNumber: null 
    });
    const fieldExistsCount = await db.collection('products').countDocuments({ 
      huidNumber: { $exists: true } 
    });
    const totalCount = await db.collection('products').countDocuments();
    
    console.log(`
Final verification:
- Total products: ${totalCount}
- Products with huidNumber field: ${fieldExistsCount}
- Products with null huidNumber value (should be 0): ${newNullCount}
    `);
    
    console.log('Fix completed successfully!');
  } catch (err) {
    console.error('Error during fix:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

fixNullHuids().catch(console.error); 