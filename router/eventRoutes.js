const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/create', flexibleAuth, eventController.createEvent);
router.get('/all', flexibleAuth, eventController.getAllEvents);
router.put('/update/:id', flexibleAuth, eventController.updateEvent);
router.patch('/:id/status', flexibleAuth, eventController.updateEventStatus);
router.delete('/delete/:id', flexibleAuth, eventController.deleteEvent);

module.exports = router;
