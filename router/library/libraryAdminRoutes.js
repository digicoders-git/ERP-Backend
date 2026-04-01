const express = require('express');
const router = express.Router();
const libraryAdminController = require('../../controller/library/libraryAdminController');
const auth = require('../../middleware/auth');

router.post('/add', auth, libraryAdminController.createLibraryAdmin);
router.get('/all', auth, libraryAdminController.getAllLibraryAdmins);
router.delete('/:id', auth, libraryAdminController.deleteLibraryAdmin);

module.exports = router;
