const Book = require('../../model/Book');
const BookIssue = require('../../model/BookIssue');
const LibraryMember = require('../../model/LibraryMember');
const LibraryStudent = require('../../model/LibraryStudent');
const mongoose = require('mongoose');

const getBranch = (req) => req.user?.branch;
const getClient = (req) => req.user?.client;

const getMatchQuery = (req) => {
  const branch = getBranch(req);
  const client = getClient(req);
  if (branch) return { branch: new mongoose.Types.ObjectId(branch) };
  if (client) return { client: new mongoose.Types.ObjectId(client) };
  return {};
};

// Dashboard — single call, all stats
exports.getLibraryDashboard = async (req, res) => {
  try {
    const branch = getBranch(req);
    const matchQ = getMatchQuery(req);

    await BookIssue.updateMany(
      { ...matchQ, status: 'issued', dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    );

    const [bookStats, issueStats, memberCount, studentCount, recentIssues] = await Promise.all([
      Book.aggregate([{ $match: matchQ }, { $group: { _id: null, totalBooks: { $sum: 1 }, totalCopies: { $sum: '$totalCopies' }, availableCopies: { $sum: '$availableCopies' }, issuedCopies: { $sum: '$issuedCopies' } } }]),
      BookIssue.aggregate([{ $match: matchQ }, { $facet: { issued: [{ $match: { status: 'issued' } }, { $count: 'count' }], returned: [{ $match: { status: 'returned' } }, { $count: 'count' }], overdue: [{ $match: { status: 'overdue' } }, { $count: 'count' }], totalFine: [{ $group: { _id: null, total: { $sum: '$fine' } } }] } }]),
      LibraryMember.countDocuments(matchQ),
      LibraryStudent.countDocuments(matchQ),
      BookIssue.find({ ...matchQ, status: { $in: ['issued', 'overdue'] } }).populate('book', 'title author').populate('member', 'name memberId').sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const b = bookStats[0] || {};
    const i = issueStats[0] || {};

    res.status(200).json({
      success: true,
      data: {
        books: {
          total: b.totalBooks || 0,
          totalCopies: b.totalCopies || 0,
          availableCopies: b.availableCopies || 0,
          issuedCopies: b.issuedCopies || 0
        },
        issues: {
          issued: i.issued?.[0]?.count || 0,
          returned: i.returned?.[0]?.count || 0,
          overdue: i.overdue?.[0]?.count || 0,
          totalFine: i.totalFine?.[0]?.total || 0
        },
        members: memberCount,
        students: studentCount,
        recentIssues
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stats with category breakdown
exports.getLibraryStats = async (req, res) => {
  try {
    const branch = getBranch(req);

    const [bookStats, issueStats, categoryStats] = await Promise.all([
      Book.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(branch) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalCopies: { $sum: '$totalCopies' },
            availableCopies: { $sum: '$availableCopies' }
          }
        }
      ]),
      BookIssue.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(branch) } },
        {
          $facet: {
            issued: [{ $match: { status: 'issued' } }, { $count: 'count' }],
            returned: [{ $match: { status: 'returned' } }, { $count: 'count' }],
            overdue: [{ $match: { status: 'overdue' } }, { $count: 'count' }]
          }
        }
      ]),
      Book.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(branch) } },
        { $group: { _id: '$category', count: { $sum: 1 }, copies: { $sum: '$totalCopies' } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const b = bookStats[0] || {};
    const i = issueStats[0] || {};

    res.status(200).json({
      success: true,
      data: {
        books: {
          total: b.total || 0,
          totalCopies: b.totalCopies || 0,
          availableCopies: b.availableCopies || 0,
          byCategory: categoryStats
        },
        issues: {
          issued: i.issued?.[0]?.count || 0,
          returned: i.returned?.[0]?.count || 0,
          overdue: i.overdue?.[0]?.count || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Overdue books — for DueDateAlerts page
exports.getOverdueBooks = async (req, res) => {
  try {
    const matchQ = getMatchQuery(req);
    const now = new Date();

    await BookIssue.updateMany({ ...matchQ, status: 'issued', dueDate: { $lt: now } }, { $set: { status: 'overdue' } });

    const overdue = await BookIssue.find({ ...matchQ, status: 'overdue' })
      .populate('book', 'title author')
      .populate('member', 'name email memberId')
      .sort({ dueDate: 1 })
      .lean();

    const result = overdue.map(item => {
      const daysOverdue = Math.ceil((now - new Date(item.dueDate)) / (1000 * 60 * 60 * 24));
      const fine = daysOverdue * (item.finePerDay || 5);
      return {
        _id: item._id,
        bookTitle: item.book?.title || '',
        bookAuthor: item.book?.author || '',
        memberName: item.member?.name || '',
        memberEmail: item.member?.email || '',
        memberId: item.member?.memberId || '',
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        daysOverdue,
        fine,
        renewalCount: item.renewalCount || 0
      };
    });

    res.status(200).json({ success: true, data: result, total: result.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Extend due date — for DueDateAlerts page
exports.extendDueDate = async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const branch = getBranch(req);

    const issue = await BookIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue record not found' });
    if (issue.branch.toString() !== branch.toString()) return res.status(403).json({ message: 'Access denied' });
    if (issue.status === 'returned') return res.status(400).json({ message: 'Book already returned' });

    const newDueDate = new Date(issue.dueDate);
    newDueDate.setDate(newDueDate.getDate() + parseInt(days));
    issue.dueDate = newDueDate;
    issue.renewalCount = (issue.renewalCount || 0) + 1;

    // If extended beyond today, mark back to issued
    if (newDueDate > new Date()) issue.status = 'issued';

    await issue.save();
    res.status(200).json({ success: true, message: `Due date extended by ${days} days`, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// All issued books list
exports.getIssuedBooks = async (req, res) => {
  try {
    const matchQ = getMatchQuery(req);
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const [issued, total] = await Promise.all([
      BookIssue.find({ ...matchQ, status: { $in: ['issued', 'overdue'] } })
        .populate('book', 'title author ISBN barcode')
        .populate('member', 'name email memberId')
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BookIssue.countDocuments({ ...matchQ, status: { $in: ['issued', 'overdue'] } })
    ]);

    res.status(200).json({
      success: true,
      data: issued,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Books list (optimized for admin panel)
exports.getBooks = async (req, res) => {
  try {
    const matchQ = getMatchQuery(req);
    const { page = 1, limit = 20, search = '', category } = req.query;
    const skip = (page - 1) * limit;

    const query = { ...matchQ };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { ISBN: { $regex: search, $options: 'i' } },
      ];
    }

    const [books, total] = await Promise.all([
      Book.find(query)
        .select('title author ISBN category totalCopies availableCopies issuedCopies barcode rfidTag location condition createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Book.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: books,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Members list (optimized)
exports.getMembers = async (req, res) => {
  try {
    const matchQ = getMatchQuery(req);
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { ...matchQ };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    const [members, total] = await Promise.all([
      LibraryMember.find(query)
        .select('name email phone memberId status joiningDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LibraryMember.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: members,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
