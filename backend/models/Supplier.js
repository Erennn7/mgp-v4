const mongoose = require('mongoose');
const SupplierItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Please add a category'],
    validate: {
      validator: function(v) {
        // Allow predefined categories or any custom category
        const predefinedCategories = [
          'Gold Jewelry',
          'Silver Jewelry',
          'Diamond Jewelry',
          'Gemstone Jewelry',
          'Gold Coins',
          'Silver Coins',
          'Raw Gold',
          'Raw Silver',
          'Other'
        ];
        return predefinedCategories.includes(v) || v.length >= 2; // Allow any custom category with at least 2 characters
      },
      message: props => `${props.value} is not a valid category. It must be either a predefined category or a custom category with at least 2 characters.`
    }
  },
  itemType: {
    type: String,
    required: [true, 'Please add an item type'],
    validate: {
      validator: function(v) {
        // Allow predefined types or any custom type
        const predefinedTypes = [
          'Ring',
          'Necklace',
          'Bracelet',
          'Earring',
          'Chain',
          'Bangle',
          'Pendant',
          'Coin',
          'Bar',
          'Other'
        ];
        return predefinedTypes.includes(v) || v.length >= 2; // Allow any custom type with at least 2 characters
      },
      message: props => `${props.value} is not a valid item type. It must be either a predefined type or a custom type with at least 2 characters.`
    }
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

const SupplierSchema = new mongoose.Schema({
  purchaseNumber: {
    type: String,
    required: [true, 'Please add a purchase number'],
    unique: true,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  supplier: {
    name: {
      type: String,
      required: [true, 'Please add supplier name']
    },
    contact: {
      type: String
    },
    address: {
      type: String
    }
  },
  items: [SupplierItemSchema],
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

// Generate purchase number before saving
SupplierSchema.pre('save', async function(next) {
  if (!this.purchaseNumber) {
    // Get current date
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get last supplier purchase
    const lastPurchase = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    let sequence = 1;
    
    if (lastPurchase && lastPurchase.purchaseNumber) {
      // Extract sequence number from last purchase number
      const lastSequence = parseInt(lastPurchase.purchaseNumber.split('-')[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    // Format: SUP-YYMM-SEQUENCE
    this.purchaseNumber = `SUP-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
  
  next();
});

module.exports = mongoose.model('Supplier', SupplierSchema); 