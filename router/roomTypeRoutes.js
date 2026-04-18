const express = require('express');
const router = express.Router();
const roomTypeController = require('../controller/roomTypeController');
const auth = require('../middleware/flexibleAuth');

router.post('/create', auth, roomTypeController.createRoomType);
router.get('/all', auth, roomTypeController.getAllRoomTypes);
router.get('/:id', auth, roomTypeController.getRoomTypeById);
router.put('/update/:id', auth, roomTypeController.updateRoomType);
router.delete('/delete/:id', auth, roomTypeController.deleteRoomType);
router.patch('/toggle-status/:id', auth, roomTypeController.toggleRoomTypeStatus);

module.exports = router;
