const mongoose = require('mongoose');

const InstallmentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: [1, 'Installment amount must be at least 1']
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Missed', 'Waived'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },
  notes: String,
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const SavingSchema = new mongoose.Schema({
  schemeNumber: {
    type: String,
    required: [true, 'Please add a scheme number'],
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  schemeName: {
    type: String,
    required: [true, 'Please add a scheme name'],
    trim: true
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please add total amount']
  },
  installmentAmount: {
    type: Number,
    required: [true, 'Please add installment amount']
  },
  duration: {
    type: Number,
    required: [true, 'Please specify duration in months'],
    min: [1, 'Duration must be at least 1 month']
  },
  startDate: {
    type: Date,
    required: [true, 'Please add start date'],
    default: Date.now
  },
  maturityDate: {
    type: Date,
    required: [true, 'Please add maturity date']
  },
  bonusAmount: {
    type: Number,
    default: 0
  },
  bonusPercentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled', 'Defaulted', 'Redeemed'],
    default: 'Active'
  },
  installments: [InstallmentSchema],
  totalPaid: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: function() {
      return this.totalAmount;
    }
  },
  notes: String,
  isRedeemed: {
    type: Boolean,
    default: false
  },
  redemptionDate: {
    type: Date
  },
  redemption: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavingRedemption'
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

// Generate scheme number before saving
SavingSchema.pre('save', async function(next) {
  if (!this.schemeNumber) {
    // Get current date
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get last saving scheme
    const lastSaving = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    let sequence = 1;
    
    if (lastSaving && lastSaving.schemeNumber) {
      // Extract sequence number from last scheme number
      const lastSequence = parseInt(lastSaving.schemeNumber.split('-')[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    // Format: SAV-YYMM-SEQUENCE
    this.schemeNumber = `SAV-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
  
  next();
});

// Update total paid and remaining amount when installments are modified
SavingSchema.pre('save', function(next) {
  if (this.isModified('installments')) {
    // Calculate total paid
    const paidInstallments = this.installments.filter(
      installment => installment.status === 'Paid'
    );
    
    this.totalPaid = paidInstallments.reduce(
      (sum, installment) => sum + installment.amount, 
      0
    );
    
    // Update remaining amount
    this.remainingAmount = this.totalAmount - this.totalPaid;
    
    // Update status if fully paid
    if (this.totalPaid >= this.totalAmount && this.status === 'Active') {
      this.status = 'Completed';
    }
  }
  
  next();
});

// Method to generate installment schedule
SavingSchema.methods.generateInstallments = function() {
  // Clear existing installments
  this.installments = [];
  
  // Calculate installment dates and amounts
  const startDate = new Date(this.startDate);
  const amount = this.installmentAmount;
  
  // Generate installments
  for (let i = 0; i < this.duration; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    this.installments.push({
      amount,
      dueDate,
      status: 'Pending'
    });
  }
  
  // Set maturity date as 1 month after last installment
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + this.duration);
  this.maturityDate = maturityDate;
  
  return this.installments;
};

// Method to calculate maturity amount
SavingSchema.methods.calculateMaturityAmount = function() {
  // Calculate total contribution amount
  const totalContribution = this.installmentAmount * this.duration;
  
  // Calculate bonus amount
  let bonusAmount = 0;
  
  if (this.bonusAmount > 0) {
    // If fixed bonus amount is specified
    bonusAmount = this.bonusAmount;
  } else if (this.bonusPercentage > 0) {
    // If bonus percentage is specified
    bonusAmount = (totalContribution * this.bonusPercentage) / 100;
  } else {
    // Default: One month's installment as bonus
    bonusAmount = this.installmentAmount;
  }
  
  // Calculate the maturity amount (total contribution + bonus)
  const maturityAmount = totalContribution + bonusAmount;
  
  return {
    totalContribution,
    bonusAmount,
    maturityAmount
  };
};

module.exports = mongoose.model('Saving', SavingSchema); 