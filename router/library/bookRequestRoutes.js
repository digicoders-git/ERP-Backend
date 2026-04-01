const express = require('express');
const router = express.Router();
const bookRequestController = require('../../controller/library/bookRequestController');

router.get('/', bookRequestController.getAllRequests);
router.get('/stats', bookRequestController.getRequestStats);
router.get('/:id', bookRequestController.getRequestById);
router.get('/status/:status', bookRequestController.getRequestsByStatus);
router.get('/student/:studentId', bookRequestController.getRequestsByStudent);
router.post('/', bookRequestController.createRequest);
router.put('/:id/approve', bookRequestController.approveRequest);
router.put('/:id/reject', bookRequestController.rejectRequest);
router.put('/:id/fulfill', bookRequestController.fulfillRequest);
router.delete('/:id', bookRequestController.deleteRequest);

module.exports = router;
