const express = require('express');
const router = express.Router();
const bookRequestController = require('../../controller/library/bookRequestController');
const auth = require('../../middleware/auth');

// Stats route must come before :id route to avoid conflict
router.get('/stats', auth, bookRequestController.getRequestStats);

// Status route must come before :id route
router.get('/status/:status', auth, bookRequestController.getRequestsByStatus);

// Student route must come before :id route
router.get('/student/:studentId', auth, bookRequestController.getRequestsByStudent);

// All requests route
router.get('/all', auth, bookRequestController.getAllRequests);

// Main CRUD routes
router.get('/', auth, bookRequestController.getAllRequests);
router.post('/', auth, bookRequestController.createRequest);
router.get('/:id', auth, bookRequestController.getRequestById);
router.put('/:id/approve', auth, bookRequestController.approveRequest);
router.put('/:id/reject', auth, bookRequestController.rejectRequest);
router.put('/:id/fulfill', auth, bookRequestController.fulfillRequest);
router.delete('/:id', auth, bookRequestController.deleteRequest);

module.exports = router;
