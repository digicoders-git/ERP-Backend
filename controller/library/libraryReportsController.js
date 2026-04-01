const Book = require('../../model/Book');
const BookIssue = require('../../model/BookIssue');
const LibraryMember = require('../../model/LibraryMember');
const LibraryStudent = require('../../model/LibraryStudent');
const Admin = require('../../model/Admin');
const mongoose = require('mongoose');

const getAdmin = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin || admin.role !== 'libraryAdmin') return null;
  return admin;
};

// Executive Report — all KPIs in one call
exports.getExecutiveReport = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const branch = new mongoose.Types.ObjectId(admin.branch);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Auto-mark overdue
    await BookIssue.updateMany(
      { branch: admin.branch, status: 'issued', dueDate: { $lt: now } },
      { $set: { status: 'overdue' } }
    );

    const [bookStats, issueStats, memberCount, studentCount, monthlyIssues, fineStats] = await Promise.all([
      Book.aggregate([
        { $match: { branch } },
        { $group: { _id: null, totalBooks: { $sum: 1 }, totalCopies: { $sum: '$totalCopies' }, availableCopies: { $sum: '$availableCopies' }, issuedCopies: { $sum: '$issuedCopies' }, totalValue: { $sum: { $multiply: ['$price', '$totalCopies'] } } } }
      ]),
      BookIssue.aggregate([
        { $match: { branch } },
        { $facet: {
          issued: [{ $match: { status: 'issued' } }, { $count: 'count' }],
          returned: [{ $match: { status: 'returned' } }, { $count: 'count' }],
          overdue: [{ $match: { status: 'overdue' } }, { $count: 'count' }],
          totalFine: [{ $group: { _id: null, total: { $sum: '$fine' } } }]
        }}
      ]),
      LibraryMember.countDocuments({ branch: admin.branch }),
      LibraryStudent.countDocuments({ branch: admin.branch }),
      BookIssue.countDocuments({ branch: admin.branch, createdAt: { $gte: thisMonthStart } }),
      BookIssue.aggregate([
        { $match: { branch, status: 'returned' } },
        { $group: { _id: null, totalFine: { $sum: '$fine' } } }
      ])
    ]);

    const b = bookStats[0] || {};
    const i = issueStats[0] || {};
    const utilization = b.totalCopies > 0 ? parseFloat(((b.issuedCopies / b.totalCopies) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalBooks: b.totalBooks || 0,
        totalCopies: b.totalCopies || 0,
        availableCopies: b.availableCopies || 0,
        issuedCopies: b.issuedCopies || 0,
        totalValue: b.totalValue || 0,
        bookUtilization: utilization,
        totalMembers: memberCount,
        totalStudents: studentCount,
        activeIssues: i.issued?.[0]?.count || 0,
        totalReturned: i.returned?.[0]?.count || 0,
        overdueBooks: i.overdue?.[0]?.count || 0,
        totalFines: fineStats[0]?.totalFine || 0,
        monthlyIssues,
        revenueGenerated: fineStats[0]?.totalFine || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Circulation Report — category-wise + monthly trend
exports.getCirculationReport = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const branch = new mongoose.Types.ObjectId(admin.branch);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [categoryWise, monthlyTrend, topBooks] = await Promise.all([
      BookIssue.aggregate([
        { $match: { branch } },
        { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'bookInfo' } },
        { $unwind: { path: '$bookInfo', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$bookInfo.category',
          issues: { $sum: 1 },
          returns: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } }
        }},
        { $sort: { issues: -1 } }
      ]),
      BookIssue.aggregate([
        { $match: { branch, createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
        { $group: { _id: { $month: '$createdAt' }, issues: { $sum: 1 }, returns: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } } } },
        { $sort: { _id: 1 } }
      ]),
      BookIssue.aggregate([
        { $match: { branch } },
        { $group: { _id: '$book', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'bookInfo' } },
        { $unwind: '$bookInfo' },
        { $project: { title: '$bookInfo.title', author: '$bookInfo.author', issues: '$count' } }
      ])
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const totalIssues = categoryWise.reduce((s, c) => s + c.issues, 0);
    const categoryFormatted = categoryWise.map(c => ({
      category: c._id || 'Unknown',
      issues: c.issues,
      returns: c.returns,
      percentage: totalIssues > 0 ? parseFloat(((c.issues / totalIssues) * 100).toFixed(1)) : 0
    }));

    const monthlyFormatted = monthlyTrend.map(m => ({
      month: monthNames[m._id - 1],
      issues: m.issues,
      returns: m.returns
    }));

    res.status(200).json({
      success: true,
      data: { categoryWise: categoryFormatted, monthlyTrend: monthlyFormatted, topBooks, year }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Financial Report — fine collection monthly
exports.getFinancialReport = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const branch = new mongoose.Types.ObjectId(admin.branch);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [monthlyFines, totalStats, overdueStats] = await Promise.all([
      BookIssue.aggregate([
        { $match: { branch, status: 'returned', fine: { $gt: 0 }, returnDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
        { $group: { _id: { $month: '$returnDate' }, fineCollection: { $sum: '$fine' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      BookIssue.aggregate([
        { $match: { branch } },
        { $group: { _id: null, totalFine: { $sum: '$fine' }, collectedFine: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, '$fine', 0] } }, pendingFine: { $sum: { $cond: [{ $ne: ['$status', 'returned'] }, '$fine', 0] } } } }
      ]),
      BookIssue.countDocuments({ branch: admin.branch, status: 'overdue' })
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyFormatted = monthlyFines.map(m => ({
      month: monthNames[m._id - 1],
      fineCollection: m.fineCollection,
      count: m.count
    }));

    const t = totalStats[0] || {};

    res.status(200).json({
      success: true,
      data: {
        totalFine: t.totalFine || 0,
        collectedFine: t.collectedFine || 0,
        pendingFine: t.pendingFine || 0,
        overdueCount: overdueStats,
        monthlyFines: monthlyFormatted,
        year
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Inventory Report — category distribution + top performers
exports.getInventoryReport = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const branch = new mongoose.Types.ObjectId(admin.branch);

    const [categoryDist, topPerformers, conditionWise, totalStats] = await Promise.all([
      Book.aggregate([
        { $match: { branch } },
        { $group: { _id: '$category', count: { $sum: 1 }, copies: { $sum: '$totalCopies' }, value: { $sum: { $multiply: ['$price', '$totalCopies'] } } } },
        { $sort: { count: -1 } }
      ]),
      Book.aggregate([
        { $match: { branch } },
        { $lookup: { from: 'bookissues', localField: '_id', foreignField: 'book', as: 'issues' } },
        { $addFields: { issueCount: { $size: '$issues' } } },
        { $sort: { issueCount: -1 } },
        { $limit: 5 },
        { $project: { title: 1, author: 1, category: 1, issueCount: 1, availableCopies: 1, totalCopies: 1 } }
      ]),
      Book.aggregate([
        { $match: { branch } },
        { $group: { _id: '$condition', count: { $sum: 1 } } }
      ]),
      Book.aggregate([
        { $match: { branch } },
        { $group: { _id: null, total: { $sum: 1 }, totalCopies: { $sum: '$totalCopies' }, totalValue: { $sum: { $multiply: ['$price', '$totalCopies'] } } } }
      ])
    ]);

    const totalBooks = totalStats[0]?.total || 0;
    const categoryFormatted = categoryDist.map(c => ({
      name: c._id || 'Unknown',
      count: c.count,
      copies: c.copies,
      value: c.value,
      percentage: totalBooks > 0 ? parseFloat(((c.count / totalBooks) * 100).toFixed(1)) : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        totalCopies: totalStats[0]?.totalCopies || 0,
        totalValue: totalStats[0]?.totalValue || 0,
        categoryDistribution: categoryFormatted,
        topPerformers,
        conditionWise
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
