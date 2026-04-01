const express = require('express');
const router = express.Router();
const clientController = require('../controller/clientController');
const checkSuperAdmin = require('../middleware/checkSuperAdmin');

// All routes are protected and only accessible by Super Admin
router.post('/create', checkSuperAdmin, clientController.createClient);
router.get('/all', checkSuperAdmin, clientController.getAllClients);
router.get('/:clientId', checkSuperAdmin, clientController.getClientById);
router.put('/update/:clientId', checkSuperAdmin, clientController.updateClient);
router.put('/toggle-status/:clientId', checkSuperAdmin, clientController.toggleClientStatus);
router.delete('/delete/:clientId', checkSuperAdmin, clientController.deleteClient);

module.exports = router;
