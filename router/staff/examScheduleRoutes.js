const express = require('express');
const router = express.Router();
const examScheduleController = require('../../controller/staff/examScheduleController');
const auth = require('../../middleware/staffAuth');

router.post('/add', auth, examScheduleController.createExamSchedule);
router.get('/all', auth, examScheduleController.getAllExamSchedules);
router.get('/:id', auth, examScheduleController.getExamScheduleById);
router.put('/:id', auth, examScheduleController.updateExamSchedule);
router.delete('/:id', auth, examScheduleController.deleteExamSchedule);

module.exports = router;
