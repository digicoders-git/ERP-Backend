const express = require('express');
const router = express.Router();
const noticeController = require('../../controller/staff/noticeController');
const auth = require('../../middleware/auth');
const uploadNotice = require('../../middleware/uploadNotice');

router.post('/add', auth, uploadNotice.array('documents', 5), noticeController.createNotice);
router.get('/all', auth, noticeController.getAllNotices);
router.get('/:id', auth, noticeController.getNoticeById);
router.put('/:id', auth, uploadNotice.array('documents', 5), noticeController.updateNotice);
router.delete('/:id', auth, noticeController.deleteNotice);

module.exports = router;
