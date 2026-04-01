const Book = require('../../model/Book');
const Admin = require('../../model/Admin');

const getAdmin = async (adminId) => {
  const admin = await Admin.findById(adminId).lean();
  if (!admin || admin.role !== 'libraryAdmin') return null;
  return admin;
};

// Add Book
exports.addBook = async (req, res) => {
  try {
    const {
      title, author, ISBN, category, totalCopies,
      barcode, rfidTag, location, publisher,
      publicationYear, pages, language, condition, price
    } = req.body;

    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can add books' });

    const book = new Book({
      title, author, ISBN, category, totalCopies,
      availableCopies: totalCopies,
      issuedCopies: 0,
      barcode, rfidTag, location, publisher,
      publicationYear, pages,
      language: language || 'English',
      condition: condition || 'Good',
      price: price || 0,
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    });

    await book.save();
    res.status(201).json({ message: 'Book added successfully', book });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Books
exports.getAllBooks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category } = req.query;
    const skip = (page - 1) * limit;

    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can view books' });

    const searchQuery = { branch: admin.branch };
    if (category) searchQuery.category = category;
    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { ISBN: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { rfidTag: { $regex: search, $options: 'i' } }
      ];
    }

    const [books, total] = await Promise.all([
      Book.find(searchQuery)
        .select('-createdBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Book.countDocuments(searchQuery)
    ]);

    res.status(200).json({
      books,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Book By ID
exports.getBookById = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can view book details' });

    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    res.status(200).json({ book });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Book
exports.updateBook = async (req, res) => {
  try {
    const {
      title, author, ISBN, category, totalCopies,
      barcode, rfidTag, location, publisher,
      publicationYear, pages, language, condition, price
    } = req.body;

    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can update books' });

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    if (title) book.title = title;
    if (author) book.author = author;
    if (ISBN) book.ISBN = ISBN;
    if (category) book.category = category;
    if (barcode !== undefined) book.barcode = barcode;
    if (rfidTag !== undefined) book.rfidTag = rfidTag;
    if (location !== undefined) book.location = location;
    if (publisher !== undefined) book.publisher = publisher;
    if (publicationYear !== undefined) book.publicationYear = publicationYear;
    if (pages !== undefined) book.pages = pages;
    if (language !== undefined) book.language = language;
    if (condition !== undefined) book.condition = condition;
    if (price !== undefined) book.price = price;
    if (totalCopies !== undefined) {
      const diff = totalCopies - book.totalCopies;
      book.totalCopies = totalCopies;
      book.availableCopies = Math.max(0, book.availableCopies + diff);
    }

    await book.save();
    res.status(200).json({ message: 'Book updated successfully', book });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Book
exports.deleteBook = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can delete books' });

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    await Book.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
