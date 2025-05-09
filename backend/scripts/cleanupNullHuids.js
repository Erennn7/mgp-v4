const mongoose = require('mongoose');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    cleanupNullHuids();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function cleanupNullHuids() {
  try {
    console.log('Starting null HUID cleanup...');
    
    // Find all products with null HUID
    const nullProducts = await mongoose.connection.db.collection('products').find({
      huidNumber: null
    }).toArray();
    
    console.log(`Found ${nullProducts.length} products with null HUID`);
    
    // If there's more than one null HUID, we need to unset the field to make them work with sparse index
    if (nullProducts.length > 0) {
      // For the first product, completely remove the huidNumber field
      for (const product of nullProducts) {
        // Use $unset to completely remove the field instead of setting to null
        await mongoose.connection.db.collection('products').updateOne(
          { _id: product._id },
          { $unset: { huidNumber: "" } }
        );
        console.log(`Removed huidNumber field from product ${product._id}`);
      }
    }
    
    // Check for any remaining null HUIDs
    const remainingNulls = await mongoose.connection.db.collection('products').find({
      huidNumber: null
    }).count();
    
    console.log(`Remaining products with null HUID: ${remainingNulls}`);
    
    // Double check the index configuration
    const indexes = await mongoose.connection.db.collection('products').indexes();
    const huidIndex = indexes.find(index => index.name === 'huidNumber_1');
    
    console.log('Current HUID index configuration:');
    console.log(JSON.stringify(huidIndex, null, 2));
    
    console.log('Cleanup complete!');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    mongoose.disconnect();
  }
} 