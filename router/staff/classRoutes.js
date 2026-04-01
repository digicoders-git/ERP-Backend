const express = require('express');
const router = express.Router();
const classController = require('../../controller/staff/classController');
const auth = require('../../middleware/auth');

router.get('/all', auth, classController.getAllClasses);
router.get('/students/list', auth, classController.getStudentsByClassSection);
router.get('/:id/statistics', auth, classController.getClassStatistics);
router.get('/:id', auth, classController.getClassById);

module.exports = router;
