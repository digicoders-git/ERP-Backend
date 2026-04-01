const express = require('express');
const router = express.Router();
const videoClassController = require('../../controller/teacher/videoClassController');
const auth = require('../../middleware/auth');

router.post('/upload', auth, videoClassController.uploadVideoClass);
router.get('/all', auth, videoClassController.getAllVideoClasses);
router.get('/:id', auth, videoClassController.getVideoClassById);
router.put('/:id', auth, videoClassController.updateVideoClass);
router.delete('/:id', auth, videoClassController.deleteVideoClass);

module.exports = router;
