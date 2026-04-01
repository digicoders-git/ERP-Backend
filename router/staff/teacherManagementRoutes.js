const express = require('express');
const router = express.Router();
const teacherManagementController = require('../../controller/staff/teacherManagementController');

router.get('/', teacherManagementController.getAllTeachers);
router.get('/report', teacherManagementController.getTeachersByStatus);
router.get('/:id', teacherManagementController.getTeacherById);
router.get('/status/:status', teacherManagementController.getTeachersByStatus);
router.get('/subject/:subject', teacherManagementController.getTeachersBySubject);
router.get('/branch/:branchId', teacherManagementController.getTeachersByBranch);
router.get('/search/query', teacherManagementController.searchTeachers);
router.post('/', teacherManagementController.createTeacher);
router.put('/:id', teacherManagementController.updateTeacher);
router.delete('/:id', teacherManagementController.deleteTeacher);

module.exports = router;
