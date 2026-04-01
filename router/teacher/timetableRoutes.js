const express = require('express');
const router = express.Router();
const timetableController = require('../../controller/teacher/timetableController');
const auth = require('../../middleware/auth');

router.post('/add', auth, timetableController.addTimetable);
router.get('/all', auth, timetableController.getAllTimetables);
router.get('/day/:day', auth, timetableController.getTimetableByDay);
router.put('/:id', auth, timetableController.updateTimetable);
router.delete('/:id', auth, timetableController.deleteTimetable);

module.exports = router;
