const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Gold Jewelry',
      'Silver Jewelry',
      'Diamond Jewelry',
      'Gemstone Jewelry',
      'Gold Coins',
      'Silver Coins',
      'Raw Gold',
      'Raw Silver',
      'Other'
    ]
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  weightType: {
    type: String,
    enum: ['Gram', 'Milligram', 'Carat', 'Piece'],
    default: 'Gram'
  },
  weight: {
    type: Number,
    required: [true, 'Please add the weight']
  },
  purity: {
    type: String,
    required: function() {
      return ['Gold Jewelry', 'Silver Jewelry', 'Gold Coins', 'Silver Coins', 'Raw Gold', 'Raw Silver'].includes(this.category);
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  ratePerUnit: {
    type: Number,
    required: [true, 'Please add the rate per unit']
  },
  totalAmount: {
    type: Number,
    required: true
  }
});

const PurchaseSchema = new mongoose.Schema({
  purchaseNumber: {
    type: String,
    required: [true, 'Please add a purchase number'],
    unique: true,
    trim: true
  },
  serialNumber: {
    type: Number,
    unique: true,
    sparse: true
  },
  vendor: {
    name: {
      type: String,
      required: [true, 'Please add vendor name']
    },
    contact: {
      type: String
    },
    address: {
      type: String
    }
  },
  items: [PurchaseItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Paid'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  invoice: {
    invoiceNumber: String,
    invoiceDate: Date,
    invoiceImage: String
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate purchase number and serial number before saving
PurchaseSchema.pre('save', async function(next) {
  if (!this.purchaseNumber) {
    // Get current date
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get last purchase
    const lastPurchase = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    let sequence = 1;
    
    if (lastPurchase && lastPurchase.purchaseNumber) {
      // Extract sequence number from last purchase number
      const lastSequence = parseInt(lastPurchase.purchaseNumber.split('-')[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    // Format: PUR-YYMM-SEQUENCE
    this.purchaseNumber = `PUR-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
  
  // Generate serial number if not exists
  if (this.isNew && !this.serialNumber) {
    // Get the highest serial number
    const lastPurchaseWithSerial = await this.constructor.findOne(
      { serialNumber: { $exists: true } },
      { serialNumber: 1 },
      { sort: { serialNumber: -1 } }
    );
    
    if (lastPurchaseWithSerial && lastPurchaseWithSerial.serialNumber) {
      this.serialNumber = lastPurchaseWithSerial.serialNumber + 1;
    } else {
      this.serialNumber = 1;
    }
  }
  
  next();
});

module.exports = mongoose.model('Purchase', PurchaseSchema); 