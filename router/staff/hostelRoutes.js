const express = require('express');
const router = express.Router();
const h = require('../../controller/staff/hostelController');
const auth = require('../../middleware/auth');

// Hostel
router.get('/hostels', auth, h.getAllHostels);
router.post('/hostels', auth, h.createHostel);
router.put('/hostels/:id', auth, h.updateHostel);
router.delete('/hostels/:id', auth, h.deleteHostel);

// Room Type
router.get('/room-types', auth, h.getAllRoomTypes);
router.post('/room-types', auth, h.createRoomType);
router.put('/room-types/:id', auth, h.updateRoomType);
router.delete('/room-types/:id', auth, h.deleteRoomType);

// Room
router.get('/rooms', auth, h.getAllRooms);
router.post('/rooms', auth, h.createRoom);
router.put('/rooms/:id', auth, h.updateRoom);
router.delete('/rooms/:id', auth, h.deleteRoom);

// Allocation
router.get('/allocations', auth, h.getAllAllocations);
router.post('/allocations', auth, h.createAllocation);
router.put('/allocations/:id', auth, h.updateAllocation);
router.delete('/allocations/:id', auth, h.deleteAllocation);

// Warden (read only from staff panel)
router.get('/wardens', auth, h.getAllWardens);

module.exports = router;
