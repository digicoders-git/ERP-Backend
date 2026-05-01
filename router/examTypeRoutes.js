const express = require('express');
const router = express.Router();
const examTypeController = require('../controller/examTypeController');
const auth = require('../middleware/auth');
const staffAuth = require('../middleware/staffAuth');
const flexibleAuth = require('../middleware/flexibleAuth');

// Get all exam types - accessible to both admin and staff
router.get('/', flexibleAuth, examTypeController.getAllExamTypes);

// Get single exam type
router.get('/:id', flexibleAuth, examTypeController.getExamTypeById);

// Get marksheet template for exam type
router.get('/:examTypeId/marksheet', flexibleAuth, examTypeController.getMarksheetTemplate);

// Create exam type - admin only
router.post('/', auth, examTypeController.createExamType);

// Update exam type - admin only
router.put('/:id', auth, examTypeController.updateExamType);

// Delete exam type - admin only
router.delete('/:id', auth, examTypeController.deleteExamType);

module.exports = router;
