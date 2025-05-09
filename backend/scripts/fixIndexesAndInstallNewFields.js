const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

async function fixDatabaseSchema() {
  console.log('Starting database schema update...');
  
  let client;
  try {
    // Connect directly with MongoClient for more control
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('jewelry-management');
    
    // 1. Fix indexes - Drop and recreate indexes correctly
    console.log('Fixing indexes...');
    
    try {
      // Drop any existing HUID index
      await db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped existing huidNumber index');
    } catch (err) {
      console.log('No existing index to drop or error:', err.message);
    }
    
    // Create a new proper sparse index
    await db.collection('products').createIndex(
      { huidNumber: 1 },
      { unique: true, sparse: true, background: true }
    );
    console.log('Created new sparse unique index for huidNumber');
    
    // 2. Update all products to have the new stone fields
    console.log('Updating products with new stone fields...');
    
    const updateResult = await db.collection('products').updateMany(
      { hasStone: { $exists: false } },
      { 
        $set: { 
          hasStone: false,
          stoneDetails: '',
          stonePrice: 0
        } 
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} products with new stone fields`);
    
    // 3. Fix any null HUID values
    const nullHuidResult = await db.collection('products').updateMany(
      { huidNumber: null },
      { $unset: { huidNumber: "" } }
    );
    
    console.log(`Fixed ${nullHuidResult.modifiedCount} products with null HUID values`);
    
    // 4. Verify the fix
    const indexes = await db.collection('products').indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    const totalProducts = await db.collection('products').countDocuments();
    const productsWithHuid = await db.collection('products').countDocuments({ huidNumber: { $exists: true } });
    const productsWithoutHuid = await db.collection('products').countDocuments({ huidNumber: { $exists: false } });
    const productsWithStoneField = await db.collection('products').countDocuments({ hasStone: { $exists: true } });
    
    console.log(`
Verification results:
- Total products: ${totalProducts}
- Products with HUID field: ${productsWithHuid}
- Products without HUID field: ${productsWithoutHuid}
- Products with stone fields: ${productsWithStoneField}
    `);
    
    console.log('Database schema update completed successfully!');
  } catch (err) {
    console.error('Error during schema update:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

fixDatabaseSchema().catch(console.error); 