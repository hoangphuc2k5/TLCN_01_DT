const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true },
    author: { type: String, default: '' },
    isbn: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    available: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LibraryBook', libraryBookSchema);
