const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect directly with MongoClient for more control
async function cleanCollection() {
  console.log('Starting cleanup process...');
  
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('jewelry-management');
    
    // 1. Get all products
    const products = await db.collection('products').find({}).toArray();
    console.log(`Retrieved ${products.length} products`);
    
    // 2. Create a backup collection
    try {
      await db.collection('products_backup_final').drop();
    } catch (err) {
      console.log('No backup collection to drop');
    }
    
    await db.collection('products_backup_final').insertMany(products);
    console.log('Created backup in products_backup_final collection');
    
    // 3. Drop the products collection
    await db.collection('products').drop();
    console.log('Dropped products collection');
    
    // 4. Create a new products collection
    await db.createCollection('products');
    console.log('Created new products collection');
    
    // 5. Process each product - completely remove huidNumber if null
    const cleanedProducts = [];
    for (const product of products) {
      const cleanProduct = {...product};
      // Completely remove the field if it's null or empty
      if (cleanProduct.huidNumber === null || cleanProduct.huidNumber === '') {
        delete cleanProduct.huidNumber;
      }
      cleanedProducts.push(cleanProduct);
    }
    
    // 6. Insert processed products
    if (cleanedProducts.length > 0) {
      await db.collection('products').insertMany(cleanedProducts);
    }
    console.log(`Inserted ${cleanedProducts.length} cleaned products`);
    
    // 7. Create a proper sparse unique index
    await db.collection('products').createIndex(
      { huidNumber: 1 },
      { unique: true, sparse: true, background: true }
    );
    console.log('Created new sparse unique index');
    
    // 8. Final verification
    const withHuid = await db.collection('products').countDocuments({ huidNumber: { $exists: true } });
    const withoutHuid = await db.collection('products').countDocuments({ huidNumber: { $exists: false } });
    const total = await db.collection('products').countDocuments();
    
    console.log(`
Final count:
- Products with HUID field: ${withHuid}
- Products without HUID field: ${withoutHuid}
- Total products: ${total}
    `);
    
    // 9. Check if there are any null HUIDs (should be 0)
    const nullHuids = await db.collection('products').countDocuments({ huidNumber: null });
    console.log(`Products with null HUID value (should be 0): ${nullHuids}`);
    
    console.log('Cleanup completed successfully!');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

cleanCollection().catch(console.error); 