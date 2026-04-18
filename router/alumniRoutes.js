const express = require('express');
const router = express.Router();
const alumniController = require('../controller/alumniController');
const flexibleAuth = require('../middleware/flexibleAuth');
const { uploadAlumni, setAlumniHeaders, cloudinaryUpload } = require('../middleware/uploadAlumni');

router.post('/', flexibleAuth, setAlumniHeaders, uploadAlumni.single('image'), cloudinaryUpload, alumniController.createAlumni);
router.get('/', flexibleAuth, alumniController.getAllAlumni);
router.put('/:id', flexibleAuth, setAlumniHeaders, uploadAlumni.single('image'), cloudinaryUpload, alumniController.updateAlumni);
router.delete('/:id', flexibleAuth, alumniController.deleteAlumni);

module.exports = router;
