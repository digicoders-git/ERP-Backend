const express = require('express');
const router = express.Router();
const diaryController = require('../../controller/teacher/diaryController');
const auth = require('../../middleware/auth');
const { uploadDiary, setDiaryHeaders, cloudinaryUpload } = require('../../middleware/uploadDiary');

router.post('/create', auth, setDiaryHeaders, uploadDiary.single('image'), cloudinaryUpload, diaryController.createDiaryEntry);
router.get('/all', auth, diaryController.getAllDiaryEntries);
router.get('/stats', auth, diaryController.getDiaryStats);
router.get('/:id', auth, diaryController.getDiaryEntryById);
router.put('/:id', auth, setDiaryHeaders, uploadDiary.single('image'), cloudinaryUpload, diaryController.updateDiaryEntry);
router.delete('/:id', auth, diaryController.deleteDiaryEntry);

module.exports = router;
