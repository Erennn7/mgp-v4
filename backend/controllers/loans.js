const Loan = require('../models/Loan');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');

// @desc    Get all loans
// @route   GET /api/loans
// @access  Private
exports.getLoans = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = Loan.find(JSON.parse(queryStr))
    .populate({
      path: 'customer',
      select: 'name phone'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Loan.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const loans = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: loans.length,
    pagination,
    data: loans
  });
});

// @desc    Get single loan
// @route   GET /api/loans/:id
// @access  Private
exports.getLoan = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'name phone email address idNumber idType'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  if (!loan) {
    return res.status(404).json({
      success: false,
      error: 'Loan not found'
    });
  }

  res.status(200).json({
    success: true,
    data: loan
  });
});

// @desc    Create new loan
// @route   POST /api/loans
// @access  Private
exports.createLoan = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Create the loan
  const loan = await Loan.create(req.body);

  res.status(201).json({
    success: true,
    data: loan
  });
});

// @desc    Update loan
// @route   PUT /api/loans/:id
// @access  Private
exports.updateLoan = asyncHandler(async (req, res, next) => {
  let loan = await Loan.findById(req.params.id);

  if (!loan) {
    return res.status(404).json({
      success: false,
      error: 'Loan not found'
    });
  }

  // Update the loan
  loan = await Loan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: loan
  });
});

// @desc    Delete loan
// @route   DELETE /api/loans/:id
// @access  Private
exports.deleteLoan = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    return res.status(404).json({
      success: false,
      error: 'Loan not found'
    });
  }

  await loan.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add payment to loan
// @route   POST /api/loans/:id/payments
// @access  Private
exports.addPayment = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    return res.status(404).json({
      success: false,
      error: 'Loan not found'
    });
  }

  // Validate payment amount
  if (!req.body.amount || req.body.amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Payment amount must be greater than zero'
    });
  }

  // Calculate current loan amount with interest
  const calculation = loan.calculateCurrentAmount();
  
  // Create payment object
  const payment = {
    amount: parseFloat(req.body.amount),
    date: req.body.date || new Date(),
    paymentType: req.body.paymentType || 'Cash',
    notes: req.body.notes || '',
    appliedToInterest: 0,
    appliedToPrincipal: 0
  };

  // Add optional payment description for partial payment
  if (req.body.paymentType === 'Partial') {
    payment.notes += payment.notes ? 
      ` (Partial payment: ${req.body.paymentPercentage || 'custom amount'})` : 
      `Partial payment: ${req.body.paymentPercentage || 'custom amount'}`;
  }

  // Calculate how much of payment goes to interest vs principal
  const pendingInterest = calculation.interestAccrued;
  
  if (payment.amount <= pendingInterest) {
    // Apply entire payment to interest
    payment.appliedToInterest = payment.amount;
    payment.appliedToPrincipal = 0;
    payment.notes += payment.notes ? 
      ` (Applied: ₹${payment.appliedToInterest.toFixed(2)} to interest, ₹${payment.appliedToPrincipal.toFixed(2)} to principal)` : 
      `Applied: ₹${payment.appliedToInterest.toFixed(2)} to interest, ₹${payment.appliedToPrincipal.toFixed(2)} to principal`;
  } else {
    // Apply part to interest, rest to principal
    payment.appliedToInterest = pendingInterest;
    payment.appliedToPrincipal = payment.amount - pendingInterest;
    payment.notes += payment.notes ? 
      ` (Applied: ₹${payment.appliedToInterest.toFixed(2)} to interest, ₹${payment.appliedToPrincipal.toFixed(2)} to principal)` : 
      `Applied: ₹${payment.appliedToInterest.toFixed(2)} to interest, ₹${payment.appliedToPrincipal.toFixed(2)} to principal`;
  }

  // Add payment to loan
  loan.payments.push(payment);

  // Recalculate after adding payment
  const updatedCalculation = loan.calculateCurrentAmount();
  
  // Update loan status based on payment
  if (updatedCalculation.paidInFull) {
    loan.status = 'Closed';
  }

  await loan.save();

  // Add payment calculation to response
  const response = {
    success: true,
    payment: {
      amount: payment.amount,
      date: payment.date,
      paymentType: payment.paymentType,
      appliedToInterest: payment.appliedToInterest,
      appliedToPrincipal: payment.appliedToPrincipal
    },
    calculation: updatedCalculation,
    data: loan
  };

  res.status(200).json(response);
});

// @desc    Extend loan
// @route   POST /api/loans/:id/extensions
// @access  Private
exports.extendLoan = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    return res.status(404).json({
      success: false,
      error: 'Loan not found'
    });
  }

  // Add extension record
  const extension = {
    previousDueDate: loan.dueDate,
    newDueDate: req.body.newDueDate,
    reason: req.body.reason,
    extensionFee: req.body.extensionFee || 0
  };

  loan.extensions.push(extension);
  
  // Update the loan due date
  loan.dueDate = req.body.newDueDate;
  
  // Update status
  loan.status = 'Extended';

  await loan.save();

  res.status(200).json({
    success: true,
    data: loan
  });
});

// @desc    Get loans for a customer
// @route   GET /api/loans/customer/:customerId
// @access  Private
exports.getCustomerLoans = asyncHandler(async (req, res, next) => {
  const loans = await Loan.find({ customer: req.params.customerId })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: loans.length,
    data: loans
  });
});

// @desc    Get loan stats
// @route   GET /api/loans/stats
// @access  Private
exports.getLoanStats = asyncHandler(async (req, res, next) => {
  // Overall loan stats
  const loanStats = await Loan.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPrincipal: { $sum: '$principal' },
        totalPaid: { $sum: '$totalPaid' },
      }
    }
  ]);
  
  // Overdue loans (due date has passed but status is still active)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdueLoans = await Loan.find({
    status: 'Active',
    dueDate: { $lt: today }
  })
  .countDocuments();
  
  // Loan amounts by month
  const loansByMonth = await Loan.aggregate([
    {
      $group: {
        _id: { 
          year: { $year: '$issuedDate' },
          month: { $month: '$issuedDate' } 
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$principal' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      loanStats,
      overdueLoans,
      loansByMonth
    }
  });
});

// @desc    Remove payment from loan
// @route   DELETE /api/loans/:id/payments/:paymentId
// @access  Private/Admin
exports.removePayment = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    return res.status(404).json({
      success: false,
      error: 'Loan not found'
    });
  }

  // Find the payment by ID
  const payment = loan.payments.id(req.params.paymentId);
  
  if (!payment) {
    return res.status(404).json({
      success: false,
      error: 'Payment not found'
    });
  }

  // Remove the payment
  payment.deleteOne();
  
  // Update loan status if needed
  const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Calculate interest
  const startDate = new Date(loan.startDate);
  const today = new Date();
  const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                    today.getMonth() - startDate.getMonth();
  
  // Compound interest formula: A = P(1 + r/n)^(nt)
  // Where: A = final amount, P = principal, r = interest rate, n = compounding frequency, t = time in years
  const monthlyRate = loan.interestRate / 100 / 12;
  const interestAmount = loan.totalLoanAmount * Math.pow(1 + monthlyRate, monthsDiff) - loan.totalLoanAmount;
  
  // Total amount to be paid with interest
  const totalAmountDue = loan.totalLoanAmount + interestAmount;
  
  if (totalPaid < totalAmountDue && loan.status === 'Closed') {
    loan.status = 'Active';
  }

  await loan.save();

  res.status(200).json({
    success: true,
    data: loan
  });
});

// @desc    Calculate current loan amount
// @route   GET /api/loans/:id/calculate
// @access  Private
exports.calculateLoan = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    return res.status(404).json({
      success: false,
      error: 'Loan not found'
    });
  }

  // Use the model's calculateCurrentAmount method with simple interest
  const calculation = loan.calculateCurrentAmount();

  // Add additional info for the frontend
  calculation.monthlyInterestRate = loan.interestRate;
  calculation.monthlyInterestAmount = calculation.remainingPrincipal * (loan.interestRate / 100);

  res.status(200).json({
    success: true,
    data: calculation
  });
});