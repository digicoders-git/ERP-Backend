const express = require('express');
const router = express.Router();
const attendanceUploadController = require('../../controller/staff/attendanceUploadController');
const authMiddleware = require('../../middleware/auth');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.use(authMiddleware);

router.post('/excel-upload', upload.single('file'), attendanceUploadController.uploadExcelAttendance);

module.exports = router;
