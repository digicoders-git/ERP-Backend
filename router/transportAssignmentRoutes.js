const express = require('express');
const router = express.Router();
const transportAssignmentController = require('../controller/transportAssignmentController');
const auth = require('../middleware/auth');

router.post('/create', auth, transportAssignmentController.createAssignment);
router.get('/all', auth, transportAssignmentController.getAllAssignments);
router.get('/:id', auth, transportAssignmentController.getAssignmentById);
router.put('/update/:id', auth, transportAssignmentController.updateAssignment);
router.delete('/delete/:id', auth, transportAssignmentController.deleteAssignment);
router.patch('/toggle-status/:id', auth, transportAssignmentController.toggleAssignmentStatus);

module.exports = router;
