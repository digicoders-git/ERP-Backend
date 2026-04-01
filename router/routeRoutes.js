const express = require('express');
const router = express.Router();
const routeController = require('../controller/routeController');
const auth = require('../middleware/auth');

router.post('/create', auth, routeController.createRoute);
router.get('/all', auth, routeController.getAllRoutes);
router.get('/:id', auth, routeController.getRouteById);
router.put('/update/:id', auth, routeController.updateRoute);
router.delete('/delete/:id', auth, routeController.deleteRoute);
router.patch('/toggle-status/:id', auth, routeController.toggleRouteStatus);

module.exports = router;
