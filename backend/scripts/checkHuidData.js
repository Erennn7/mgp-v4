const mongoose = require('mongoose');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    checkHuidData();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function checkHuidData() {
  try {
    // Check indexes on products collection
    const indexes = await mongoose.connection.db.collection('products').indexes();
    console.log('Current indexes on products collection:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Find null HUID values
    const nullHuids = await mongoose.connection.db.collection('products').find({
      huidNumber: null
    }).toArray();
    
    console.log(`Found ${nullHuids.length} products with null huidNumber`);
    
    // Find empty string HUID values
    const emptyHuids = await mongoose.connection.db.collection('products').find({
      huidNumber: ""
    }).toArray();
    
    console.log(`Found ${emptyHuids.length} products with empty string huidNumber`);
    
    // Find products with no huidNumber field
    const noHuidField = await mongoose.connection.db.collection('products').find({
      huidNumber: { $exists: false }
    }).toArray();
    
    console.log(`Found ${noHuidField.length} products with no huidNumber field`);
    
    // Get total count of products
    const totalProducts = await mongoose.connection.db.collection('products').countDocuments();
    console.log(`Total products in database: ${totalProducts}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
} 