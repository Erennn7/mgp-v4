const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    fixHuidIssue();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function fixHuidIssue() {
  try {
    console.log('Starting final HUID fix...');
    
    // 1. First, drop the problematic index
    try {
      await mongoose.connection.db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped huidNumber index');
    } catch (err) {
      console.log('No index to drop or error:', err.message);
    }
    
    // 2. Get all products
    const allProducts = await mongoose.connection.db.collection('products').find({}).toArray();
    console.log(`Total products: ${allProducts.length}`);
    
    // 3. For each product, properly handle the HUID field
    const updatePromises = allProducts.map(async (product) => {
      if (product.huidNumber === null || product.huidNumber === '') {
        // For products with null/empty HUID, remove the field entirely
        return mongoose.connection.db.collection('products').updateOne(
          { _id: product._id },
          { $unset: { huidNumber: "" } }
        );
      } else if (product.huidNumber) {
        // For products with a valid HUID, keep it as is
        return Promise.resolve();
      }
    });
    
    await Promise.all(updatePromises);
    console.log('Updated all products with null/empty HUID');
    
    // 4. Create new sparse index
    await mongoose.connection.db.collection('products').createIndex(
      { huidNumber: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'huidNumber_1',
        background: true 
      }
    );
    console.log('Created new sparse unique index on huidNumber');
    
    // 5. Verify fix
    const nullCount = await mongoose.connection.db.collection('products').countDocuments({ huidNumber: null });
    const emptyCount = await mongoose.connection.db.collection('products').countDocuments({ huidNumber: "" });
    const fieldExistsCount = await mongoose.connection.db.collection('products').countDocuments({ huidNumber: { $exists: true } });
    const totalCount = await mongoose.connection.db.collection('products').countDocuments();
    
    console.log(`
Final verification:
- Products with null HUID: ${nullCount}
- Products with empty string HUID: ${emptyCount}
- Products with HUID field: ${fieldExistsCount}
- Total products: ${totalCount}
    `);
    
    // 6. Confirm index configuration
    const indexes = await mongoose.connection.db.collection('products').indexes();
    console.log('Current indexes:');
    console.log(JSON.stringify(indexes, null, 2));
    
    console.log('Fix completed!');
  } catch (err) {
    console.error('Error during fix:', err);
  } finally {
    mongoose.disconnect();
  }
} 