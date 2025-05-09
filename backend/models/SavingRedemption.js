const mongoose = require('mongoose');

const RedemptionItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
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
  total: {
    type: Number,
    required: true
  }
});

const SavingRedemptionSchema = new mongoose.Schema({
  redemptionNumber: {
    type: String,
    required: [true, 'Please add a redemption number'],
    unique: true,
    trim: true
  },
  saving: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Saving',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  redemptionDate: {
    type: Date,
    default: Date.now
  },
  items: [RedemptionItemSchema],
  maturityAmount: {
    type: Number,
    required: true
  },
  totalPurchaseAmount: {
    type: Number,
    required: true
  },
  additionalPaymentRequired: {
    type: Boolean,
    default: false
  },
  additionalPaymentAmount: {
    type: Number,
    default: 0
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
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

// Generate redemption number before saving
SavingRedemptionSchema.pre('save', async function(next) {
  if (!this.redemptionNumber) {
    // Get current date
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get last redemption
    const lastRedemption = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    let sequence = 1;
    
    if (lastRedemption && lastRedemption.redemptionNumber) {
      // Extract sequence number from last redemption number
      const lastSequence = parseInt(lastRedemption.redemptionNumber.split('-')[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    // Format: RED-YYMM-SEQUENCE
    this.redemptionNumber = `RED-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
  
  next();
});

// Calculate additional payment amount before saving
SavingRedemptionSchema.pre('save', function(next) {
  // Calculate total purchase amount
  this.totalPurchaseAmount = this.items.reduce((sum, item) => sum + item.total, 0);
  
  // Check if additional payment is required
  if (this.totalPurchaseAmount > this.maturityAmount) {
    this.additionalPaymentRequired = true;
    this.additionalPaymentAmount = this.totalPurchaseAmount - this.maturityAmount;
  } else {
    this.additionalPaymentRequired = false;
    this.additionalPaymentAmount = 0;
  }
  
  next();
});

module.exports = mongoose.model('SavingRedemption', SavingRedemptionSchema); 