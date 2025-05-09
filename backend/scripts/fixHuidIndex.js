const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './.env' });

const fixIndex = async () => {
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
    
    // Drop the unique index on huidNumber
    try {
      await db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped index: huidNumber_1');
      
      // Fix empty strings in huidNumber field
      const emptyHuidResult = await db.collection('products').updateMany(
        { huidNumber: "" },
        { $set: { huidNumber: null } }
      );
      
      console.log(`Updated ${emptyHuidResult.modifiedCount} documents with empty huidNumber to null`);
      
      // Recreate the index with sparse option
      await db.collection('products').createIndex(
        { huidNumber: 1 },
        { 
          unique: true,
          sparse: true,
          background: true
        }
      );
      console.log('Successfully recreated index on huidNumber with sparse option');
      
    } catch (dropErr) {
      console.error('Error dropping specific index:', dropErr.message);
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
fixIndex(); 