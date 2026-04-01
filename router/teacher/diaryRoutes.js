const express = require('express');
const router = express.Router();
const diaryController = require('../../controller/teacher/diaryController');
const auth = require('../../middleware/auth');
const uploadDiary = require('../../middleware/uploadDiary');

router.post('/add', auth, uploadDiary.single('image'), diaryController.addDiaryEntry);
router.get('/all', auth, diaryController.getAllDiaryEntries);
router.get('/:id', auth, diaryController.getDiaryEntryById);
router.put('/:id', auth, uploadDiary.single('image'), diaryController.updateDiaryEntry);
router.delete('/:id', auth, diaryController.deleteDiaryEntry);

module.exports = router;
