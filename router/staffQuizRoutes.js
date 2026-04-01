const express = require('express');
const router = express.Router();
const staffQuizController = require('../controller/staffQuizController');
const auth = require('../middleware/auth');

router.post('/create', auth, staffQuizController.createQuiz);
router.get('/all', auth, staffQuizController.getAllQuizzes);
router.get('/:id', auth, staffQuizController.getQuizById);
router.put('/update/:id', auth, staffQuizController.updateQuiz);
router.delete('/delete/:id', auth, staffQuizController.deleteQuiz);

module.exports = router;
