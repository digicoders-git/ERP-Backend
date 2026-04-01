const express = require('express');
const router = express.Router();
const sectionController = require('../controller/sectionController');
const auth = require('../middleware/auth');

router.post('/create', auth, sectionController.createSection);
router.get('/all', auth, sectionController.getAllSections);
router.get('/:id', auth, sectionController.getSectionById);
router.put('/update/:id', auth, sectionController.updateSection);
router.delete('/delete/:id', auth, sectionController.deleteSection);

module.exports = router;
