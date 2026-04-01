const express = require('express');
const router = express.Router();
const alumniController = require('../controller/alumniController');
const auth = require('../middleware/auth');

router.post('/create', auth, alumniController.createAlumni);
router.get('/all', auth, alumniController.getAllAlumni);
router.put('/update/:id', auth, alumniController.updateAlumni);
router.delete('/delete/:id', auth, alumniController.deleteAlumni);

module.exports = router;
