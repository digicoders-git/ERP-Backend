const express = require('express');
const router = express.Router();
const flexibleAuth = require('../../middleware/flexibleAuth');
const hostelController = require('../../controller/staff/hostelController');

// Hostel Routes
router.get('/hostels', flexibleAuth, hostelController.getAllHostels);
router.post('/hostels', flexibleAuth, hostelController.createHostel);
router.put('/hostels/:id', flexibleAuth, hostelController.updateHostel);
router.delete('/hostels/:id', flexibleAuth, hostelController.deleteHostel);

// Room Types Routes
router.get('/room-types', flexibleAuth, hostelController.getAllRoomTypes);

// Rooms Routes
router.get('/rooms', flexibleAuth, hostelController.getAllRooms);
router.post('/rooms', flexibleAuth, hostelController.createRoom);
router.put('/rooms/:id', flexibleAuth, hostelController.updateRoom);
router.delete('/rooms/:id', flexibleAuth, hostelController.deleteRoom);

// Allocations Routes
router.get('/allocations', flexibleAuth, hostelController.getAllAllocations);
router.post('/allocations', flexibleAuth, hostelController.createAllocation);
router.put('/allocations/:id', flexibleAuth, hostelController.updateAllocation);
router.delete('/allocations/:id', flexibleAuth, hostelController.deleteAllocation);

// Wardens Routes
router.get('/wardens', flexibleAuth, hostelController.getAllWardens);
router.post('/wardens', flexibleAuth, hostelController.createWarden);
router.put('/wardens/:id', flexibleAuth, hostelController.updateWarden);
router.delete('/wardens/:id', flexibleAuth, hostelController.deleteWarden);

module.exports = router;
