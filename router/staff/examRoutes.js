const express = require('express');
const router = express.Router();
const examController = require('../../controller/staff/examController');
const flexibleAuth = require('../../middleware/flexibleAuth');

// Marks Management
router.post('/marks/add', flexibleAuth, examController.addMarks);
router.get('/marks', flexibleAuth, examController.getMarksByExam);
router.get('/marks/history', flexibleAuth, examController.getAllMarksHistory);
router.get('/marks/student/:studentId', flexibleAuth, examController.getStudentMarksReport);

// Grading System
router.post('/grading', flexibleAuth, examController.createGrading);
router.get('/grading', flexibleAuth, examController.getGradingSystem);
router.put('/grading/:id', flexibleAuth, examController.updateGrading);
router.delete('/grading/:id', flexibleAuth, examController.deleteGrading);

// Online Exam
router.post('/online-exam', flexibleAuth, examController.createOnlineExam);
router.get('/online-exam', flexibleAuth, examController.getAllOnlineExams);
router.get('/online-exam/:id', flexibleAuth, examController.getOnlineExamById);
router.put('/online-exam/:id', flexibleAuth, examController.updateOnlineExam);
router.delete('/online-exam/:id', flexibleAuth, examController.deleteOnlineExam);

module.exports = router;
