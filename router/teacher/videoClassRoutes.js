const express = require('express');
const router = express.Router();
const videoClassController = require('../../controller/teacher/videoClassController');
const auth = require('../../middleware/auth');
const { uploadVideo, setVideoHeaders, cloudinaryUpload } = require('../../middleware/uploadVideo');

router.post('/', auth, setVideoHeaders, uploadVideo.single('videoFile'), cloudinaryUpload, videoClassController.uploadVideoClass);
router.get('/', auth, videoClassController.getAllVideoClasses);
router.get('/:id', auth, videoClassController.getVideoClassById);
router.put('/:id', auth, setVideoHeaders, uploadVideo.single('videoFile'), cloudinaryUpload, videoClassController.updateVideoClass);
router.delete('/:id', auth, videoClassController.deleteVideoClass);

module.exports = router;
