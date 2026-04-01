const express = require('express');
const router = express.Router();
const librarianController = require('../../controller/staff/librarianController');

// GET all librarians
router.get('/', librarianController.getAllLibrarians);

// GET librarian by ID
router.get('/:id', librarianController.getLibrarianById);

// GET librarians by status
router.get('/status/:status', librarianController.getLibrariansByStatus);

// SEARCH librarians
router.get('/search/query', librarianController.searchLibrarians);

// CREATE new librarian
router.post('/', librarianController.createLibrarian);

// UPDATE librarian
router.put('/:id', librarianController.updateLibrarian);

// DELETE librarian
router.delete('/:id', librarianController.deleteLibrarian);

module.exports = router;
