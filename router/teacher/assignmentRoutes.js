const express = require('express');
const router = express.Router();
const assignmentController = require('../../controller/teacher/assignmentController');
const auth = require('../../middleware/auth');

router.post('/create', auth, assignmentController.createAssignment);
router.get('/all', auth, assignmentController.getAllAssignments);
router.get('/:id', auth, assignmentController.getAssignmentById);
router.put('/:id', auth, assignmentController.updateAssignment);
router.delete('/:id', auth, assignmentController.deleteAssignment);

module.exports = router;
