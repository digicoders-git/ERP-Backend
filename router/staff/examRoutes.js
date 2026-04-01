const express = require('express');
const router = express.Router();
const examController = require('../../controller/staff/examController');
const auth = require('../../middleware/auth');

// Marks Management
router.post('/marks/add', auth, examController.addMarks);
router.get('/marks', auth, examController.getMarksByExam);
router.get('/marks/student/:studentId', auth, examController.getStudentMarksReport);

// Grading System
router.post('/grading', auth, examController.createGrading);
router.get('/grading', auth, examController.getGradingSystem);
router.put('/grading/:id', auth, examController.updateGrading);
router.delete('/grading/:id', auth, examController.deleteGrading);

// Online Exam
router.post('/online-exam', auth, examController.createOnlineExam);
router.get('/online-exam', auth, examController.getAllOnlineExams);
router.get('/online-exam/:id', auth, examController.getOnlineExamById);
router.put('/online-exam/:id', auth, examController.updateOnlineExam);
router.delete('/online-exam/:id', auth, examController.deleteOnlineExam);

module.exports = router;
