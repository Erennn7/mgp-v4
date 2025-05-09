const mongoose = require('mongoose');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    // Run the fix function after successful connection
    setTimeout(fixProductIndex, 1000); // Add a small delay to ensure connection is fully established
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function fixProductIndex() {
  try {
    // Drop the problematic index
    console.log('Dropping the problematic huidNumber index...');
    
    try {
      await mongoose.connection.db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped huidNumber index');
    } catch (indexErr) {
      console.log('Index may not exist or other error:', indexErr.message);
      // Continue even if drop fails - it might not exist
    }

    // Create a new sparse index that properly handles null values
    console.log('Creating new sparse index for huidNumber...');
    await mongoose.connection.db.collection('products').createIndex(
      { huidNumber: 1 },
      { unique: true, sparse: true }
    );
    console.log('Successfully created new sparse index for huidNumber');

    console.log('Fix completed successfully');
  } catch (err) {
    console.error('Error fixing product index:', err.message);
  } finally {
    mongoose.disconnect();
  }
} 