const { MongoClient } = require('mongodb');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

async function fixProblematicDocument() {
  console.log('Starting direct fix by ID...');
  
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('jewelry-management');
    
    // 1. Get all products with null HUID to see their IDs
    const nullProducts = await db.collection('products').find({ 
      huidNumber: null 
    }).toArray();
    
    console.log(`Found ${nullProducts.length} products with null HUID`);
    
    if (nullProducts.length > 0) {
      // Print out IDs for debugging
      nullProducts.forEach((product, index) => {
        console.log(`Product ${index + 1} ID: ${product._id}`);
      });
      
      // 2. Use more direct approach to remove the field
      for (const product of nullProducts) {
        // Try both approaches
        await db.collection('products').updateOne(
          { _id: product._id },
          { $unset: { huidNumber: 1 } }
        );
        console.log(`Applied $unset to product ${product._id}`);
        
        // Verify the document was updated
        const updatedDoc = await db.collection('products').findOne({ _id: product._id });
        console.log(`After unset - huidNumber exists: ${updatedDoc.hasOwnProperty('huidNumber')}`);
        
        // If unset didn't work, try a direct replace
        if (updatedDoc.hasOwnProperty('huidNumber')) {
          // Create a new document without the huidNumber field
          const { huidNumber, ...docWithoutHuid } = updatedDoc;
          // Replace the document
          await db.collection('products').replaceOne(
            { _id: product._id },
            docWithoutHuid
          );
          console.log(`Applied document replacement for product ${product._id}`);
          
          // Verify again
          const verifyDoc = await db.collection('products').findOne({ _id: product._id });
          console.log(`After replace - huidNumber exists: ${verifyDoc.hasOwnProperty('huidNumber')}`);
        }
      }
    }
    
    // 3. Recreate index to be safe
    try {
      await db.collection('products').dropIndex('huidNumber_1');
      console.log('Successfully dropped huidNumber index');
    } catch (err) {
      console.log('No index to drop or error:', err.message);
    }
    
    await db.collection('products').createIndex(
      { huidNumber: 1 },
      { unique: true, sparse: true, background: true }
    );
    console.log('Created new sparse index');
    
    // 4. Final verification
    const finalNullCount = await db.collection('products').countDocuments({ huidNumber: null });
    console.log(`Final check - products with null HUID: ${finalNullCount}`);
    
    console.log('Fix completed!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

fixProblematicDocument().catch(console.error); 