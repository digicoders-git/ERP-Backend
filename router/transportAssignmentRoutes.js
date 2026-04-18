const express = require('express');
const router = express.Router();
const transportAssignmentController = require('../controller/transportAssignmentController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/create', flexibleAuth, transportAssignmentController.createAssignment);
router.get('/all', flexibleAuth, transportAssignmentController.getAllAssignments);
router.get('/:id', flexibleAuth, transportAssignmentController.getAssignmentById);
router.put('/update/:id', flexibleAuth, transportAssignmentController.updateAssignment);
router.delete('/delete/:id', flexibleAuth, transportAssignmentController.deleteAssignment);
router.patch('/toggle-status/:id', flexibleAuth, transportAssignmentController.toggleAssignmentStatus);

module.exports = router;
