const mongoose = require('mongoose');

const RateSchema = new mongoose.Schema({
  metal: {
    type: String,
    required: [true, 'Please specify the metal type'],
    enum: ['Gold', 'Silver', 'Diamond', 'Other']
  },
  purity: {
    type: String,
    required: [true, 'Please specify the purity']
  },
  ratePerGram: {
    type: Number,
    required: [true, 'Please add the rate per gram'],
    min: [0, 'Rate cannot be negative']
  },
  rateDate: {
    type: Date,
    default: Date.now
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
  }
});

// Remove the unique index to allow multiple rates per metal/purity

// Pre-save hook to ensure only one active rate per metal/purity combination
RateSchema.pre('save', async function(next) {
  // If this rate is being set as active, deactivate all other rates for the same metal/purity
  if (this.isActive) {
    await this.constructor.updateMany(
      { 
        metal: this.metal, 
        purity: this.purity, 
        _id: { $ne: this._id },
        isActive: true 
      },
      { isActive: false }
    );
  }
  next();
});

module.exports = mongoose.model('Rate', RateSchema); 