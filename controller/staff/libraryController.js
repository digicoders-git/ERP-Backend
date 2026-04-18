const Book = require('../../model/Book');
const BookIssue = require('../../model/BookIssue');
const LibraryCard = require('../../model/LibraryCard');
const LibraryMember = require('../../model/LibraryMember');
const BookRequest = require('../../model/BookRequest');
const LibraryStudent = require('../../model/LibraryStudent');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const { successResponse, errorResponse } = require('../../responseFormatter');

const getUserContext = async (userId) => {
  let user = await Admin.findById(userId).select('branch client').lean();
  if (!user) {
    user = await Staff.findById(userId).select('branch client').lean();
  }
  return user;
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const query = { branch: currentUser.branch, client: currentUser.client };

    // Total Books
    const totalBooks = await Book.countDocuments(query);
    
    // Available Books
    const availableBooks = await Book.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$availableCopies' } } }
    ]);

    // Issued Books
    const issuedBooks = await BookIssue.countDocuments({ 
      ...query, 
      status: 'issued' 
    });

    // Overdue Books
    const overdueBooks = await BookIssue.countDocuments({ 
      ...query, 
      status: 'overdue' 
    });

    // Total Members
    const totalMembers = await LibraryMember.countDocuments({ 
      ...query, 
      status: true 
    });

    // Active Library Cards
    const activeCards = await LibraryCard.countDocuments({ 
      ...query, 
      status: 'Active' 
    });

    // Pending Book Requests
    const pendingRequests = await BookRequest.countDocuments({ 
      ...query, 
      status: 'pending' 
    });

    // Total Students Enrolled
    const totalStudents = await LibraryStudent.countDocuments(query);

    // Total Fine Collected (this month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fineCollected = await BookIssue.aggregate([
      { 
        $match: { 
          ...query, 
          returnDate: { $gte: startOfMonth },
          fine: { $gt: 0 }
        } 
      },
      { $group: { _id: null, total: { $sum: '$fine' } } }
    ]);

    // Books by Category
    const booksByCategory = await Book.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Recent Issues (Last 10)
    const recentIssues = await BookIssue.find(query)
      .populate('book', 'title author ISBN')
      .populate('member', 'name memberId')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Books Due Soon (Next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const booksDueSoon = await BookIssue.countDocuments({
      ...query,
      status: 'issued',
      dueDate: { $lte: nextWeek, $gte: new Date() }
    });

    const stats = {
      totalBooks,
      availableBooks: availableBooks[0]?.total || 0,
      issuedBooks,
      overdueBooks,
      totalMembers,
      activeCards,
      pendingRequests,
      totalStudents,
      fineCollected: fineCollected[0]?.total || 0,
      booksDueSoon,
      booksByCategory: booksByCategory.map(cat => ({
        category: cat._id,
        count: cat.count
      })),
      recentIssues: recentIssues.map(issue => ({
        _id: issue._id,
        bookTitle: issue.book?.title,
        bookAuthor: issue.book?.author,
        memberName: issue.member?.name,
        memberId: issue.member?.memberId,
        issueDate: issue.issueDate,
        dueDate: issue.dueDate,
        status: issue.status,
        fine: issue.fine
      }))
    };

    return successResponse(res, stats, 'Dashboard stats fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get All Books (Read-only)
exports.getAllBooks = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const { category, search, page = 1, limit = 20 } = req.query;
    const query = { branch: currentUser.branch, client: currentUser.client };

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { ISBN: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Book.countDocuments(query);

    return successResponse(res, {
      books,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBooks: count
    }, 'Books fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Book by ID
exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return errorResponse(res, 'Book not found', 404);

    return successResponse(res, book, 'Book fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get All Book Issues
exports.getAllBookIssues = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { branch: currentUser.branch, client: currentUser.client };

    if (status) query.status = status;
    if (search) {
      const members = await LibraryMember.find({
        branch: currentUser.branch,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { memberId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const books = await Book.find({
        branch: currentUser.branch,
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { ISBN: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      query.$or = [
        { member: { $in: members.map(m => m._id) } },
        { book: { $in: books.map(b => b._id) } }
      ];
    }

    const issues = await BookIssue.find(query)
      .populate('book', 'title author ISBN barcode')
      .populate('member', 'name memberId email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await BookIssue.countDocuments(query);

    return successResponse(res, {
      issues,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalIssues: count
    }, 'Book issues fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get All Library Cards
exports.getAllLibraryCards = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { branch: currentUser.branch, client: currentUser.client };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { cardId: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { studentName: { $regex: search, $options: 'i' } }
      ];
    }

    const cards = await LibraryCard.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await LibraryCard.countDocuments(query);

    return successResponse(res, {
      cards,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCards: count
    }, 'Library cards fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get All Library Members
exports.getAllMembers = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { branch: currentUser.branch, client: currentUser.client };

    if (status !== undefined) query.status = status === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await LibraryMember.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await LibraryMember.countDocuments(query);

    return successResponse(res, {
      members,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalMembers: count
    }, 'Library members fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get All Library Students
exports.getAllStudents = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const { search, page = 1, limit = 20 } = req.query;
    const query = { branch: currentUser.branch, client: currentUser.client };

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { class: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await LibraryStudent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await LibraryStudent.countDocuments(query);

    return successResponse(res, {
      students,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalStudents: count
    }, 'Library students fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get All Book Requests
exports.getAllBookRequests = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { branch: currentUser.branch, client: currentUser.client };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { bookTitle: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { requestedBy: { $regex: search, $options: 'i' } }
      ];
    }

    const requests = await BookRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await BookRequest.countDocuments(query);

    return successResponse(res, {
      requests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalRequests: count
    }, 'Book requests fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Overdue Books
exports.getOverdueBooks = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const overdueIssues = await BookIssue.find({
      branch: currentUser.branch,
      client: currentUser.client,
      status: 'overdue'
    })
      .populate('book', 'title author ISBN')
      .populate('member', 'name memberId email phone')
      .sort({ dueDate: 1 })
      .lean();

    return successResponse(res, overdueIssues, 'Overdue books fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Books Due Soon (Next 7 days)
exports.getBooksDueSoon = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const dueSoonIssues = await BookIssue.find({
      branch: currentUser.branch,
      client: currentUser.client,
      status: 'issued',
      dueDate: { $gte: today, $lte: nextWeek }
    })
      .populate('book', 'title author ISBN')
      .populate('member', 'name memberId email phone')
      .sort({ dueDate: 1 })
      .lean();

    return successResponse(res, dueSoonIssues, 'Books due soon fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Member Issue History
exports.getMemberIssueHistory = async (req, res) => {
  try {
    const { memberId } = req.params;
    
    const issues = await BookIssue.find({ member: memberId })
      .populate('book', 'title author ISBN')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, issues, 'Member issue history fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Book Issue History
exports.getBookIssueHistory = async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const issues = await BookIssue.find({ book: bookId })
      .populate('member', 'name memberId email')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, issues, 'Book issue history fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Library Reports
exports.getLibraryReports = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const { startDate, endDate } = req.query;
    const query = { branch: currentUser.branch, client: currentUser.client };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Books Issued in Date Range
    const booksIssued = await BookIssue.countDocuments({
      ...query,
      issueDate: query.createdAt
    });

    // Books Returned in Date Range
    const booksReturned = await BookIssue.countDocuments({
      ...query,
      returnDate: { $ne: null },
      returnDate: query.createdAt
    });

    // Fine Collected in Date Range
    const fineCollected = await BookIssue.aggregate([
      { 
        $match: { 
          ...query,
          returnDate: { $ne: null },
          fine: { $gt: 0 }
        } 
      },
      { $group: { _id: null, total: { $sum: '$fine' } } }
    ]);

    // Most Issued Books
    const mostIssuedBooks = await BookIssue.aggregate([
      { $match: query },
      { $group: { _id: '$book', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'bookDetails' } },
      { $unwind: '$bookDetails' }
    ]);

    // Most Active Members
    const mostActiveMembers = await BookIssue.aggregate([
      { $match: query },
      { $group: { _id: '$member', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'librarymembers', localField: '_id', foreignField: '_id', as: 'memberDetails' } },
      { $unwind: '$memberDetails' }
    ]);

    const report = {
      booksIssued,
      booksReturned,
      fineCollected: fineCollected[0]?.total || 0,
      mostIssuedBooks: mostIssuedBooks.map(item => ({
        title: item.bookDetails.title,
        author: item.bookDetails.author,
        issueCount: item.count
      })),
      mostActiveMembers: mostActiveMembers.map(item => ({
        name: item.memberDetails.name,
        memberId: item.memberDetails.memberId,
        issueCount: item.count
      }))
    };

    return successResponse(res, report, 'Library reports fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
