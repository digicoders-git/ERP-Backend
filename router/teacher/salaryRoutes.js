const express = require('express');
const router = express.Router();
const salaryController = require('../../controller/teacher/salaryController');
const auth = require('../../middleware/auth');

// Test endpoint (no auth)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Salary routes working', timestamp: new Date() });
});

// Specific routes MUST come before generic routes
router.get('/report', auth, salaryController.getSalaryReport);

// Get teacher's own salaries
router.get('/', auth, salaryController.getTeacherSalaries);

// Get salary by ID (must be last)
router.get('/:id', auth, salaryController.getSalaryById);

module.exports = router;
