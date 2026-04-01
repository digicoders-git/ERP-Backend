const express = require('express');
const router = express.Router();
const hostelMenuController = require('../../controller/warden/hostelMenuController');
const auth = require('../../middleware/auth');

router.post('/add', auth, hostelMenuController.addMenu);
router.get('/all', auth, hostelMenuController.getAllMenus);
router.get('/day/:day', auth, hostelMenuController.getMenuByDay);
router.put('/:id', auth, hostelMenuController.updateMenu);
router.delete('/:id', auth, hostelMenuController.deleteMenu);

module.exports = router;
