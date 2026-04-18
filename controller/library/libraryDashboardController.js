const Book = require('../../model/Book');
const BookIssue = require('../../model/BookIssue');
const LibraryMember = require('../../model/LibraryMember');
const LibraryStudent = require('../../model/LibraryStudent');

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.userId;
    const admin = await require('../../model/Admin').findById(userId);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    const branch = admin.branch;
    const client = admin.client;
    
    // Get total books count (without branch/client filter if not set)
    const bookQuery = {};
    if (branch) bookQuery.branch = branch;
    if (client) bookQuery.client = client;
    const totalBooks = await Book.countDocuments(bookQuery);
    
    // Get available books count
    const availableBooks = await Book.countDocuments({ 
      ...bookQuery,
      availableCopies: { $gt: 0 }
    });
    
    // Get total members count
    const memberQuery = {};
    if (branch) memberQuery.branch = branch;
    if (client) memberQuery.client = client;
    memberQuery.status = true;
    const totalMembers = await LibraryMember.countDocuments(memberQuery);
    
    // Get total students count
    const studentQuery = {};
    if (branch) studentQuery.branch = branch;
    if (client) studentQuery.client = client;
    const totalStudents = await LibraryStudent.countDocuments(studentQuery);
    
    // Get currently issued books count
    const issueQuery = {};
    if (branch) issueQuery.branch = branch;
    if (client) issueQuery.client = client;
    issueQuery.status = 'issued';
    const issuedBooks = await BookIssue.countDocuments(issueQuery);
    
    // Get overdue books count
    const overdueQuery = { ...issueQuery, dueDate: { $lt: new Date() } };
    const overdueBooks = await BookIssue.countDocuments(overdueQuery);
    
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayIssued = await BookIssue.countDocuments({
      ...issueQuery,
      issueDate: { $gte: today, $lt: tomorrow }
    });
    
    const todayReturned = await BookIssue.countDocuments({
      ...(branch && client ? { branch, client } : {}),
      returnDate: { $gte: today, $lt: tomorrow }
    });
    
    // Calculate total fines
    const fineMatch = {};
    if (branch) fineMatch.branch = branch;
    if (client) fineMatch.client = client;
    fineMatch.fine = { $gt: 0 };
    
    const fineData = await BookIssue.aggregate([
      { $match: fineMatch },
      { $group: { _id: null, totalFine: { $sum: '$fine' } } }
    ]);
    
    const totalFine = fineData.length > 0 ? fineData[0].totalFine : 0;

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        availableBooks,
        issuedBooks: totalBooks - availableBooks,
        totalMembers,
        totalStudents,
        overdueBooks,
        todayIssued,
        todayReturned,
        totalFine
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.getRecentActivities = async (req, res) => {
  try {
    const userId = req.userId;
    const admin = await require('../../model/Admin').findById(userId);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    const branch = admin.branch;
    const client = admin.client;
    
    // Get recent book issues and returns
    const issueQuery = {};
    if (branch) issueQuery.branch = branch;
    if (client) issueQuery.client = client;
    
    const recentIssues = await BookIssue.find(issueQuery)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('book', 'title')
    .populate('member', 'name')
    .lean();
    
    const activities = recentIssues.map(issue => ({
      action: issue.status === 'returned' ? 'Book Returned' : 'Book Issued',
      details: `${issue.book?.title || 'Unknown Book'} - ${issue.member?.name || 'Unknown Member'}`,
      time: getTimeAgo(issue.createdAt),
      type: issue.status === 'returned' ? 'return' : 'issue'
    }));

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.getOverdueBooks = async (req, res) => {
  try {
    const userId = req.userId;
    const admin = await require('../../model/Admin').findById(userId);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    const branch = admin.branch;
    const client = admin.client;
    
    const overdueQuery = {};
    if (branch) overdueQuery.branch = branch;
    if (client) overdueQuery.client = client;
    overdueQuery.status = 'issued';
    overdueQuery.dueDate = { $lt: new Date() };
    
    const overdueBooks = await BookIssue.find(overdueQuery)
    .populate('book', 'title')
    .populate('member', 'name')
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();
    
    const formattedBooks = overdueBooks.map(issue => {
      const daysOverdue = Math.ceil((new Date() - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));
      return {
        title: issue.book?.title || 'Unknown Book',
        member: issue.member?.name || 'Unknown Member',
        dueDate: new Date(issue.dueDate).toISOString().split('T')[0],
        daysOverdue
      };
    });

    res.status(200).json({
      success: true,
      data: formattedBooks
    });
  } catch (error) {
    console.error('Overdue books error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.getPopularBooks = async (req, res) => {
  try {
    const userId = req.userId;
    const admin = await require('../../model/Admin').findById(userId);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    const branch = admin.branch;
    const client = admin.client;
    
    const matchQuery = {};
    if (branch) matchQuery.branch = branch;
    if (client) matchQuery.client = client;
    
    const popularBooks = await BookIssue.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$book',
          issueCount: { $sum: 1 }
        }
      },
      {
        $sort: { issueCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      {
        $unwind: '$bookDetails'
      },
      {
        $project: {
          title: '$bookDetails.title',
          author: '$bookDetails.author',
          category: '$bookDetails.category',
          issued: '$issueCount'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: popularBooks
    });
  } catch (error) {
    console.error('Popular books error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
}

module.exports = exports;
