const express = require('express');
const router = express.Router();
const librarianController = require('../../controller/staff/librarianController');
const auth = require('../../middleware/flexibleAuth');
const { uploadLibrarian, setLibraryStaffHeaders, cloudinaryUpload } = require('../../middleware/uploadLibrarian');

// GET all librarians
router.get('/', auth, librarianController.getAllLibrarians);

// GET librarian by ID
router.get('/:id', auth, librarianController.getLibrarianById);

// GET librarians by status
router.get('/status/:status', auth, librarianController.getLibrariansByStatus);

// SEARCH librarians
router.get('/search/query', auth, librarianController.searchLibrarians);

// CREATE new librarian
router.post('/', auth, setLibraryStaffHeaders, uploadLibrarian.single('profileImage'), cloudinaryUpload, librarianController.createLibrarian);

// UPDATE librarian
router.put('/:id', auth, setLibraryStaffHeaders, uploadLibrarian.single('profileImage'), cloudinaryUpload, librarianController.updateLibrarian);

// DELETE librarian
router.delete('/:id', auth, librarianController.deleteLibrarian);

module.exports = router;
