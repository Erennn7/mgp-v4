const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    const Sale = mongoose.model('Sale', require('../models/Sale').schema);
    
    // Get all sales
    const allSales = await Sale.find({}).sort({ createdAt: 1 }).lean();
    
    console.log(`Found ${allSales.length} total sales`);
    
    // Separate GST and non-GST bills
    const gstBills = allSales.filter(sale => sale.tax > 0);
    const nonGstBills = allSales.filter(sale => sale.tax === 0);
    
    console.log(`GST Bills: ${gstBills.length}`);
    console.log(`Non-GST Bills: ${nonGstBills.length}`);
    
    // Sort each category by creation date
    const sortedGstBills = gstBills.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const sortedNonGstBills = nonGstBills.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Update GST bills with serial numbers
    console.log('\nUpdating GST bills...');
    for (let i = 0; i < sortedGstBills.length; i++) {
      const sale = sortedGstBills[i];
      const serialNumber = i + 1;
      
      await Sale.updateOne(
        { _id: sale._id },
        { $set: { serialNumber: serialNumber } }
      );
      
      console.log(`GST Bill ${sale.invoiceNumber}: Serial Number ${serialNumber}`);
    }
    
    // Update non-GST bills with serial numbers
    console.log('\nUpdating non-GST bills...');
    for (let i = 0; i < sortedNonGstBills.length; i++) {
      const sale = sortedNonGstBills[i];
      const serialNumber = i + 1;
      
      await Sale.updateOne(
        { _id: sale._id },
        { $set: { serialNumber: serialNumber } }
      );
      
      console.log(`Non-GST Bill ${sale.invoiceNumber}: Serial Number ${serialNumber}`);
    }
    
    console.log('\n✅ Serial numbers added successfully!');
    console.log(`Total GST bills updated: ${sortedGstBills.length}`);
    console.log(`Total non-GST bills updated: ${sortedNonGstBills.length}`);
    
  } catch (error) {
    console.error('Error adding serial numbers:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
});
