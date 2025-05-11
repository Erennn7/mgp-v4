const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: function() {
      return !this.isCustomItem; // Only required if not a custom item
    }
  },
  isCustomItem: {
    type: Boolean,
    default: false
  },
  customProductDetails: {
    name: String,
    category: String,
    netWeight: Number,
    grossWeight: Number,
    purity: String,
    weightType: String,
    price: Number,
    makingCharges: Number,
    hasStone: Boolean,
    stonePrice: Number,
    huid: String
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  rate: {
    type: Number,
    required: [true, 'Please add the rate']
  },
  weight: {
    type: Number,
    required: [true, 'Please add weight']
  },
  makingCharges: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
});

const SaleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Please add an invoice number'],
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: [SaleItemSchema],
  itemsTotal: {
    type: Number,
    required: true
  },
  subTotal: {
    type: Number,
    required: true
  },
  makingChargesPercentage: {
    type: Number,
    default: 0
  },
  makingChargesAmount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Paid'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  },
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

// Generate invoice number before saving
SaleSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    // Get current date
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get last invoice
    const lastSale = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    let sequence = 1;
    
    if (lastSale && lastSale.invoiceNumber) {
      // Extract sequence number from last invoice
      const lastSequence = parseInt(lastSale.invoiceNumber.split('-')[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    // Format: INV-YYMM-SEQUENCE
    this.invoiceNumber = `INV-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
  
  next();
});

module.exports = mongoose.model('Sale', SaleSchema); 