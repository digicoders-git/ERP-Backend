const BookIssue = require('../../model/BookIssue');
const Book = require('../../model/Book');
const LibraryMember = require('../../model/LibraryMember');
const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const { successResponse, errorResponse, paginatedResponse } = require('../../responseFormatter');

// Issue Book
exports.issueBook = async (req, res) => {
  try {
    const { bookId, memberId, studentId, issueDate, dueDate, issueMethod, randomBookId } = req.body;
    const memberIdToUse = memberId || studentId;
    const adminId = req.userId;

    console.log('Issuing book:', { bookId, memberIdToUse, dueDate, randomBookId });

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return errorResponse(res, 'Only library admin can issue books', 403);
    }

    const [book, libraryMember] = await Promise.all([
      Book.findById(bookId),
      LibraryMember.findById(memberIdToUse)
    ]);

    let member = libraryMember;
    let memberType = 'LibraryMember';

    if (!member) {
      member = await Student.findById(memberIdToUse);
      memberType = 'Student';
    }

    console.log('Member found:', member ? memberType : 'Not Found');

    if (!book) return errorResponse(res, 'Book not found in database', 404);
    if (book.availableCopies <= 0) return errorResponse(res, `No copies available for book: ${book.title}`, 400);
    if (!member) return errorResponse(res, `Member not found with ID: ${memberIdToUse}`, 404);
    
    // Check status based on model type
    const isActive = memberType === 'Student' ? (member.status === 'active' || member.status === 'Active') : member.status;
    if (!isActive) return errorResponse(res, `Member account is currently ${member.status || 'inactive'}. Please activate first.`, 400);

    const bookIssue = new BookIssue({
      book: bookId,
      member: memberIdToUse,
      memberType: memberType,
      randomBookId: randomBookId || 'BK' + Math.random().toString(36).substr(2, 9).toUpperCase(),
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

    return successResponse(res, bookIssue, 'Book issued successfully', 201);
  } catch (error) {
    console.error('Issue Book Error:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}`, 400);
    }
    if (error.name === 'CastError') {
      return errorResponse(res, `Invalid ID format: ${error.value}`, 400);
    }
    return errorResponse(res, 'Internal Server Error during book issuance', 500, error);
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

    return successResponse(res, bookIssue, 'Book returned successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
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
        .populate({
          path: 'member',
          select: 'name firstName lastName email memberId admissionNumber phone profileImage'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BookIssue.countDocuments(searchQuery)
    ]);

    const formattedIssues = bookIssues.map(issue => {
      const member = issue.member;
      const memberName = issue.memberType === 'Student' 
        ? `${member?.firstName || ''} ${member?.lastName || ''}`.trim()
        : member?.name || 'Unknown';
      
      const memberId = issue.memberType === 'Student'
        ? member?.admissionNumber || member?.rollNumber || 'N/A'
        : member?.memberId || 'N/A';

      return {
        ...issue,
        id: issue._id,
        memberName,
        memberId,
        bookTitle: issue.book?.title || 'Unknown',
        bookId: issue.book?._id,
        issueDate: issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : 'N/A',
        dueDate: issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : 'N/A',
        returnDate: issue.returnDate ? new Date(issue.returnDate).toLocaleDateString() : null,
      };
    });

    return paginatedResponse(res, formattedIssues, total, page, limit);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
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
      .populate({
        path: 'member',
        select: 'name firstName lastName email memberId admissionNumber phone'
      })
      .lean();

    if (!bookIssue) return errorResponse(res, 'Book issue record not found', 404);

    return successResponse(res, bookIssue);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
