const express = require('express');
const router = express.Router();
const teacherManagementController = require('../../controller/staff/teacherManagementController');
const flexibleAuth = require('../../middleware/flexibleAuth');
const { uploadTeacher, setTeacherHeaders, cloudinaryUpload } = require('../../middleware/uploadTeacher');

router.get('/', flexibleAuth, teacherManagementController.getAllTeachers);
router.get('/report', flexibleAuth, teacherManagementController.getTeachersByStatus);
router.get('/:id', flexibleAuth, teacherManagementController.getTeacherById);
router.get('/status/:status', flexibleAuth, teacherManagementController.getTeachersByStatus);
router.get('/subject/:subject', flexibleAuth, teacherManagementController.getTeachersBySubject);
router.get('/branch/:branchId', flexibleAuth, teacherManagementController.getTeachersByBranch);
router.get('/search/query', flexibleAuth, teacherManagementController.searchTeachers);
router.post('/', flexibleAuth, setTeacherHeaders, uploadTeacher.single('profileImage'), cloudinaryUpload, teacherManagementController.createTeacher);
router.put('/:id', flexibleAuth, setTeacherHeaders, uploadTeacher.single('profileImage'), cloudinaryUpload, teacherManagementController.updateTeacher);
router.delete('/:id', flexibleAuth, teacherManagementController.deleteTeacher);

module.exports = router;
