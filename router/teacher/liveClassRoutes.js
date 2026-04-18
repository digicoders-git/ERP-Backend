const express = require('express');
const router = express.Router();
const liveClassController = require('../../controller/teacher/liveClassController');
const auth = require('../../middleware/auth');

router.post('/', auth, liveClassController.scheduleLiveClass);
router.get('/', auth, liveClassController.getAllLiveClasses);
router.get('/:id', auth, liveClassController.getLiveClassById);
router.put('/:id', auth, liveClassController.updateLiveClass);
router.delete('/:id', auth, liveClassController.deleteLiveClass);

module.exports = router;
