const express = require('express');
const router = express.Router();
const libraryController = require('../../controller/library/libraryOptimizedController');
const auth = require('../../middleware/auth');

router.get('/dashboard', auth, libraryController.getLibraryDashboard);
router.get('/stats', auth, libraryController.getLibraryStats);
router.get('/books', auth, libraryController.getBooks);
router.get('/issued', auth, libraryController.getIssuedBooks);
router.get('/members', auth, libraryController.getMembers);
router.get('/overdue', auth, libraryController.getOverdueBooks);
router.put('/extend/:id', auth, libraryController.extendDueDate);

module.exports = router;
