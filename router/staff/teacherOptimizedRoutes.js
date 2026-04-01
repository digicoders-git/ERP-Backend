const express = require('express');
const router = express.Router();
const teacherController = require('../../controller/staff/teacherOptimizedController');
const auth = require('../../middleware/auth');

router.get('/all', auth, teacherController.getAllTeachers);
router.get('/stats', auth, teacherController.getTeacherStats);
router.get('/with-classes', auth, teacherController.getTeacherWithClasses);
router.get('/assignments', auth, teacherController.getTeacherAssignments);
router.get('/dashboard', auth, teacherController.getTeacherDashboard);

router.post('/create', auth, teacherController.createTeacher);
router.put('/update/:teacherId', auth, teacherController.updateTeacher);
router.delete('/delete/:teacherId', auth, teacherController.deleteTeacher);

module.exports = router;
