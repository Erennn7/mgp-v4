const { MongoClient } = require('mongodb');

// MongoDB URI from config
const MONGO_URI = 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management';

async function rebuildCollection() {
  console.log('Starting complete rebuild of products collection...');
  
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('jewelry-management');
    
    // 1. Get all existing products
    const products = await db.collection('products').find({}).toArray();
    console.log(`Retrieved ${products.length} products`);
    
    // 2. Create a clean backup in case we need to restore
    try {
      await db.collection('products_backup_final').drop();
    } catch (err) {
      console.log('No backup collection to drop');
    }
    
    await db.collection('products_backup_final').insertMany(products);
    console.log('Created backup in products_backup_final collection');
    
    // 3. Create clean documents without problematic fields
    const cleanProducts = products.map(product => {
      // Create a completely new object without the huidNumber field
      const { 
        _id,
        name, 
        category, 
        type, 
        weightType,
        netWeight,
        grossWeight,
        purity,
        makingCharges,
        description,
        images,
        stock,
        isActive,
        createdBy,
        createdAt,
        hasStone,
        stoneDetails,
        stonePrice
      } = product;
      
      // Start with a clean object
      const cleanProduct = {
        _id,
        name, 
        category, 
        type, 
        weightType,
        netWeight,
        grossWeight,
        purity,
        makingCharges,
        description: description || '',
        images: images || [],
        stock: stock || 0,
        isActive: isActive !== undefined ? isActive : true,
        createdBy,
        createdAt,
        hasStone: hasStone || false,
        stoneDetails: stoneDetails || '',
        stonePrice: stonePrice || 0
      };
      
      // Only add huidNumber if it exists and is not null
      if (product.huidNumber && product.huidNumber !== null) {
        cleanProduct.huidNumber = product.huidNumber;
      }
      
      return cleanProduct;
    });
    
    // 4. Drop and recreate the products collection
    await db.collection('products').drop();
    console.log('Dropped products collection');
    
    // 5. Insert clean products
    if (cleanProducts.length > 0) {
      await db.collection('products').insertMany(cleanProducts);
    }
    console.log(`Inserted ${cleanProducts.length} clean products`);
    
    // 6. Create proper sparse index
    await db.collection('products').createIndex(
      { huidNumber: 1 },
      { unique: true, sparse: true, background: true }
    );
    console.log('Created new sparse unique index on huidNumber');
    
    // 7. Final verification
    const withHuid = await db.collection('products').countDocuments({ huidNumber: { $exists: true } });
    const nullHuid = await db.collection('products').countDocuments({ huidNumber: null });
    const total = await db.collection('products').countDocuments();
    
    console.log(`
Final verification:
- Total products: ${total}
- Products with HUID field: ${withHuid}
- Products with null HUID value (should be 0): ${nullHuid}
    `);
    
    console.log('Rebuild completed successfully!');
  } catch (err) {
    console.error('Error during rebuild:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

rebuildCollection().catch(console.error); 