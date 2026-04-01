const express = require('express');
const router = express.Router();
const e = require('../../controller/staff/eLearningController');
const auth = require('../../middleware/auth');
const uploadResource = require('../../middleware/uploadResource');

// Dashboard
router.get('/dashboard', auth, e.getDashboard);

// Video Class
router.post('/videos', auth, e.createVideo);
router.get('/videos', auth, e.getAllVideos);
router.get('/videos/:id', auth, e.getVideoById);
router.put('/videos/:id', auth, e.updateVideo);
router.delete('/videos/:id', auth, e.deleteVideo);

// Live Class
router.post('/live-classes', auth, e.createLiveClass);
router.get('/live-classes', auth, e.getAllLiveClasses);
router.get('/live-classes/:id', auth, e.getLiveClassById);
router.put('/live-classes/:id', auth, e.updateLiveClass);
router.delete('/live-classes/:id', auth, e.deleteLiveClass);

// Resource
router.post('/resources', auth, uploadResource.single('file'), e.uploadResource);
router.get('/resources', auth, e.getAllResources);
router.get('/resources/:id', auth, e.getResourceById);
router.put('/resources/:id', auth, uploadResource.single('file'), e.updateResource);
router.delete('/resources/:id', auth, e.deleteResource);

module.exports = router;
