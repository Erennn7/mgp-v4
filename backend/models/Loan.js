const mongoose = require('mongoose');

const LoanItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add item name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  itemType: {
    type: String,
    required: [true, 'Please specify item type'],
    enum: ['Gold Jewelry', 'Silver Jewelry', 'Diamond Jewelry', 'Other Jewelry', 'Watch', 'Other'],
    default: 'Gold Jewelry'
  },
  weight: {
    type: Number,
    required: [true, 'Please specify weight in grams']
  },
  purity: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  loanAmount: {
    type: Number,
    required: [true, 'Please add loan amount']
  },
  images: [String]
});

const LoanSchema = new mongoose.Schema({
  loanNumber: {
    type: String,
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: [LoanItemSchema],
  startDate: {
    type: Date,
    required: [true, 'Please add a start date'],
    default: Date.now
  },
  totalLoanAmount: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number,
    required: [true, 'Please add monthly interest rate'],
    min: [0, 'Interest rate cannot be negative'],
    description: 'Monthly interest rate as a percentage'
  },
  status: {
    type: String,
    enum: ['Active', 'Closed', 'Defaulted'],
    default: 'Active'
  },
  payments: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    paymentType: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Partial', 'Other'],
      default: 'Cash'
    },
    notes: String
  }],
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

// Generate loan number before validation
LoanSchema.pre('validate', async function(next) {
  if (!this.loanNumber) {
    // Get current date
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    try {
      // Get last loan
      const lastLoan = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
      let sequence = 1;
      
      if (lastLoan && lastLoan.loanNumber) {
        // Extract sequence number from last loan number
        const lastSequence = parseInt(lastLoan.loanNumber.split('-')[2], 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
      
      // Format: LOAN-YYMM-SEQUENCE
      this.loanNumber = `LOAN-${year}${month}-${sequence.toString().padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating loan number:', err);
      // Set a default fallback loan number with timestamp to prevent validation failure
      const timestamp = Date.now().toString().substr(-8);
      this.loanNumber = `LOAN-${year}${month}-T${timestamp}`;
    }
  }
  
  next();
});

// Calculate current loan amount with simple interest and handle partial payments
LoanSchema.methods.calculateCurrentAmount = function(asOfDate = new Date()) {
  const principal = this.totalLoanAmount;
  const startDate = new Date(this.startDate);
  
  // Sort payments by date
  const sortedPayments = [...this.payments].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let remainingPrincipal = principal;
  let accruedInterest = 0;
  let totalPaid = 0;
  let currentDate = new Date(startDate);
  
  // Process each payment chronologically
  for (const payment of sortedPayments) {
    const paymentDate = new Date(payment.date);
    
    // Calculate months between current tracked date and payment date
    const monthsDiff = (paymentDate.getFullYear() - currentDate.getFullYear()) * 12 + 
                       paymentDate.getMonth() - currentDate.getMonth() +
                       (paymentDate.getDate() >= currentDate.getDate() ? 0 : -1); // Adjust for partial months
    
    if (monthsDiff > 0) {
      // Calculate simple interest accrued in this period based on current principal
      const monthlyRate = this.interestRate / 100;
      // Simple interest = Principal * Rate * Time
      const interestForPeriod = remainingPrincipal * monthlyRate * monthsDiff;
      accruedInterest += interestForPeriod;
    }
    
    // Apply payment
    totalPaid += payment.amount;
    
    // First pay off accrued interest, then reduce principal
    if (payment.amount <= accruedInterest) {
      accruedInterest -= payment.amount;
    } else {
      const remainingPayment = payment.amount - accruedInterest;
      accruedInterest = 0;
      remainingPrincipal = Math.max(0, remainingPrincipal - remainingPayment);
    }
    
    // Update current date to payment date for next calculation
    currentDate = new Date(paymentDate);
  }
  
  // Calculate interest from last payment (or start date) to asOfDate
  const finalMonthsDiff = (asOfDate.getFullYear() - currentDate.getFullYear()) * 12 + 
                         asOfDate.getMonth() - currentDate.getMonth() +
                         (asOfDate.getDate() >= currentDate.getDate() ? 0 : -1); // Adjust for partial months
  
  if (finalMonthsDiff > 0 && remainingPrincipal > 0) {
    const monthlyRate = this.interestRate / 100;
    // Simple interest for final period
    const finalInterest = remainingPrincipal * monthlyRate * finalMonthsDiff;
    accruedInterest += finalInterest;
  }
  
  const totalDue = remainingPrincipal + accruedInterest;
  
  return {
    originalPrincipal: principal,
    remainingPrincipal,
    interestAccrued: accruedInterest,
    totalDue,
    totalPaid,
    remainingBalance: totalDue,
    paidInFull: totalDue <= 0
  };
};

// Update status when payment is added
LoanSchema.pre('save', function(next) {
  if (this.isModified('payments')) {
    const calculation = this.calculateCurrentAmount();
    
    // Update status if fully paid
    if (calculation.paidInFull) {
      this.status = 'Closed';
    }
  }
  
  next();
});

module.exports = mongoose.model('Loan', LoanSchema); 