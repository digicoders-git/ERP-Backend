const mongoose = require('mongoose');

const bookCategorizationSchema = new mongoose.Schema({
  bookId: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  class: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  author: { type: String, trim: true },
  isbn: { type: String, trim: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

bookCategorizationSchema.index({ branch: 1, class: 1, subject: 1 });

module.exports = mongoose.model('BookCategorization', bookCategorizationSchema);
