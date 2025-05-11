const mongoose = require('mongoose');

const ProductTypeSchema = new mongoose.Schema({
  value: {
    type: String,
    required: [true, 'Please add a type value'],
    trim: true,
    unique: true,
    maxlength: [50, 'Type value cannot be more than 50 characters']
  },
  label: {
    type: String,
    required: [true, 'Please add a type label'],
    trim: true,
    maxlength: [50, 'Type label cannot be more than 50 characters']
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

module.exports = mongoose.model('ProductType', ProductTypeSchema); 