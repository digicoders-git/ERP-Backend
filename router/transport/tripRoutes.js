const express = require('express');
const router = express.Router();
const tripController = require('../../controller/transport/tripController');
const driverAuth = require('../../middleware/driverAuth');
const flexibleAuth = require('../../middleware/flexibleAuth');

router.get('/active', driverAuth, tripController.getActiveTrip);
router.post('/start', driverAuth, tripController.startTrip);
router.post('/arrive', driverAuth, tripController.arriveAtStop);
router.post('/attendance', driverAuth, tripController.markAttendance);
router.post('/depart', driverAuth, tripController.departStop);
router.post('/end', driverAuth, tripController.endTrip);

// Notification fetch routes (for Parent/Student panel)
router.get('/notifications/student/:studentId', flexibleAuth, tripController.getStudentNotifications);
router.get('/notifications/parent', flexibleAuth, tripController.getParentNotifications);
router.get('/active/student/:studentId', flexibleAuth, tripController.getStudentActiveTrip);

module.exports = router;
