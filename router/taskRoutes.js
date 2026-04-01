const express = require('express');
const router = express.Router();
const taskController = require('../controller/taskController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.post('/assign', authMiddleware, taskController.assignTask);
router.get('/all', authMiddleware, taskController.getAllTasks);
router.get('/staff/:staffId', authMiddleware, taskController.getTasksByStaff);
router.get('/status/:status', authMiddleware, taskController.getTasksByStatus);
router.get('/:taskId', authMiddleware, taskController.getTaskById);
router.put('/update/:taskId', authMiddleware, taskController.updateTask);
router.delete('/delete/:taskId', authMiddleware, taskController.deleteTask);

module.exports = router;
