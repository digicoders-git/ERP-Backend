const mongoose = require('mongoose');

const bookIssueSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, refPath: 'memberType', required: true },
  memberType: { type: String, required: true, enum: ['Student', 'LibraryMember'], default: 'LibraryMember' },
  randomBookId: { type: String, unique: true, sparse: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date, default: null },
  status: { type: String, enum: ['issued', 'returned', 'overdue'], default: 'issued' },
  fine: { type: Number, default: 0 },
  finePerDay: { type: Number, default: 5 },
  renewalCount: { type: Number, default: 0 },
  issueMethod: { type: String, enum: ['Barcode', 'RFID', 'Manual'], default: 'Manual' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

bookIssueSchema.index({ status: 1 });
bookIssueSchema.index({ dueDate: 1 });
bookIssueSchema.index({ member: 1 });

module.exports = mongoose.model('BookIssue', bookIssueSchema);
