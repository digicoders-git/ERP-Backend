const express = require('express');
const router = express.Router();
const driverLoginController = require('../../controller/transport/driverLoginController');
const auth = require('../../middleware/auth');

// Driver Login
router.post('/login', driverLoginController.driverLogin);

// Get Driver Profile (Protected)
router.get('/profile', auth, driverLoginController.getDriverProfile);

module.exports = router;
