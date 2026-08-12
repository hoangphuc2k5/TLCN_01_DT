const mongoose = require('mongoose');

const bookLoanSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
    borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    borrowedAt: { type: Date, default: Date.now },
    dueAt: { type: Date, required: true },
    returnedAt: { type: Date, default: null },
    status: { type: String, enum: ['BORROWED', 'RETURNED', 'OVERDUE', 'LOST'], default: 'BORROWED' },
    note: { type: String, default: '' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

bookLoanSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model('BookLoan', bookLoanSchema);
