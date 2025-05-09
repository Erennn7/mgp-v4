const Rate = require('../models/Rate');
const asyncHandler = require('../middleware/async');

// @desc    Get all rates
// @route   GET /api/rates
// @access  Private
exports.getRates = asyncHandler(async (req, res, next) => {
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
  let query = Rate.find(JSON.parse(queryStr));

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
    query = query.sort('-rateDate');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Rate.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const rates = await query;

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
    count: rates.length,
    pagination,
    data: rates
  });
});

// @desc    Get latest rates
// @route   GET /api/rates/latest
// @access  Private
exports.getLatestRates = asyncHandler(async (req, res, next) => {
  // Find all active rates
  const activeRates = await Rate.find({ isActive: true });

  res.status(200).json({
    success: true,
    count: activeRates.length,
    data: activeRates
  });
});

// @desc    Get single rate
// @route   GET /api/rates/:id
// @access  Private
exports.getRate = asyncHandler(async (req, res, next) => {
  const rate = await Rate.findById(req.params.id);

  if (!rate) {
    return res.status(404).json({
      success: false,
      error: 'Rate not found'
    });
  }

  res.status(200).json({
    success: true,
    data: rate
  });
});

// @desc    Create new rate
// @route   POST /api/rates
// @access  Private
exports.createRate = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Format the date to start of day to ensure uniqueness
  if (req.body.rateDate) {
    const date = new Date(req.body.rateDate);
    date.setHours(0, 0, 0, 0);
    req.body.rateDate = date;
  }

  const rate = await Rate.create(req.body);

  res.status(201).json({
    success: true,
    data: rate
  });
});

// @desc    Update rate
// @route   PUT /api/rates/:id
// @access  Private
exports.updateRate = asyncHandler(async (req, res, next) => {
  let rate = await Rate.findById(req.params.id);

  if (!rate) {
    return res.status(404).json({
      success: false,
      error: 'Rate not found'
    });
  }

  // Format the date to start of day if provided
  if (req.body.rateDate) {
    const date = new Date(req.body.rateDate);
    date.setHours(0, 0, 0, 0);
    req.body.rateDate = date;
  }

  rate = await Rate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: rate
  });
});

// @desc    Delete rate
// @route   DELETE /api/rates/:id
// @access  Private
exports.deleteRate = asyncHandler(async (req, res, next) => {
  const rate = await Rate.findById(req.params.id);

  if (!rate) {
    return res.status(404).json({
      success: false,
      error: 'Rate not found'
    });
  }

  await rate.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get rate history
// @route   GET /api/rates/history/:metal/:purity
// @access  Private
exports.getRateHistory = asyncHandler(async (req, res, next) => {
  const { metal, purity } = req.params;

  // Validate required params
  if (!metal || !purity) {
    return res.status(400).json({
      success: false,
      error: 'Please provide metal and purity parameters'
    });
  }

  // Find rates for specific metal and purity
  const rateHistory = await Rate.find({
    metal,
    purity
  }).sort('-rateDate');

  res.status(200).json({
    success: true,
    count: rateHistory.length,
    data: rateHistory
  });
});

// @desc    Toggle rate active status
// @route   PATCH /api/rates/:id/toggle-active
// @access  Private
exports.toggleRateActive = asyncHandler(async (req, res, next) => {
  let rate = await Rate.findById(req.params.id);

  if (!rate) {
    return res.status(404).json({
      success: false,
      error: 'Rate not found'
    });
  }

  // Toggle the active status
  rate.isActive = !rate.isActive;
  await rate.save();

  res.status(200).json({
    success: true,
    data: rate
  });
}); 