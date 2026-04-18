const express = require('express');
const router = express.Router();
const timetableController = require('../../controller/staff/timetableController');
const flexibleAuth = require('../../middleware/flexibleAuth');

// Apply flexible authentication to all routes
router.use(flexibleAuth);

router.get('/all', timetableController.getAllTimetables);
router.post('/add', timetableController.addTimetable);
router.put('/:id', timetableController.updateTimetable);
router.delete('/:id', timetableController.deleteTimetable);

module.exports = router;
