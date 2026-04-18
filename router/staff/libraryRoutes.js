const express = require('express');
const router = express.Router();
const libraryController = require('../../controller/staff/libraryController');
const auth = require('../../middleware/flexibleAuth');

// Dashboard Stats
router.get('/dashboard/stats', auth, libraryController.getDashboardStats);

// Books
router.get('/books', auth, libraryController.getAllBooks);
router.get('/books/:id', auth, libraryController.getBookById);
router.get('/books/:bookId/history', auth, libraryController.getBookIssueHistory);

// Book Issues
router.get('/book-issues', auth, libraryController.getAllBookIssues);
router.get('/book-issues/overdue', auth, libraryController.getOverdueBooks);
router.get('/book-issues/due-soon', auth, libraryController.getBooksDueSoon);

// Library Cards
router.get('/library-cards', auth, libraryController.getAllLibraryCards);

// Members
router.get('/members', auth, libraryController.getAllMembers);
router.get('/members/:memberId/history', auth, libraryController.getMemberIssueHistory);

// Students
router.get('/students', auth, libraryController.getAllStudents);

// Book Requests
router.get('/book-requests', auth, libraryController.getAllBookRequests);

// Reports
router.get('/reports', auth, libraryController.getLibraryReports);

module.exports = router;
