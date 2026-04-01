const BookCategorization = require('../../model/BookCategorization');
const Admin = require('../../model/Admin');

const getAdmin = async (adminId) => {
  const admin = await Admin.findById(adminId).lean();
  if (!admin || admin.role !== 'libraryAdmin') return null;
  return admin;
};

exports.getAll = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const { class: cls, subject, search } = req.query;
    const query = { branch: admin.branch };
    if (cls) query.class = cls;
    if (subject) query.subject = subject;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { bookId: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    const categories = await BookCategorization.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const { bookId, title, class: cls, subject, author, isbn } = req.body;
    if (!bookId || !title || !cls || !subject) {
      return res.status(400).json({ message: 'bookId, title, class and subject are required' });
    }

    const entry = new BookCategorization({
      bookId, title, class: cls, subject, author, isbn,
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    });

    await entry.save();
    res.status(201).json({ success: true, message: 'Category added successfully', data: entry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const entry = await BookCategorization.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Category not found' });
    if (entry.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    const { bookId, title, class: cls, subject, author, isbn } = req.body;
    if (bookId) entry.bookId = bookId;
    if (title) entry.title = title;
    if (cls) entry.class = cls;
    if (subject) entry.subject = subject;
    if (author !== undefined) entry.author = author;
    if (isbn !== undefined) entry.isbn = isbn;

    await entry.save();
    res.status(200).json({ success: true, message: 'Category updated successfully', data: entry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const entry = await BookCategorization.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Category not found' });
    if (entry.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    await BookCategorization.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
