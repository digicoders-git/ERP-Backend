const express = require('express');
const router = express.Router();
const resourceController = require('../../controller/teacher/resourceController');
const auth = require('../../middleware/auth');
const { uploadResource, setResourceHeaders, cloudinaryUpload } = require('../../middleware/uploadResource');

router.post('/', auth, setResourceHeaders, uploadResource.single('file'), cloudinaryUpload, resourceController.uploadResource);
router.get('/', auth, resourceController.getAllResources);
router.get('/:id', auth, resourceController.getResourceById);
router.put('/:id', auth, setResourceHeaders, uploadResource.single('file'), cloudinaryUpload, resourceController.updateResource);
router.delete('/:id', auth, resourceController.deleteResource);

module.exports = router;
