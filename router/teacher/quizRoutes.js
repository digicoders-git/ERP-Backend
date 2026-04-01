const express = require('express');
const router = express.Router();
const quizController = require('../../controller/teacher/quizController');
const auth = require('../../middleware/auth');

router.post('/create', auth, quizController.createQuiz);
router.get('/all', auth, quizController.getAllQuizzes);
router.get('/:id', auth, quizController.getQuizById);
router.put('/:id', auth, quizController.updateQuiz);
router.delete('/:id', auth, quizController.deleteQuiz);

module.exports = router;
