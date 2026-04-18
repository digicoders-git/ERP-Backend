const express = require('express');
const router = express.Router();
const noticeController = require('../../controller/staff/noticeController');
const auth = require('../../middleware/staffAuth');
const { uploadNotice, setNoticeHeaders, cloudinaryUpload } = require('../../middleware/uploadNotice');

router.post('/add', auth, setNoticeHeaders, uploadNotice.array('documents', 5), cloudinaryUpload, noticeController.createNotice);
router.get('/all', auth, noticeController.getAllNotices);
router.get('/:id', auth, noticeController.getNoticeById);
router.put('/:id', auth, setNoticeHeaders, uploadNotice.array('documents', 5), cloudinaryUpload, noticeController.updateNotice);
router.delete('/:id', auth, noticeController.deleteNotice);

module.exports = router;
