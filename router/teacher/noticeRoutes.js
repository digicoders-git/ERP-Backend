const express = require('express');
const router = express.Router();
const noticeController = require('../../controller/teacher/noticeController');
const auth = require('../../middleware/auth');
const { uploadNotice, setNoticeHeaders, cloudinaryUpload } = require('../../middleware/uploadNotice');

router.post('/create', auth, setNoticeHeaders, uploadNotice.array('attachments', 5), cloudinaryUpload, noticeController.createNotice);
router.put('/publish/:id', auth, noticeController.publishNotice);
router.put('/unpublish/:id', auth, noticeController.unpublishNotice);
router.get('/all', auth, noticeController.getAllNotices);
router.get('/:id', auth, noticeController.getNoticeById);
router.put('/:id', auth, setNoticeHeaders, uploadNotice.array('attachments', 5), cloudinaryUpload, noticeController.updateNotice);
router.delete('/:id', auth, noticeController.deleteNotice);

module.exports = router;
