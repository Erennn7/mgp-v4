const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  huidNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'HUID number can not be more than 20 characters'],
    validate: {
      validator: function(v) {
        return v === undefined || v === null || v.length > 0;
      },
      message: props => 'HUID number cannot be an empty string'
    }
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name can not be more than 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Gold Jewelry',
      'Silver Jewelry',
      'Diamond Jewelry',
      'Gemstone Jewelry',
      'Gold Coins',
      'Silver Coins',
      'Other'
    ]
  },
  type: {
    type: String,
    enum: [
      'Ring',
      'Necklace',
      'Bracelet',
      'Earring',
      'Pendant',
      'Chain',
      'Bangle',
      'Coin',
      'Other'
    ],
    required: [true, 'Please specify the type of jewelry']
  },
  weightType: {
    type: String,
    enum: ['Gram', 'Milligram', 'Carat', 'Piece'],
    default: 'Gram'
  },
  netWeight: {
    type: Number,
    required: [true, 'Please add the net weight']
  },
  grossWeight: {
    type: Number,
    required: [true, 'Please add the gross weight']
  },
  purity: {
    type: String,
    required: function() {
      return ['Gold Jewelry', 'Silver Jewelry', 'Gold Coins', 'Silver Coins'].includes(this.category);
    }
  },
  makingCharges: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  images: [{
    type: String,
    default: 'no-image.jpg'
  }],
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  hasStone: {
    type: Boolean,
    default: false
  },
  stoneDetails: {
    type: String,
    trim: true,
    maxlength: [200, 'Stone details can not be more than 200 characters']
  },
  stonePrice: {
    type: Number,
    default: 0,
    min: [0, 'Stone price cannot be negative']
  }
});

module.exports = mongoose.model('Product', ProductSchema); 