const express = require('express');
const router = express.Router();
const classController = require('../controller/classController');
const auth = require('../middleware/auth');

router.post('/create', auth, classController.createClass);
router.get('/all', auth, classController.getAllClasses);
router.get('/:id', auth, classController.getClassById);
router.put('/update/:id', auth, classController.updateClass);
router.delete('/delete/:id', auth, classController.deleteClass);

module.exports = router;
