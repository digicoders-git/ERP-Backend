const express = require('express');
const router = express.Router();
const memberController = require('../../controller/library/memberController');
const auth = require('../../middleware/auth');
const { validateMember } = require('../../middleware/validateLibrary');

router.post('/add', auth, validateMember, memberController.addMember);
router.get('/all', auth, memberController.getAllMembers);
router.get('/:id', auth, memberController.getMemberById);
router.put('/:id', auth, validateMember, memberController.updateMember);
router.delete('/:id', auth, memberController.deleteMember);

module.exports = router;
