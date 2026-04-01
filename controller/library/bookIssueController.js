const BookIssue = require('../../model/BookIssue');
const Book = require('../../model/Book');
const LibraryMember = require('../../model/LibraryMember');
const Admin = require('../../model/Admin');

// Issue Book
exports.issueBook = async (req, res) => {
  try {
    const { bookId, memberId, issueDate, dueDate, issueMethod } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can issue books' });
    }

    const [book, member] = await Promise.all([
      Book.findById(bookId),
      LibraryMember.findById(memberId)
    ]);

    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.availableCopies <= 0) return res.status(400).json({ message: 'No copies available' });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (!member.status) return res.status(400).json({ message: 'Member is inactive' });

    const bookIssue = new BookIssue({
      book: bookId,
      member: memberId,
      issueDate: issueDate || new Date(),
      dueDate,
      issueMethod: issueMethod || 'Manual',
      branch: admin.branch,
      client: admin.client,
      issuedBy: adminId
    });

    book.availableCopies -= 1;
    book.issuedCopies = (book.issuedCopies || 0) + 1;
    await Promise.all([book.save(), bookIssue.save()]);

    res.status(201).json({ message: 'Book issued successfully', bookIssue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Return Book
exports.returnBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnDate } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can return books' });
    }

    const bookIssue = await BookIssue.findById(id);
    if (!bookIssue) return res.status(404).json({ message: 'Book issue record not found' });
    if (bookIssue.status === 'returned') return res.status(400).json({ message: 'Book already returned' });

    const actualReturn = returnDate ? new Date(returnDate) : new Date();
    const due = new Date(bookIssue.dueDate);
    const diffDays = Math.ceil((actualReturn - due) / (1000 * 60 * 60 * 24));
    const fine = diffDays > 0 ? diffDays * (bookIssue.finePerDay || 5) : 0;

    const book = await Book.findById(bookIssue.book);
    book.availableCopies += 1;
    book.issuedCopies = Math.max(0, (book.issuedCopies || 1) - 1);

    bookIssue.returnDate = actualReturn;
    bookIssue.status = 'returned';
    bookIssue.fine = fine;

    await Promise.all([book.save(), bookIssue.save()]);

    res.status(200).json({ message: 'Book returned successfully', bookIssue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Book Issues
exports.getAllBookIssues = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can view book issues' });
    }

    // Auto-mark overdue before fetching
    await BookIssue.updateMany(
      { branch: admin.branch, status: 'issued', dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    );

    const searchQuery = { branch: admin.branch };
    if (status) searchQuery.status = status;

    const [bookIssues, total] = await Promise.all([
      BookIssue.find(searchQuery)
        .populate('book', 'title author ISBN barcode')
        .populate('member', 'name email memberId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BookIssue.countDocuments(searchQuery)
    ]);

    res.status(200).json({
      bookIssues,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Book Issue By ID
exports.getBookIssueById = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can view book issues' });
    }

    const bookIssue = await BookIssue.findById(req.params.id)
      .populate('book', 'title author ISBN barcode')
      .populate('member', 'name email memberId')
      .lean();

    if (!bookIssue) return res.status(404).json({ message: 'Book issue record not found' });

    res.status(200).json({ bookIssue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
