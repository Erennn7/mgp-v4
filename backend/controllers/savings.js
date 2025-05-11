const Saving = require('../models/Saving');
const asyncHandler = require('../middleware/async');
const { format } = require('date-fns');

// @desc    Get all savings
// @route   GET /api/savings
// @access  Private
exports.getSavings = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit', 'search'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = Saving.find(JSON.parse(queryStr));
  
  // Handle search by scheme number or customer name
  if (req.query.search) {
    // Search by scheme number first
    const schemeNumberQuery = { 
      schemeNumber: { $regex: req.query.search, $options: 'i' } 
    };

    // We'll need to use aggregation to search on customer name
    const customerNameSavings = await Saving.aggregate([
      {
        $lookup: {
          from: 'customers', // The collection to join
          localField: 'customer',
          foreignField: '_id',
          as: 'customerData'
        }
      },
      {
        $match: {
          'customerData.name': { $regex: req.query.search, $options: 'i' }
        }
      },
      {
        $project: {
          _id: 1 // Only need the IDs for the next query
        }
      }
    ]);

    // Get array of saving IDs where customer name matches
    const customerMatchIds = customerNameSavings.map(saving => saving._id);

    // Use $or to match either scheme number or savings by customer name
    query = Saving.find({
      $or: [
        schemeNumberQuery,
        { _id: { $in: customerMatchIds } }
      ]
    });
  }
  
  // Continue with populate
  query = query.populate({
    path: 'customer',
    select: 'name phone'
  })
  .populate({
    path: 'createdBy',
    select: 'name'
  })
  .populate({
    path: 'installments.recordedBy',
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
  
  // Get total count with same filters
  let totalQuery = {...JSON.parse(queryStr)};
  
  // Apply the same search filters for counting
  if (req.query.search) {
    const customerNameSavings = await Saving.aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerData'
        }
      },
      {
        $match: {
          'customerData.name': { $regex: req.query.search, $options: 'i' }
        }
      },
      {
        $project: {
          _id: 1
        }
      }
    ]);
    
    const customerMatchIds = customerNameSavings.map(saving => saving._id);
    
    totalQuery = {
      $or: [
        { schemeNumber: { $regex: req.query.search, $options: 'i' } },
        { _id: { $in: customerMatchIds } }
      ]
    };
  }
  
  const total = await Saving.countDocuments(totalQuery);

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const savings = await query;

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
  
  pagination.total = total;

  res.status(200).json({
    success: true,
    count: savings.length,
    pagination,
    data: savings
  });
});

// @desc    Get single saving
// @route   GET /api/savings/:id
// @access  Private
exports.getSaving = asyncHandler(async (req, res, next) => {
  const saving = await Saving.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'name phone email address'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    })
    .populate({
      path: 'installments.recordedBy',
      select: 'name'
    });

  if (!saving) {
    return res.status(404).json({
      success: false,
      error: 'Saving scheme not found'
    });
  }

  res.status(200).json({
    success: true,
    data: saving
  });
});

// @desc    Create new saving scheme
// @route   POST /api/savings
// @access  Private
exports.createSaving = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Create the saving
  const saving = await Saving.create(req.body);
  
  // Generate installment schedule
  saving.generateInstallments();
  await saving.save();

  res.status(201).json({
    success: true,
    data: saving
  });
});

// @desc    Update saving
// @route   PUT /api/savings/:id
// @access  Private
exports.updateSaving = asyncHandler(async (req, res, next) => {
  let saving = await Saving.findById(req.params.id);

  if (!saving) {
    return res.status(404).json({
      success: false,
      error: 'Saving scheme not found'
    });
  }

  // Do not allow updating installments directly through this route
  if (req.body.installments) {
    delete req.body.installments;
  }

  saving = await Saving.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
  .populate({
    path: 'customer',
    select: 'name phone'
  })
  .populate({
    path: 'createdBy',
    select: 'name'
  })
  .populate({
    path: 'installments.recordedBy',
    select: 'name'
  });

  res.status(200).json({
    success: true,
    data: saving
  });
});

// @desc    Delete saving
// @route   DELETE /api/savings/:id
// @access  Private
exports.deleteSaving = asyncHandler(async (req, res, next) => {
  const saving = await Saving.findById(req.params.id);

  if (!saving) {
    return res.status(404).json({
      success: false,
      error: 'Saving scheme not found'
    });
  }

  await saving.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get savings by customer
// @route   GET /api/savings/customer/:customerId
// @access  Private
exports.getCustomerSavings = asyncHandler(async (req, res, next) => {
  const savings = await Saving.find({ customer: req.params.customerId })
    .populate({
      path: 'createdBy',
      select: 'name'
    })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: savings.length,
    data: savings
  });
});

// @desc    Update saving installment status
// @route   PUT /api/savings/:id/installments/:installmentId
// @access  Private
exports.updateInstallment = asyncHandler(async (req, res, next) => {
  let saving = await Saving.findById(req.params.id);

  if (!saving) {
    return res.status(404).json({
      success: false,
      error: 'Saving scheme not found'
    });
  }

  // Find the installment
  const installmentIndex = saving.installments.findIndex(
    inst => inst._id.toString() === req.params.installmentId
  );

  if (installmentIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Installment not found'
    });
  }

  // Update fields
  if (req.body.status) {
    saving.installments[installmentIndex].status = req.body.status;
  }
  
  if (req.body.paidDate) {
    saving.installments[installmentIndex].paidDate = req.body.paidDate;
  }
  
  if (req.body.paymentMethod) {
    saving.installments[installmentIndex].paymentMethod = req.body.paymentMethod;
  }
  
  if (req.body.notes) {
    saving.installments[installmentIndex].notes = req.body.notes;
  }
  
  // Record who updated this
  saving.installments[installmentIndex].recordedBy = req.user.id;

  await saving.save();

  // Reload with populated fields
  saving = await Saving.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'name phone'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    })
    .populate({
      path: 'installments.recordedBy',
      select: 'name'
    });

  res.status(200).json({
    success: true,
    data: saving
  });
});

// @desc    Get savings stats
// @route   GET /api/savings/stats
// @access  Private
exports.getSavingsStats = asyncHandler(async (req, res, next) => {
  // Overall savings stats by status
  const savingsStats = await Saving.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$totalPaid' },
      }
    }
  ]);
  
  // Active savings with missed installments
  const today = new Date();
  const missedInstallments = await Saving.aggregate([
    {
      $match: { status: 'Active' }
    },
    {
      $unwind: '$installments'
    },
    {
      $match: {
        'installments.status': 'Pending',
        'installments.dueDate': { $lt: today }
      }
    },
    {
      $group: {
        _id: '$_id',
        missedCount: { $sum: 1 },
        schemeNumber: { $first: '$schemeNumber' },
        schemeName: { $first: '$schemeName' },
        customer: { $first: '$customer' }
      }
    }
  ]);
  
  // Populate customer details for missed installments
  const populatedMissed = await Saving.populate(missedInstallments, {
    path: 'customer',
    select: 'name phone'
  });
  
  // New schemes by month
  const schemesByMonth = await Saving.aggregate([
    {
      $group: {
        _id: { 
          year: { $year: '$startDate' },
          month: { $month: '$startDate' } 
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      savingsStats,
      missedInstallments: populatedMissed,
      schemesByMonth
    }
  });
});

// @desc    Process installment payment
// @route   POST /api/savings/:id/installments/:installmentId/pay
// @access  Private
exports.processInstallmentPayment = asyncHandler(async (req, res, next) => {
  let saving = await Saving.findById(req.params.id);

  if (!saving) {
    return res.status(404).json({
      success: false,
      error: 'Saving scheme not found'
    });
  }

  // Find the installment
  const installmentIndex = saving.installments.findIndex(
    inst => inst._id.toString() === req.params.installmentId
  );

  if (installmentIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Installment not found'
    });
  }

  // Update installment payment details
  saving.installments[installmentIndex].status = 'Paid';
  saving.installments[installmentIndex].paidDate = req.body.paidDate || new Date();
  saving.installments[installmentIndex].paymentMethod = req.body.paymentMethod || 'Cash';
  
  if (req.body.notes) {
    saving.installments[installmentIndex].notes = req.body.notes;
  }
  
  // Record who processed this payment
  saving.installments[installmentIndex].recordedBy = req.user.id;

  // Update scheme status if all installments are paid
  const pendingInstallments = saving.installments.filter(inst => inst.status === 'Pending');
  if (pendingInstallments.length === 0 && saving.status === 'Active') {
    saving.status = 'Completed';
  }

  // Update total paid amount
  saving.totalPaid = saving.installments
    .filter(inst => inst.status === 'Paid')
    .reduce((total, inst) => total + inst.amount, 0);

  await saving.save();

  // Reload with populated fields
  saving = await Saving.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'name phone'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    })
    .populate({
      path: 'installments.recordedBy',
      select: 'name'
    });

  res.status(200).json({
    success: true,
    data: saving
  });
});

// @desc    Redeem saving scheme
// @route   POST /api/savings/:id/redeem
// @access  Private
exports.redeemSaving = asyncHandler(async (req, res, next) => {
  let saving = await Saving.findById(req.params.id);

  if (!saving) {
    return res.status(404).json({
      success: false,
      error: 'Saving scheme not found'
    });
  }

  // Check if the saving is already redeemed
  if (saving.isRedeemed) {
    return res.status(400).json({
      success: false,
      error: 'This saving scheme has already been redeemed'
    });
  }

  // Only completed or active schemes with sufficient payments should be redeemable
  if (saving.status !== 'Completed' && saving.totalPaid < (saving.totalAmount * 0.7)) {
    return res.status(400).json({
      success: false,
      error: 'Scheme must be completed or have at least 70% of payments made to be redeemed'
    });
  }

  // Update scheme redemption details
  saving.isRedeemed = true;
  saving.redemptionDate = req.body.redemptionDate || new Date();
  saving.status = 'Redeemed';
  
  if (req.body.notes) {
    saving.notes = (saving.notes ? saving.notes + ' | ' : '') + 
                  `Redeemed on ${format(new Date(saving.redemptionDate), 'dd/MM/yyyy')}: ${req.body.notes}`;
  }

  await saving.save();

  // Reload with populated fields
  saving = await Saving.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'name phone'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    })
    .populate({
      path: 'installments.recordedBy',
      select: 'name'
    });

  res.status(200).json({
    success: true,
    data: saving
  });
}); 
