const express = require('express');
const router = express.Router();
const noticeController = require('../../controller/teacher/noticeController');
const auth = require('../../middleware/auth');
const uploadNotice = require('../../middleware/uploadNotice');

router.post('/create', auth, uploadNotice.array('attachments', 5), noticeController.createNotice);
router.put('/publish/:id', auth, noticeController.publishNotice);
router.get('/all', auth, noticeController.getAllNotices);
router.get('/:id', auth, noticeController.getNoticeById);
router.put('/:id', auth, uploadNotice.array('attachments', 5), noticeController.updateNotice);
router.delete('/:id', auth, noticeController.deleteNotice);

module.exports = router;
