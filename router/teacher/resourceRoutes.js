const express = require('express');
const router = express.Router();
const resourceController = require('../../controller/teacher/resourceController');
const auth = require('../../middleware/auth');
const uploadResource = require('../../middleware/uploadResource');

router.post('/upload', auth, uploadResource.single('file'), resourceController.uploadResource);
router.get('/all', auth, resourceController.getAllResources);
router.get('/:id', auth, resourceController.getResourceById);
router.put('/:id', auth, uploadResource.single('file'), resourceController.updateResource);
router.delete('/:id', auth, resourceController.deleteResource);

module.exports = router;
