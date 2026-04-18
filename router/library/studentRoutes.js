const express = require('express');
const router = express.Router();
const studentController = require('../../controller/library/studentController');
const auth = require('../../middleware/auth');
const { validateStudent } = require('../../middleware/validateLibrary');

router.post('/add', auth, validateStudent, studentController.addStudent);
router.get('/all', auth, studentController.getAllStudents);
router.get('/classes', auth, studentController.getClasses);
router.get('/sections', auth, studentController.getSections);
router.put('/:id', auth, validateStudent, studentController.updateStudent);
router.delete('/:id', auth, studentController.deleteStudent);

module.exports = router;
