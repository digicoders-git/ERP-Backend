const express = require('express');
const router = express.Router();
const idCardController = require('../../controller/staff/idCardController');
const auth = require('../../middleware/staffAuth');

router.get('/generate/:studentId', auth, idCardController.generateIdCard);
router.get('/bulk', auth, idCardController.generateBulkIdCards);
router.get('/students', auth, idCardController.getStudentsForIdCard);

module.exports = router;
