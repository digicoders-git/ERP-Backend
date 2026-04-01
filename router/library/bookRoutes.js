const express = require('express');
const router = express.Router();
const bookController = require('../../controller/library/bookController');
const auth = require('../../middleware/auth');
const { validateBook } = require('../../middleware/validateLibrary');

router.post('/add', auth, validateBook, bookController.addBook);
router.get('/all', auth, bookController.getAllBooks);
router.get('/:id', auth, bookController.getBookById);
router.put('/:id', auth, validateBook, bookController.updateBook);
router.delete('/:id', auth, bookController.deleteBook);

module.exports = router;
