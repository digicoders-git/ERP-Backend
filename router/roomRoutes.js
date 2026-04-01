const express = require('express');
const router = express.Router();
const roomController = require('../controller/roomController');
const auth = require('../middleware/auth');

router.post('/create', auth, roomController.createRoom);
router.get('/all', auth, roomController.getAllRooms);
router.get('/:id', auth, roomController.getRoomById);
router.put('/update/:id', auth, roomController.updateRoom);
router.delete('/delete/:id', auth, roomController.deleteRoom);
router.patch('/update-status/:id', auth, roomController.updateRoomStatus);

module.exports = router;
