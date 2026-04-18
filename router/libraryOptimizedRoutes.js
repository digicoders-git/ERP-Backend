const express = require('express');
const router = express.Router();
const libraryController = require('../controller/library/libraryOptimizedController');
const auth = require('../middleware/flexibleAuth');

// Debug endpoint to test auth
router.get('/test-auth', auth, (req, res) => {
  res.json({ success: true, message: 'Auth working', user: req.user });
});

router.get('/stats', auth, libraryController.getLibraryStats);
router.get('/books', auth, libraryController.getBooks);
router.get('/issued', auth, libraryController.getIssuedBooks);
router.get('/members', auth, libraryController.getMembers);
router.get('/overdue', auth, libraryController.getOverdueBooks);
router.get('/dashboard', auth, libraryController.getLibraryDashboard);

module.exports = router;
