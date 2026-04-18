const express = require('express');
const router = express.Router();
const teacherController = require('../controller/teacherController');
const authMiddleware = require('../middleware/auth');
const { uploadTeacher, setTeacherHeaders, cloudinaryUpload } = require('../middleware/uploadTeacher');

// Public routes (no authentication required)
router.post('/login', teacherController.teacherLogin);

// Protected routes (authentication required)
router.get('/profile', authMiddleware, teacherController.getTeacherProfile);
router.put('/profile', authMiddleware, setTeacherHeaders, uploadTeacher.single('profileImage'), cloudinaryUpload, teacherController.updateTeacherProfile);
router.post('/change-password', authMiddleware, teacherController.changePassword);

// Admin routes (for managing teachers)
router.post('/create', authMiddleware, setTeacherHeaders, uploadTeacher.single('profileImage'), cloudinaryUpload, teacherController.createTeacher);
router.get('/all', authMiddleware, teacherController.getAllTeachers);
router.get('/:teacherId', authMiddleware, teacherController.getTeacherById);
router.put('/update/:teacherId', authMiddleware, setTeacherHeaders, uploadTeacher.single('profileImage'), cloudinaryUpload, teacherController.updateTeacher);
router.delete('/delete/:teacherId', authMiddleware, teacherController.deleteTeacher);
router.patch('/toggle-status/:teacherId', authMiddleware, teacherController.toggleTeacherStatus);

module.exports = router;
