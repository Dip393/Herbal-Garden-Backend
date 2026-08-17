//User model for users
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  userType: { type: String},
  otp: { type: String },
  bookmarks: [{type: String}],
  notes: [{
    plantName: { type: String, required: true},
    content: { type: String, required: true}
  }],
  viewedPlants: [{type: String}],
  reviewed: {type: Boolean}
});

module.exports = mongoose.model('User', userSchema);