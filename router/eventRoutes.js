const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController');
const auth = require('../middleware/auth');

router.post('/create', auth, eventController.createEvent);
router.get('/all', auth, eventController.getAllEvents);
router.put('/update/:id', auth, eventController.updateEvent);
router.patch('/:id/status', auth, eventController.updateEventStatus);
router.delete('/delete/:id', auth, eventController.deleteEvent);

module.exports = router;
