const express = require('express');
const router = express.Router();
const classController = require('../../controller/staff/classController');
const flexibleAuth = require('../../middleware/flexibleAuth');

router.get('/all', flexibleAuth, classController.getAllClasses);
router.get('/get-all-classes', flexibleAuth, classController.getAllClasses);
router.get('/get-sections-by-class/:classId', flexibleAuth, classController.getSectionsByClass);
router.get('/students/list', flexibleAuth, classController.getStudentsByClassSection);
router.get('/:id/statistics', flexibleAuth, classController.getClassStatistics);
router.get('/:id', flexibleAuth, classController.getClassById);

module.exports = router;
