const express = require('express');
const router = express.Router();
const teacherController = require('../controller/teacherController');
const authMiddleware = require('../middleware/auth');
const uploadTeacher = require('../middleware/uploadTeacher');

// Public routes (no authentication required)
router.post('/login', teacherController.teacherLogin);

// Protected routes (authentication required)
router.get('/profile', authMiddleware, teacherController.getTeacherProfile);
router.put('/profile', authMiddleware, uploadTeacher.single('profileImage'), teacherController.updateTeacherProfile);
router.post('/change-password', authMiddleware, teacherController.changePassword);

// Admin routes (for managing teachers)
router.post('/create', authMiddleware, uploadTeacher.single('profileImage'), teacherController.createTeacher);
router.get('/all', authMiddleware, teacherController.getAllTeachers);
router.get('/:teacherId', authMiddleware, teacherController.getTeacherById);
router.put('/update/:teacherId', authMiddleware, uploadTeacher.single('profileImage'), teacherController.updateTeacher);
router.delete('/delete/:teacherId', authMiddleware, teacherController.deleteTeacher);
router.patch('/toggle-status/:teacherId', authMiddleware, teacherController.toggleTeacherStatus);

module.exports = router;
