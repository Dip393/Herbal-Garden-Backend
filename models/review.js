const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  rating: { type: Number, required: true },
  reviews: [
    {
      userName: { type: String, required: true },
      comment: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model('Review', reviewSchema);
