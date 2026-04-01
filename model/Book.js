const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  ISBN: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  totalCopies: { type: Number, required: true, min: 0 },
  availableCopies: { type: Number, default: function () { return this.totalCopies; } },
  issuedCopies: { type: Number, default: 0 },
  // Extra fields frontend uses
  barcode: { type: String, trim: true },
  rfidTag: { type: String, trim: true },
  location: { type: String, trim: true },
  publisher: { type: String, trim: true },
  publicationYear: { type: Number },
  pages: { type: Number },
  language: { type: String, trim: true, default: 'English' },
  condition: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'], default: 'Good' },
  price: { type: Number, default: 0 },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
