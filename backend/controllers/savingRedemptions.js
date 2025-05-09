const SavingRedemption = require('../models/SavingRedemption');
const Saving = require('../models/Saving');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Rate = require('../models/Rate');
const asyncHandler = require('../middleware/async');

// @desc    Get all redemptions
// @route   GET /api/savings/redemptions
// @access  Private
exports.getRedemptions = asyncHandler(async (req, res, next) => {
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
  let query = SavingRedemption.find(JSON.parse(queryStr))
    .populate({
      path: 'saving',
      select: 'schemeNumber schemeName'
    })
    .populate({
      path: 'customer',
      select: 'name phone'
    })
    .populate({
      path: 'items.product',
      select: 'name category type'
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
  const total = await SavingRedemption.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const redemptions = await query;

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
    count: redemptions.length,
    pagination,
    data: redemptions
  });
});

// @desc    Get single redemption
// @route   GET /api/savings/redemptions/:id
// @access  Private
exports.getRedemption = asyncHandler(async (req, res, next) => {
  const redemption = await SavingRedemption.findById(req.params.id)
    .populate({
      path: 'saving',
      select: 'schemeNumber schemeName totalAmount installmentAmount duration totalPaid'
    })
    .populate({
      path: 'customer',
      select: 'name phone email address'
    })
    .populate({
      path: 'items.product',
      select: 'name category type netWeight grossWeight purity'
    })
    .populate({
      path: 'sale',
      select: 'invoiceNumber total'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  if (!redemption) {
    return res.status(404).json({
      success: false,
      error: 'Redemption not found'
    });
  }

  res.status(200).json({
    success: true,
    data: redemption
  });
});

// @desc    Create new redemption
// @route   POST /api/savings/redemptions
// @access  Private
exports.createRedemption = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Verify the saving scheme exists and is eligible for redemption
  const saving = await Saving.findById(req.body.saving);
  
  if (!saving) {
    return res.status(404).json({
      success: false,
      error: 'Saving scheme not found'
    });
  }

  // Check if saving is already redeemed
  if (saving.isRedeemed) {
    return res.status(400).json({
      success: false,
      error: 'This saving scheme has already been redeemed'
    });
  }

  // Check if saving is eligible for redemption (completed or matured)
  if (saving.status !== 'Completed' && saving.status !== 'Active') {
    return res.status(400).json({
      success: false,
      error: 'This saving scheme is not eligible for redemption. It must be completed or active.'
    });
  }

  // Calculate maturity amount
  const { maturityAmount } = saving.calculateMaturityAmount();
  req.body.maturityAmount = maturityAmount;
  req.body.customer = saving.customer;
  
  // Calculate total purchase amount from items
  let totalPurchaseAmount = 0;
  
  // Validate and enrich each item with current rates if needed
  for (let i = 0; i < req.body.items.length; i++) {
    const item = req.body.items[i];
    
    // Check if product exists
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product not found for item at index ${i}`
      });
    }
    
    // Check if enough stock is available
    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
      });
    }
    
    // If rate is not provided, fetch current rate based on product type and purity
    if (!item.rate) {
      const metalType = product.category.includes('Gold') ? 'Gold' : 
                       product.category.includes('Silver') ? 'Silver' : 'Other';
      
      const rate = await Rate.findOne({
        metal: metalType,
        purity: product.purity,
        isActive: true
      });
      
      if (!rate && (metalType === 'Gold' || metalType === 'Silver')) {
        return res.status(404).json({
          success: false,
          error: `Current rate not found for ${metalType} with purity ${product.purity}`
        });
      }
      
      item.rate = rate ? rate.ratePerGram : 0;
    }
    
    // Set weight from product if not provided
    if (!item.weight) {
      item.weight = product.netWeight;
    }
    
    // Calculate total for item
    const metalValue = item.weight * item.rate * item.quantity;
    const makingChargesTotal = (item.makingCharges || product.makingCharges) * item.quantity;
    item.total = metalValue + makingChargesTotal;
    
    totalPurchaseAmount += item.total;
  }
  
  // Set total purchase amount
  req.body.totalPurchaseAmount = totalPurchaseAmount;
  
  // Check if additional payment is required
  if (totalPurchaseAmount > maturityAmount) {
    req.body.additionalPaymentRequired = true;
    req.body.additionalPaymentAmount = totalPurchaseAmount - maturityAmount;
  } else {
    req.body.additionalPaymentRequired = false;
    req.body.additionalPaymentAmount = 0;
  }
  
  // Generate redemption number manually
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get last redemption
  const lastRedemption = await SavingRedemption.findOne({}, {}, { sort: { 'createdAt': -1 } });
  let sequence = 1;
  
  if (lastRedemption && lastRedemption.redemptionNumber) {
    // Extract sequence number from last redemption number
    const lastSequence = parseInt(lastRedemption.redemptionNumber.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  
  // Format: RED-YYMM-SEQUENCE
  req.body.redemptionNumber = `RED-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  
  // Create the redemption
  const redemption = await SavingRedemption.create(req.body);
  
  // Update inventory (reduce stock)
  for (const item of redemption.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
  }
  
  // Skip sale creation for now - can be handled separately
  // Instead of trying to create a sale automatically, we'll just complete the redemption
  
  // Update saving scheme as redeemed
  saving.isRedeemed = true;
  saving.redemptionDate = new Date();
  saving.redemption = redemption._id;
  saving.status = 'Redeemed';
  await saving.save();
  
  res.status(201).json({
    success: true,
    data: redemption,
    message: 'Redemption processed successfully. Additional payment needs to be collected separately if required.'
  });
});

// @desc    Update redemption
// @route   PUT /api/savings/redemptions/:id
// @access  Private
exports.updateRedemption = asyncHandler(async (req, res, next) => {
  let redemption = await SavingRedemption.findById(req.params.id);

  if (!redemption) {
    return res.status(404).json({
      success: false,
      error: 'Redemption not found'
    });
  }

  // Only allow updating notes field
  const allowedUpdates = {
    notes: req.body.notes
  };

  redemption = await SavingRedemption.findByIdAndUpdate(
    req.params.id,
    allowedUpdates,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: redemption
  });
});

// @desc    Delete redemption
// @route   DELETE /api/savings/redemptions/:id
// @access  Private/Admin
exports.deleteRedemption = asyncHandler(async (req, res, next) => {
  const redemption = await SavingRedemption.findById(req.params.id);

  if (!redemption) {
    return res.status(404).json({
      success: false,
      error: 'Redemption not found'
    });
  }

  // Don't allow deletion if linked to a sale
  if (redemption.sale) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete redemption that is linked to a sale'
    });
  }

  // Restore product stock
  for (const item of redemption.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );
  }

  // Update the saving scheme to mark as not redeemed
  await Saving.findByIdAndUpdate(
    redemption.saving,
    {
      isRedeemed: false,
      redemptionDate: null,
      redemption: null,
      status: 'Completed'
    }
  );

  await redemption.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get redemptions for a customer
// @route   GET /api/savings/redemptions/customer/:customerId
// @access  Private
exports.getCustomerRedemptions = asyncHandler(async (req, res, next) => {
  const redemptions = await SavingRedemption.find({ customer: req.params.customerId })
    .populate({
      path: 'saving',
      select: 'schemeNumber schemeName'
    })
    .sort('-redemptionDate');

  res.status(200).json({
    success: true,
    count: redemptions.length,
    data: redemptions
  });
}); 