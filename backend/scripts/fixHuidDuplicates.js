const mongoose = require('mongoose');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    fixHuidDuplicates();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function fixHuidDuplicates() {
  try {
    // First, find all products with null or empty HUID
    const products = await mongoose.connection.db.collection('products').find({
      $or: [
        { huidNumber: null },
        { huidNumber: "" }
      ]
    }).toArray();

    console.log(`Found ${products.length} products with null or empty HUID`);
    
    if (products.length > 1) {
      console.log('Found multiple products with null HUID - keeping only the first one');
      
      // Keep the first product, update the rest with a placeholder
      for (let i = 1; i < products.length; i++) {
        const uniqueHuid = `TEMP_${products[i]._id.toString()}`;
        await mongoose.connection.db.collection('products').updateOne(
          { _id: products[i]._id },
          { $set: { huidNumber: uniqueHuid } }
        );
        console.log(`Updated product ${i} with temporary HUID: ${uniqueHuid}`);
      }
    }

    // Drop existing index if it exists
    try {
      await mongoose.connection.db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped existing huidNumber index');
    } catch (err) {
      console.log('No existing index to drop or error:', err.message);
    }

    // Create a new sparse index
    await mongoose.connection.db.collection('products').createIndex(
      { huidNumber: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'huidNumber_1'
      }
    );
    console.log('Created new sparse unique index on huidNumber');

    // Validate the fix
    const indexInfo = await mongoose.connection.db.collection('products').indexInformation();
    console.log('Current indexes:', indexInfo);

    console.log('Fix completed');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
} 