const express = require('express');
const router = express.Router();
const idCardController = require('../../controller/staff/idCardController');
const flexibleAuth = require('../../middleware/flexibleAuth');

router.post('/generate', flexibleAuth, idCardController.generateIdCards);

module.exports = router;
