const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './.env' });

const dropIndex = async () => {
  // Get MongoDB URI from env
  const mongoURI = process.env.MONGO_URI;
  
  if (!mongoURI) {
    console.error('MONGO_URI not found in environment variables');
    return;
  }
  
  const client = new MongoClient(mongoURI);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Get database name from URI
    const dbName = mongoURI.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    // List all indexes on the products collection to verify
    const indexes = await db.collection('products').indexes();
    console.log('Current indexes on products collection:', indexes);
    
    // Drop the unique index on the products collection
    try {
      await db.collection('products').dropIndex('itemCode_1');
      console.log('Successfully dropped index: itemCode_1');
    } catch (dropErr) {
      console.error('Error dropping specific index:', dropErr.message);
      console.log('Trying to drop all indexes except _id...');
      
      // Alternative: drop all indexes except _id
      await db.collection('products').dropIndexes();
      console.log('Dropped all non-_id indexes');
    }
    
    // Confirm indexes after drop
    const remainingIndexes = await db.collection('products').indexes();
    console.log('Remaining indexes:', remainingIndexes);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    // Close the connection
    await client.close();
    console.log('MongoDB connection closed');
  }
};

// Run the function
dropIndex(); 