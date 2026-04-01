const express = require('express');
const router = express.Router();
const bookIssueController = require('../../controller/library/bookIssueController');
const auth = require('../../middleware/auth');
const { validateBookIssue } = require('../../middleware/validateLibrary');

router.post('/issue', auth, validateBookIssue, bookIssueController.issueBook);
router.put('/return/:id', auth, bookIssueController.returnBook);
router.get('/all', auth, bookIssueController.getAllBookIssues);
router.get('/:id', auth, bookIssueController.getBookIssueById);

module.exports = router;
