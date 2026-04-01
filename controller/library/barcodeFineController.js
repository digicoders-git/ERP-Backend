const Book = require('../../model/Book');
const BookIssue = require('../../model/BookIssue');
const BookLimit = require('../../model/BookLimit');
const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const Notification = require('../../model/Notification');
const { successResponse, errorResponse } = require('../../responseFormatter');

// ─── BARCODE SCANNING - SCAN BOOK ─────────────────────────────────────────────

exports.scanBookByBarcode = async (req, res) => {
  try {
    const { barcode, scanType } = req.body; // scanType: 'issue' | 'return' | 'search'
    
    if (!barcode) {
      return errorResponse(res, 'Barcode is required', 400);
    }

    // Find book by barcode or ISBN
    const book = await Book.findOne({
      $or: [
        { barcode: barcode },
        { ISBN: barcode }
      ]
    }).lean();

    if (!book) {
      return errorResponse(res, 'Book not found with this barcode', 404);
    }

    const bookData = {
      id: book._id,
      title: book.title,
      author: book.author,
      ISBN: book.ISBN,
      barcode: book.barcode,
      category: book.category,
      available: book.available,
      shelfLocation: book.shelfLocation,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies
    };

    return successResponse(res, {
      book: bookData,
      scanType: scanType || 'search'
    }, 'Book found');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── ISSUE BOOK WITH BARCODE ───────────────────────────────────────────────────

exports.issueBookByBarcode = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    const { bookBarcode, memberId, dueDate } = req.body;
    
    if (!bookBarcode || !memberId) {
      return errorResponse(res, 'bookBarcode and memberId are required', 400);
    }

    // Find book by barcode
    const book = await Book.findOne({
      $or: [{ barcode: bookBarcode }, { ISBN: bookBarcode }]
    });
    if (!book) return errorResponse(res, 'Book not found', 404);

    if (book.availableCopies <= 0) {
      return errorResponse(res, 'No copies available for issue', 400);
    }

    // Find member
    const student = await Student.findById(memberId).lean();
    if (!student) return errorResponse(res, 'Member not found', 404);

    // Check if already issued
    const existingIssue = await BookIssue.findOne({
      book: book._id,
      member: memberId,
      status: { $in: ['issued', 'overdue'] }
    });
    if (existingIssue) {
      return errorResponse(res, 'Member already has this book issued', 400);
    }

    // Check member's issue limit
    const issueLimit = await BookLimit.findOne({ 
      memberType: student.class ? 'student' : 'teacher' 
    }).lean();
    const limit = issueLimit?.issueLimit || 3;

    const currentIssues = await BookIssue.countDocuments({
      member: memberId,
      status: { $in: ['issued', 'overdue'] }
    });
    if (currentIssues >= limit) {
      return errorResponse(res, `Issue limit reached (${limit} books)`, 400);
    }

    // Calculate due date
    const days = issueLimit?.issueDays || 14;
    const calculatedDueDate = dueDate || new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Create issue record
    const issue = new BookIssue({
      book: book._id,
      member: memberId,
      issueDate: new Date(),
      dueDate: calculatedDueDate,
      status: 'issued',
      issuedBy: admin._id,
      branch: admin.branch,
      client: admin.client
    });

    await issue.save();

    // Update book availability
    book.availableCopies -= 1;
    if (book.availableCopies <= 0) book.available = false;
    await book.save();

    return successResponse(res, {
      issueId: issue._id,
      bookTitle: book.title,
      memberName: `${student.firstName} ${student.lastName}`,
      issueDate: issue.issueDate,
      dueDate: issue.dueDate,
      availableCopies: book.availableCopies
    }, 'Book issued successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── RETURN BOOK WITH BARCODE ─────────────────────────────────────────────────

exports.returnBookByBarcode = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    const { bookBarcode, memberId } = req.body;
    
    if (!bookBarcode || !memberId) {
      return errorResponse(res, 'bookBarcode and memberId are required', 400);
    }

    // Find book
    const book = await Book.findOne({
      $or: [{ barcode: bookBarcode }, { ISBN: bookBarcode }]
    });
    if (!book) return errorResponse(res, 'Book not found', 404);

    // Find active issue
    const issue = await BookIssue.findOne({
      book: book._id,
      member: memberId,
      status: { $in: ['issued', 'overdue'] }
    }).populate('member', 'firstName lastName');

    if (!issue) {
      return errorResponse(res, 'No active issue found for this book', 404);
    }

    // Calculate fine if overdue
    const today = new Date();
    const dueDate = new Date(issue.dueDate);
    let fine = 0;

    if (today > dueDate) {
      const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      const fineRate = 5; // Rs. 5 per day
      fine = daysOverdue * fineRate;
    }

    // Update issue
    issue.returnDate = today;
    issue.status = 'returned';
    issue.fine = fine;
    issue.returnedTo = admin._id;

    await issue.save();

    // Update book availability
    book.availableCopies += 1;
    book.available = true;
    await book.save();

    return successResponse(res, {
      issueId: issue._id,
      bookTitle: book.title,
      memberName: `${issue.member.firstName} ${issue.member.lastName}`,
      issueDate: issue.issueDate,
      returnDate: issue.returnDate,
      daysBorrowed: Math.ceil((today - issue.issueDate) / (1000 * 60 * 60 * 24)),
      fine,
      message: fine > 0 ? `Book returned with fine of Rs. ${fine}` : 'Book returned successfully'
    }, 'Book returned successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── AUTO CALCULATE & UPDATE OVERDUE FINES ───────────────────────────────────

exports.calculateOverdueFines = async (req, res) => {
  try {
    const { batchSize = 100 } = req.query;
    const today = new Date();
    const fineRate = 5; // Rs. 5 per day

    // Find all overdue issues
    const overdueIssues = await BookIssue.find({
      status: 'issued',
      dueDate: { $lt: today }
    })
      .populate('book', 'title')
      .populate('member', 'firstName lastName email')
      .limit(parseInt(batchSize))
      .lean();

    if (overdueIssues.length === 0) {
      return successResponse(res, { processed: 0, fines: [] }, 'No overdue books found');
    }

    const fines = [];
    const updates = [];

    for (const issue of overdueIssues) {
      const daysOverdue = Math.ceil((today - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));
      const fine = daysOverdue * fineRate;

      fines.push({
        issueId: issue._id,
        bookTitle: issue.book?.title,
        memberName: `${issue.member?.firstName} ${issue.member?.lastName}`,
        memberEmail: issue.member?.email,
        daysOverdue,
        fine
      });

      updates.push({
        updateOne: {
          filter: { _id: issue._id },
          update: { 
            $set: { 
              fine,
              status: 'overdue'
            }
          }
        }
      });
    }

    // Bulk update
    await BookIssue.bulkWrite(updates);

    return successResponse(res, {
      processed: overdueIssues.length,
      totalFine: fines.reduce((sum, f) => sum + f.fine, 0),
      fines
    }, 'Overdue fines calculated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── SEND OVERDUE NOTIFICATIONS ───────────────────────────────────────────────

exports.sendOverdueNotifications = async (req, res) => {
  try {
    const { daysThreshold = 7 } = req.query; // Notify if overdue > 7 days
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // Find overdue issues > threshold days
    const overdueIssues = await BookIssue.find({
      status: 'overdue',
      dueDate: { $lt: thresholdDate }
    })
      .populate('book', 'title')
      .populate('member', 'firstName lastName email mobile')
      .lean();

    if (overdueIssues.length === 0) {
      return successResponse(res, { sent: 0 }, 'No notifications to send');
    }

    const notifications = [];

    for (const issue of overdueIssues) {
      const message = `Reminder: Book "${issue.book?.title}" is ${daysThreshold} days overdue. Fine: Rs. ${issue.fine || 0}`;

      const notification = new Notification({
        recipientId: issue.member?._id,
        recipientType: 'student',
        senderId: req.userId,
        subject: 'Book Overdue Reminder',
        message,
        type: 'overdue_alert',
        priority: 'high',
        status: 'unread',
        branch: issue.member?.branch,
        client: issue.member?.client,
        createdAt: new Date()
      });

      await notification.save();
      notifications.push({
        memberId: issue.member?._id,
        memberName: `${issue.member?.firstName} ${issue.member?.lastName}`,
        email: issue.member?.email,
        message
      });

      // In production, send SMS/Email
      // await sendSMS(issue.member?.mobile, message);
      // await sendEmail(issue.member?.email, 'Book Overdue', message);
    }

    return successResponse(res, {
      sent: notifications.length,
      notifications
    }, 'Overdue notifications sent');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── FINE WAIVER ─────────────────────────────────────────────────────────────

exports.waiveFine = async (req, res) => {
  try {
    const { issueId, amount, reason } = req.body;
    
    if (!issueId || amount === undefined) {
      return errorResponse(res, 'issueId and amount are required', 400);
    }

    const issue = await BookIssue.findById(issueId);
    if (!issue) return errorResponse(res, 'Issue record not found', 404);

    const waivedAmount = Math.min(amount, issue.fine);
    issue.fine -= waivedAmount;
    issue.fineWaived = waivedAmount;
    issue.fineWaiverReason = reason;
    issue.fineWaivedBy = req.userId;
    issue.fineWaivedAt = new Date();

    await issue.save();

    return successResponse(res, {
      issueId: issue._id,
      originalFine: issue.fine + waivedAmount,
      waivedAmount,
      remainingFine: issue.fine,
      reason
    }, 'Fine waived successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── COLLECT FINE ─────────────────────────────────────────────────────────────

exports.collectFine = async (req, res) => {
  try {
    const { issueId, amount, paymentMode = 'cash' } = req.body;
    
    if (!issueId || !amount) {
      return errorResponse(res, 'issueId and amount are required', 400);
    }

    const issue = await BookIssue.findById(issueId);
    if (!issue) return errorResponse(res, 'Issue record not found', 404);

    if (amount > issue.fine) {
      return errorResponse(res, 'Amount exceeds pending fine', 400);
    }

    issue.fineCollected = (issue.fineCollected || 0) + amount;
    issue.fine -= amount;
    issue.finePaymentDate = new Date();
    issue.finePaymentMode = paymentMode;

    await issue.save();

    return successResponse(res, {
      issueId: issue._id,
      collectedAmount: amount,
      remainingFine: issue.fine,
      totalCollected: issue.fineCollected,
      paymentMode
    }, 'Fine collected successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── FINE REPORT ─────────────────────────────────────────────────────────────

exports.getFineReport = async (req, res) => {
  try {
    const { startDate, endDate, branch } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.finePaymentDate = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    const [collectedFines, pendingFines, overdueBooks] = await Promise.all([
      // Collected fines
      BookIssue.aggregate([
        { $match: { fineCollected: { $gt: 0 }, ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$fineCollected' }, count: { $sum: 1 } } }
      ]),
      // Pending fines
      BookIssue.aggregate([
        { $match: { fine: { $gt: 0 }, status: { $in: ['issued', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$fine' }, count: { $sum: 1 } } }
      ]),
      // Overdue books
      BookIssue.find({
        status: 'overdue',
        dueDate: { $lt: new Date() }
      })
        .populate('book', 'title')
        .populate('member', 'firstName lastName class')
        .sort({ dueDate: 1 })
        .limit(20)
        .lean()
    ]);

    return successResponse(res, {
      summary: {
        totalCollected: collectedFines[0]?.total || 0,
        collectedCount: collectedFines[0]?.count || 0,
        totalPending: pendingFines[0]?.total || 0,
        pendingCount: pendingFines[0]?.count || 0,
        overdueBooksCount: overdueBooks.length
      },
      overdueBooks: overdueBooks.map(b => ({
        bookTitle: b.book?.title,
        memberName: `${b.member?.firstName} ${b.member?.lastName}`,
        class: b.member?.class,
        dueDate: b.dueDate,
        daysOverdue: Math.ceil((new Date() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24)),
        fine: b.fine
      }))
    }, 'Fine report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── QUICK SCAN ACTION ────────────────────────────────────────────────────────

exports.quickScanAction = async (req, res) => {
  try {
    const { barcode, action, memberId } = req.body;
    
    // action: 'issue', 'return', 'check-status'
    if (!barcode || !action) {
      return errorResponse(res, 'barcode and action are required', 400);
    }

    // Find book
    const book = await Book.findOne({
      $or: [{ barcode }, { ISBN: barcode }]
    }).lean();

    if (!book) {
      return errorResponse(res, 'Book not found', 404);
    }

    let result = {
      book: {
        title: book.title,
        author: book.author,
        available: book.available,
        availableCopies: book.availableCopies
      }
    };

    switch (action) {
      case 'issue':
        if (memberId) {
          // Check availability
          if (book.availableCopies <= 0) {
            return errorResponse(res, 'Book not available', 400);
          }
          result.message = 'Ready to issue';
          result.action = 'issue';
        } else {
          result.message = 'Member ID required for issue';
        }
        break;

      case 'return':
        // Find if book is issued
        const issue = await BookIssue.findOne({
          book: book._id,
          status: { $in: ['issued', 'overdue'] }
        }).populate('member', 'firstName lastName');

        if (issue) {
          result.action = 'return';
          result.issuedTo = `${issue.member?.firstName} ${issue.member?.lastName}`;
          result.dueDate = issue.dueDate;
          result.fine = issue.fine || 0;
          result.message = 'Book can be returned';
        } else {
          result.message = 'Book not currently issued';
        }
        break;

      case 'check-status':
      default:
        const activeIssue = await BookIssue.findOne({
          book: book._id,
          status: { $in: ['issued', 'overdue'] }
        }).populate('member', 'firstName lastName');

        if (activeIssue) {
          result.status = 'issued';
          result.issuedTo = `${activeIssue.member?.firstName} ${activeIssue.member?.lastName}`;
          result.dueDate = activeIssue.dueDate;
        } else {
          result.status = 'available';
        }
        break;
    }

    return successResponse(res, result, 'Scan complete');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

module.exports = exports;
