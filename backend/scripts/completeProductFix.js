const mongoose = require('mongoose');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    // Run the fix function after successful connection
    setTimeout(completeProductFix, 1000);
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function completeProductFix() {
  try {
    // 1. Remove the problematic index completely
    console.log('Step 1: Removing problematic huidNumber index...');
    try {
      // List all indexes to verify
      const indexes = await mongoose.connection.db.collection('products').indexes();
      console.log('Current indexes:', indexes);
      
      // Drop the index if it exists
      if (indexes.some(index => index.name === 'huidNumber_1')) {
        await mongoose.connection.db.collection('products').dropIndex('huidNumber_1');
        console.log('Successfully dropped huidNumber_1 index');
      } else {
        console.log('huidNumber_1 index not found, skipping drop');
      }
    } catch (indexErr) {
      console.log('Error handling indexes:', indexErr.message);
    }

    // 2. Update the schema setter to proper handle empty strings 
    console.log('Step 2: Updating products with null huidNumber values...');
    
    // Find all products with null or empty string huidNumber
    const productsToUpdate = await mongoose.connection.db.collection('products').find({
      $or: [
        { huidNumber: null },
        { huidNumber: "" }
      ]
    }).toArray();

    console.log(`Found ${productsToUpdate.length} products with null or empty huidNumber`);

    // If we have products with null or empty huidNumber, set them to null
    if (productsToUpdate.length > 0) {
      for (const product of productsToUpdate) {
        await mongoose.connection.db.collection('products').updateOne(
          { _id: product._id },
          { $set: { huidNumber: null } }
        );
      }
      console.log('Updated all products with null or empty huidNumber to null');
    }

    // 3. Create a new sparse, unique index 
    console.log('Step 3: Creating new sparse index for huidNumber...');
    await mongoose.connection.db.collection('products').createIndex(
      { huidNumber: 1 },
      { unique: true, sparse: true, background: true }
    );
    console.log('Successfully created new sparse index for huidNumber');

    // 4. Verify the fix
    console.log('Step 4: Verifying the fix...');
    const updatedIndexes = await mongoose.connection.db.collection('products').indexes();
    console.log('Updated indexes:', updatedIndexes);
    
    // Check if we have the correct index configuration
    const huidIndex = updatedIndexes.find(index => index.name === 'huidNumber_1');
    if (huidIndex && huidIndex.sparse === true && huidIndex.unique === true) {
      console.log('✅ Fix verified: huidNumber index is now properly configured as sparse and unique');
    } else {
      console.log('❌ Fix verification failed:', huidIndex);
    }

    console.log('Fix completed successfully');
  } catch (err) {
    console.error('Error fixing product collection:', err.message);
  } finally {
    mongoose.disconnect();
  }
} 