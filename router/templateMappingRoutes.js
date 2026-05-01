const express = require('express');
const router = express.Router();
const ctrl = require('../controller/templateMappingController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getAllMappings);
router.get('/find', auth, ctrl.getMappedTemplate);
router.post('/create', auth, ctrl.createMapping);
router.delete('/:id', auth, ctrl.deleteMapping);

module.exports = router;
