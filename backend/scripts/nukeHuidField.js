const mongoose = require('mongoose');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    removeHuidField();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function removeHuidField() {
  try {
    console.log('Starting complete HUID field removal for null values...');
    
    // 1. Drop the existing index
    try {
      await mongoose.connection.db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped huidNumber index');
    } catch (err) {
      console.log('No index to drop or error:', err.message);
    }
    
    // 2. Direct MongoDB command to remove the field
    const result = await mongoose.connection.db.collection('products').updateMany(
      { $or: [{ huidNumber: null }, { huidNumber: "" }] }, 
      { $unset: { huidNumber: 1 } }
    );
    
    console.log(`Updated ${result.modifiedCount} out of ${result.matchedCount} products`);
    
    // 3. Verify null HUIDs are gone
    const nullHuids = await mongoose.connection.db.collection('products').countDocuments({ huidNumber: null });
    const emptyHuids = await mongoose.connection.db.collection('products').countDocuments({ huidNumber: "" });
    
    console.log(`Remaining null HUIDs: ${nullHuids}`);
    console.log(`Remaining empty HUIDs: ${emptyHuids}`);
    
    // 4. Create new sparse index
    await mongoose.connection.db.collection('products').createIndex(
      { huidNumber: 1 },
      { 
        unique: true, 
        sparse: true,
        background: true 
      }
    );
    console.log('Created new sparse index for huidNumber');
    
    console.log('Complete! Field has been removed from all products with null values.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
} 