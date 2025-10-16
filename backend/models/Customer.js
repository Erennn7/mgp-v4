const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name can not be more than 100 characters']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number can not be more than 20 characters']
  },
  gstin: {
    type: String,
    trim: true,
    maxlength: [15, 'GSTIN can not be more than 15 characters']
  },
  idNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'ID number can not be more than 50 characters']
  },
  idType: {
    type: String,
    enum: ['Aadhar', 'PAN', 'Passport', 'Driving License', 'Other'],
    default: 'Aadhar'
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    }
  },
  dob: {
    type: Date
  },
  photo: {
    type: String,
    default: 'no-photo.jpg'
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

module.exports = mongoose.model('Customer', CustomerSchema); 