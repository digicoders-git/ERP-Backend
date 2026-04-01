const express = require('express');
const router = express.Router();
const feeMappingController = require('../controller/feeMappingController');
const auth = require('../middleware/auth');

router.post('/map', auth, feeMappingController.mapFee);
router.get('/all', auth, feeMappingController.getAllMappings);
router.delete('/delete/:id', auth, feeMappingController.deleteFeeMapping);

module.exports = router;
