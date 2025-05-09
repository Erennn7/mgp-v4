const mongoose = require('mongoose');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    reconstructCollection();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function reconstructCollection() {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('Starting products collection reconstruction...');
    
    // 1. Drop existing index
    try {
      await mongoose.connection.db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped huidNumber index');
    } catch (err) {
      console.log('No index to drop or error:', err.message);
    }
    
    // 2. Get all current products
    const products = await mongoose.connection.db.collection('products').find({}).toArray();
    console.log(`Retrieved ${products.length} products`);
    
    if (products.length === 0) {
      console.log('No products to process, exiting');
      return;
    }
    
    // 3. Create a backup collection
    await mongoose.connection.db.collection('products_backup').drop().catch(() => console.log('No backup collection to drop'));
    await mongoose.connection.db.createCollection('products_backup');
    await mongoose.connection.db.collection('products_backup').insertMany(products);
    console.log('Created backup of products in products_backup collection');
    
    // 4. Drop the products collection
    await mongoose.connection.db.collection('products').drop();
    console.log('Dropped products collection');
    
    // 5. Create a new products collection
    await mongoose.connection.db.createCollection('products');
    console.log('Created new products collection');
    
    // 6. Insert the products with fixed HUID values
    const cleanProducts = products.map(product => {
      const newProduct = {...product};
      if (newProduct.huidNumber === null || newProduct.huidNumber === '') {
        delete newProduct.huidNumber;
      }
      return newProduct;
    });
    
    await mongoose.connection.db.collection('products').insertMany(cleanProducts);
    console.log('Inserted fixed products into new collection');
    
    // 7. Create a new sparse index
    await mongoose.connection.db.collection('products').createIndex(
      { huidNumber: 1 },
      { 
        unique: true, 
        sparse: true,
        background: true 
      }
    );
    console.log('Created new sparse index for huidNumber');
    
    // 8. Verify the fix
    const productCount = await mongoose.connection.db.collection('products').countDocuments();
    const nullCount = await mongoose.connection.db.collection('products').countDocuments({ huidNumber: null });
    const undefinedCount = await mongoose.connection.db.collection('products').countDocuments({ huidNumber: { $exists: false } });
    
    console.log(`
Verification results:
- Total products: ${productCount}
- Products with null HUID: ${nullCount}
- Products with no HUID field: ${undefinedCount}
    `);
    
    await session.commitTransaction();
    console.log('Transaction committed');
    console.log('Products collection reconstruction completed successfully!');
  } catch (err) {
    await session.abortTransaction();
    console.error('Error during reconstruction:', err);
  } finally {
    session.endSession();
    mongoose.disconnect();
  }
} 