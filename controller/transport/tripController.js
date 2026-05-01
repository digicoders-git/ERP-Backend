const Trip = require('../../model/Trip');
const StopLog = require('../../model/StopLog');
const RouteStop = require('../../model/RouteStop');
const TransportAttendance = require('../../model/TransportAttendance');
const TransportAllocation = require('../../model/TransportAllocation');
const TransportNotification = require('../../model/TransportNotification');
const Notification = require('../../model/Notification');
const ParentStudent = require('../../model/ParentStudent');
const Driver = require('../../model/Driver');
const Student = require('../../model/Student');
const Route = require('../../model/Route');
const mongoose = require('mongoose');

const { emitToBranch, emitToTrip } = require('../../config/socket');

// ─── Helper: Notify ALL parents on a route (Trip Start/End) ──────────────────
const notifyAllRouteParents = async ({ trip, title, message, driverId, type = 'trip_event' }) => {
  try {
    const allocations = await TransportAllocation.find({
      route: trip.route,
      status: true
    }).populate({
      path: 'student',
      select: 'firstName lastName admissionNumber phone mobile guardianInfo'
    }).lean();

    const targetStudents = [];
    const studentIds = [];

    for (const alloc of allocations) {
      if (!alloc.student) continue;
      const s = alloc.student;
      targetStudents.push({
        student: s._id,
        studentName: `${s.firstName} ${s.lastName}`,
        parentPhone: s.guardianInfo?.guardianPhone || s.phone || '',
        emergencyPhone: s.guardianInfo?.emergencyPhone || s.mobile || ''
      });
      studentIds.push(s._id);
    }

    if (targetStudents.length === 0) return;

    const parentAccounts = await ParentStudent.find({
      role: 'parent',
      'children.studentId': { $in: studentIds }
    }).select('_id').lean();

    // Check for duplicate notification for this trip and type
    const existingNotif = await TransportNotification.findOne({
      trip: trip._id,
      notificationType: type === 'trip_started' ? 'trip_started' : 'trip_ended'
    });
    if (existingNotif) return;

    const transportNotif = new TransportNotification({
      notificationType: type === 'trip_started' ? 'trip_started' : 'trip_ended',
      title,
      message,
      trip: trip._id,
      targetStudents,
      parentAccounts: parentAccounts.map(p => p._id),
      deliveredTo: {
        students: studentIds.length,
        parents: parentAccounts.length
      },
      status: 'sent',
      branch: trip.branch,
      client: trip.client,
      createdBy: driverId
    });
    await transportNotif.save();

    // Emit live update
    emitToBranch(trip.branch, 'transport_notification', {
      title,
      message,
      tripId: trip._id,
      type: transportNotif.notificationType
    });

  } catch (error) {
    console.error('[TransportNotif] Error notifying route parents:', error);
  }
};

// ─── Helper: Notify parents at a SPECIFIC stop (Arrival) ─────────────────────
const notifyStopArrival = async ({ stopId, trip, driverId }) => {
  try {
    const stop = await RouteStop.findById(stopId).lean();
    if (!stop) return;

    const allocations = await TransportAllocation.find({
      routeStop: stopId,
      status: true
    }).populate({
      path: 'student',
      select: 'firstName lastName admissionNumber phone mobile guardianInfo'
    }).lean();

    const targetStudents = allocations.filter(a => a.student).map(a => ({
      student: a.student._id,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      parentPhone: a.student.guardianInfo?.guardianPhone || a.student.phone || '',
      emergencyPhone: a.student.guardianInfo?.emergencyPhone || a.student.mobile || ''
    }));

    if (targetStudents.length === 0) return;

    const studentIds = targetStudents.map(ts => ts.student);
    const parentAccounts = await ParentStudent.find({
      role: 'parent',
      'children.studentId': { $in: studentIds }
    }).select('_id').lean();

    // Check for duplicate arrival notification for this stop and trip
    const existingNotif = await TransportNotification.findOne({
      trip: trip._id,
      notificationType: 'van_departing', // re-using for arrival too as per current logic
      nextStop: stopId,
      title: '📍 Van Arrived at Stop'
    });
    if (existingNotif) return;

    const title = '📍 Van Arrived at Stop';
    const message = `The van has arrived at ${stop.stopName}. Please proceed for ${trip.type === 'morning' ? 'pickup' : 'drop'}.`;

    const transportNotif = new TransportNotification({
      notificationType: 'van_departing', // Re-using type or we could add 'stop_arrived'
      title,
      message,
      trip: trip._id,
      nextStop: stopId,
      targetStudents,
      parentAccounts: parentAccounts.map(p => p._id),
      deliveredTo: {
        students: studentIds.length,
        parents: parentAccounts.length
      },
      status: 'sent',
      branch: trip.branch,
      client: trip.client,
      createdBy: driverId
    });
    await transportNotif.save();

    // Real-time emit to trip room
    emitToTrip(trip._id, 'stop_arrival', { stopName: stop.stopName, tripId: trip._id });

  } catch (error) {
    console.error('[TransportNotif] Error notifying stop arrival:', error);
  }
};

// ─── Helper: Build full notification for next-stop parents + students ──────────
const notifyNextStop = async ({ nextStop, trip, fromStopName, driverId }) => {
  try {
    // ... existing logic ...
    const allocations = await TransportAllocation.find({
      routeStop: nextStop._id,
      status: true
    }).populate({
      path: 'student',
      select: 'firstName lastName admissionNumber phone mobile guardianInfo profileImage'
    }).lean();

    const targetStudents = [];
    const studentIds = [];

    for (const alloc of allocations) {
      if (!alloc.student) continue;
      const s = alloc.student;
      targetStudents.push({
        student: s._id,
        studentName: `${s.firstName} ${s.lastName}`,
        parentPhone: s.guardianInfo?.guardianPhone || s.phone || '',
        emergencyPhone: s.guardianInfo?.emergencyPhone || s.mobile || ''
      });
      studentIds.push(s._id);
    }

    if (targetStudents.length === 0) return;

    const parentAccounts = await ParentStudent.find({
      role: 'parent',
      'children.studentId': { $in: studentIds }
    }).select('_id').lean();

    const parentAccountIds = parentAccounts.map(p => p._id);
    const stopName = nextStop.stopName || 'your stop';
    
    // Check if school depart (first stop departure)
    const isSchoolDepart = fromStopName.toLowerCase().includes('school');
    const title = isSchoolDepart ? '🏫 Van Departed from School' : '🚌 Van is on the way!';
    const message = isSchoolDepart 
      ? `Van has left the school. Next stop: ${stopName}.`
      : `Van has departed from ${fromStopName}. Next stop: ${stopName}. Please be ready!`;

    const transportNotif = new TransportNotification({
      notificationType: 'van_departing',
      title,
      message,
      trip: trip._id,
      nextStop: nextStop._id,
      targetStudents,
      parentAccounts: parentAccountIds,
      deliveredTo: { students: studentIds.length, parents: parentAccountIds.length },
      status: 'sent',
      branch: trip.branch,
      client: trip.client,
      createdBy: driverId
    });
    await transportNotif.save();

    // Real-time emit
    emitToTrip(trip._id, 'next_stop', { nextStop: stopName, fromStop: fromStopName });

  } catch (error) {
    console.error('[TransportNotif] Error sending departure notification:', error);
  }
};

// ─── Helper: Notify parents when student is dropped (evening) ─────────────────
const notifyStudentDropped = async ({ studentIds, stopName, trip, driverId }) => {
  try {
    if (!studentIds || studentIds.length === 0) return;

    // Populate student info + guardian contacts
    const students = await Student.find({ _id: { $in: studentIds } })
      .select('firstName lastName guardianInfo phone mobile')
      .lean();

    const targetStudents = students.map(s => ({
      student: s._id,
      studentName: `${s.firstName} ${s.lastName}`,
      parentPhone: s.guardianInfo?.guardianPhone || s.phone || '',
      emergencyPhone: s.guardianInfo?.emergencyPhone || s.mobile || ''
    }));

    // Find parent accounts
    const parentAccounts = await ParentStudent.find({
      role: 'parent',
      'children.studentId': { $in: studentIds }
    }).select('_id').lean();

    const title = '✅ Child Dropped Safely';
    const message = `Your child has been dropped at ${stopName || 'the stop'} safely.`;

    const transportNotif = new TransportNotification({
      notificationType: 'student_dropped',
      title,
      message,
      trip: trip._id,
      nextStop: trip.route,
      targetStudents,
      parentAccounts: parentAccounts.map(p => p._id),
      deliveredTo: {
        students: studentIds.length,
        parents: parentAccounts.length
      },
      status: 'sent',
      branch: trip.branch,
      client: trip.client,
      createdBy: driverId
    });
    await transportNotif.save();

    console.log(`[TransportNotif] Drop notification sent for ${studentIds.length} students`);
  } catch (error) {
    console.error('[TransportNotif] Error sending drop notification:', error);
  }
};

// Start Trip
exports.startTrip = async (req, res) => {
  try {
    const { routeId, vehicleId, type } = req.body;
    const driverId = req.driverId || req.userId;

    // Check if driver already has an ongoing trip
    const existingTrip = await Trip.findOne({ driver: driverId, status: 'ongoing' });
    if (existingTrip) {
      return res.status(400).json({ message: 'You already have an ongoing trip.' });
    }

    const driver = await Driver.findById(driverId).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const trip = new Trip({
      driver: driverId,
      route: routeId,
      vehicle: vehicleId,
      type,
      status: 'ongoing',
      trackingStatus: 'started',
      currentStopIndex: 0,
      lastUpdated: new Date(),
      branch: driver.branch,
      client: driver.client
    });

    await trip.save();

    // Notify ALL parents on the route about trip start
    notifyAllRouteParents({
      trip,
      title: `🚌 ${type === 'morning' ? 'Morning' : 'Evening'} Trip Started`,
      message: `The transport trip for route ${routeId} has started. You can now track the van live!`,
      driverId,
      type: 'trip_started'
    });

    // Real-time emit to branch
    emitToBranch(driver.branch, 'trip_started', { tripId: trip._id, routeId, type });

    // Create StopLogs for all stops in the route
    const stops = await RouteStop.find({ route: routeId }).sort({ stopOrder: 1 });
    const stopLogs = stops.map(stop => ({
      trip: trip._id,
      stop: stop._id,
      status: 'pending',
      branch: driver.branch,
      client: driver.client
    }));

    await StopLog.insertMany(stopLogs);

    res.status(201).json({ message: 'Trip started successfully', trip, stops });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Arrive at Stop
exports.arriveAtStop = async (req, res) => {
  try {
    const { tripId, stopId } = req.body;
    
    const stopLog = await StopLog.findOne({ trip: tripId, stop: stopId });
    if (!stopLog) return res.status(404).json({ message: 'Stop log not found' });

    if (stopLog.status !== 'pending') {
      return res.status(400).json({ message: 'Stop already processed' });
    }

    const trip = await Trip.findById(tripId);
    const stops = await RouteStop.find({ route: trip.route }).sort({ stopOrder: 1 }).lean();
    const currentStop = stops.find(s => s._id.toString() === stopId);
    
    if (!currentStop) {
      return res.status(404).json({ message: 'Stop not found in route' });
    }

    stopLog.arrivalTime = new Date();
    stopLog.status = 'arrived';
    await stopLog.save();

    // Update Trip tracking state
    trip.trackingStatus = 'arrived';
    trip.currentStop = stopId;
    trip.currentStopIndex = stops.findIndex(s => s._id.toString() === stopId);
    trip.lastUpdated = new Date();
    await trip.save();

    // Notify parents at this stop
    notifyStopArrival({ stopId, trip, driverId: trip.driver });

    // Real-time update for parents
    const updatePayload = {
      tripId,
      status: 'arrived',
      currentStop: currentStop.stopName,
      lastUpdated: trip.lastUpdated
    };
    emitToTrip(tripId, 'trip_update', updatePayload);
    emitToTrip(tripId, 'stop_arrival', { stopId, stopName: currentStop.stopName });

    res.status(200).json({ message: 'Arrived at stop', stopLog });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark Attendance
exports.markAttendance = async (req, res) => {
  try {
    const { tripId, stopId, attendanceData } = req.body; // attendanceData: [{studentId, status}]
    const driverId = req.driverId || req.userId;

    const trip = await Trip.findById(tripId).lean();
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const attendanceRecords = attendanceData.map(item => ({
      driver: driverId,
      route: trip.route,
      routeStop: stopId,
      vehicle: trip.vehicle,
      trip: tripId,
      student: item.studentId,
      attendanceType: trip.type === 'morning' ? 'pickup' : 'drop',
      status: item.status,
      date: new Date(),
      branch: trip.branch,
      client: trip.client
    }));

    await TransportAttendance.insertMany(attendanceRecords);

    // If evening (drop), notify parents + students with full details
    if (trip.type === 'evening') {
      const presentStudents = attendanceData.filter(i => i.status === 'present').map(i => i.studentId);
      if (presentStudents.length > 0) {
        // Get the current stop name for the message
        const currentStopDoc = await RouteStop.findById(stopId).select('stopName').lean();
        await notifyStudentDropped({
          studentIds: presentStudents,
          stopName: currentStopDoc?.stopName || 'the stop',
          trip,
          driverId
        });
      }
    }

    res.status(200).json({ message: 'Attendance marked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Depart Stop
exports.departStop = async (req, res) => {
  try {
    const { tripId, stopId } = req.body;
    const driverId = req.driverId || req.userId;

    const stopLog = await StopLog.findOne({ trip: tripId, stop: stopId });
    if (!stopLog) return res.status(404).json({ message: 'Stop log not found' });

    // Get current stop name before updating
    const currentStopDoc = await RouteStop.findById(stopId).select('stopName').lean();
    const fromStopName = currentStopDoc?.stopName || 'previous stop';

    stopLog.departureTime = new Date();
    stopLog.status = 'departed';
    await stopLog.save();

    // Update trip current stop index and tracking state
    const trip = await Trip.findById(tripId);
    trip.currentStopIndex += 1;
    trip.trackingStatus = 'moving';
    trip.lastUpdated = new Date();
    
    // Find next stop info
    const stops = await RouteStop.find({ route: trip.route }).sort({ stopOrder: 1 });
    const nextStop = stops[trip.currentStopIndex];
    
    if (nextStop) {
      trip.nextStop = nextStop._id;
    }
    
    await trip.save();

    // Notify students + parents at the NEXT stop with full details

    if (nextStop) {
      notifyNextStop({
        nextStop,
        trip,
        fromStopName,
        driverId
      }).catch(err => console.error('[departStop] Notification error:', err));

      // Real-time update for parents
      emitToTrip(tripId, 'trip_update', {
        tripId,
        status: 'moving',
        nextStop: nextStop.stopName,
        fromStop: fromStopName,
        lastUpdated: trip.lastUpdated
      });

      emitToTrip(tripId, 'next_stop', { 
        nextStop: nextStop.stopName,
        fromStop: fromStopName
      });
    } else {
      // If no next stop, it might be heading to school/depot
      emitToTrip(tripId, 'trip_update', {
        tripId,
        status: 'moving',
        nextStop: 'School/Depot',
        fromStop: fromStopName,
        lastUpdated: trip.lastUpdated
      });
      
      emitToTrip(tripId, 'next_stop', { 
        nextStop: 'Final Destination',
        fromStop: fromStopName
      });
    }

    res.status(200).json({ 
      message: 'Departed from stop', 
      stopLog, 
      nextStop: nextStop || null,
      notificationSent: !!nextStop
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// End Trip
exports.endTrip = async (req, res) => {
  try {
    const { tripId } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    trip.status = 'completed';
    trip.endTime = new Date();
    await trip.save();

    // Notify ALL parents on the route about trip completion
    notifyAllRouteParents({
      trip,
      title: '🏁 Trip Completed',
      message: `The transport trip has been completed successfully.`,
      driverId: trip.driver,
      type: 'trip_ended'
    });

    // Real-time emit
    emitToTrip(tripId, 'trip_completed', { tripId });

    res.status(200).json({ message: 'Trip completed successfully', trip });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Active Trip
exports.getActiveTrip = async (req, res) => {
  try {
    const driverId = req.userId;
    const trip = await Trip.findOne({ driver: driverId, status: 'ongoing' })
      .populate('route')
      .populate('vehicle')
      .lean();

    if (!trip) return res.status(200).json({ trip: null });

    const stopLogs = await StopLog.find({ trip: trip._id })
      .populate('stop')
      .sort({ 'stop.stopOrder': 1 })
      .lean();

    // Get students for each stop
    const stopsWithStudents = await Promise.all(stopLogs.map(async (log) => {
      const allocations = await TransportAllocation.find({ 
        routeStop: log.stop._id,
        status: true 
      }).populate('student', 'firstName lastName admissionNumber profileImage').lean();
      
      return {
        ...log,
        students: allocations.map(a => a.student)
      };
    }));

    res.status(200).json({ trip, stopLogs: stopsWithStudents });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Get Active Trip for a Student (Real-time Status) ────────────────────────
exports.getStudentActiveTrip = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }

    const sId = new mongoose.Types.ObjectId(studentId);

    // 1. Find allocation for student - check both student field and by name
    let allocation = await TransportAllocation.findOne({ 
      $or: [
        { student: sId, status: true },
        { student: { $exists: false }, userType: 'student', status: true }
      ]
    }).lean();
    
    if (!allocation) {
      // Fallback: Try finding by student name
      const student = await Student.findById(sId).select('firstName lastName branch').lean();
      if (student) {
        const namePattern = new RegExp(`${student.firstName}.*${student.lastName}`, 'i');
        allocation = await TransportAllocation.findOne({ 
          userName: namePattern,
          branch: student.branch,
          userType: 'student',
          status: true
        }).lean();
      }
    }

    if (!allocation) {
      return res.status(404).json({ message: 'No transport allocation found for this student.' });
    }

    console.log(`[TrackTrip] Allocation found - Route: ${allocation.route}, Stop: ${allocation.routeStop}`);

    // 2. Find any ongoing trip for this route
    const trip = await Trip.findOne({ 
      route: allocation.route,
      status: 'ongoing' 
    })
    .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
    .populate('route', 'routeName routeCode')
    .populate('currentStop', 'stopName stopOrder')
    .populate('nextStop', 'stopName stopOrder')
    .lean();

    if (!trip) {
      return res.status(200).json({ trip: null, message: 'No ongoing trip for this route' });
    }

    // 3. Get stop logs for this trip with populated stop details
    const stopLogs = await StopLog.find({ trip: trip._id })
      .populate('stop', 'stopName stopOrder pickupTime dropTime')
      .sort({ 'stop.stopOrder': 1 })
      .lean();

    res.status(200).json({ trip, stopLogs });
  } catch (error) {
    console.error('[TrackTrip] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Get Transport Notifications for a Student ─────────────────────────────────
exports.getStudentNotifications = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const notifications = await TransportNotification.find({
      'targetStudents.student': new mongoose.Types.ObjectId(studentId)
    })
      .populate('nextStop', 'stopName stopOrder')
      .populate('trip', 'type status startTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Filter the targetStudents array to only include the queried student
    const formatted = notifications.map(n => ({
      _id: n._id,
      notificationType: n.notificationType,
      title: n.title,
      message: n.message,
      nextStop: n.nextStop,
      trip: n.trip,
      student: n.targetStudents.find(s => s.student?.toString() === studentId),
      createdAt: n.createdAt
    }));

    const total = await TransportNotification.countDocuments({
      'targetStudents.student': new mongoose.Types.ObjectId(studentId)
    });

    res.status(200).json({
      success: true,
      notifications: formatted,
      total,
      unread: formatted.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Get Transport Notifications for a Parent ──────────────────────────────────
exports.getParentNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Find parent account and get linked children IDs
    const parent = await ParentStudent.findById(userId).select('children role').lean();
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent account required.' });
    }

    const childIds = (parent.children || []).map(c => c.studentId).filter(Boolean);

    if (childIds.length === 0) {
      return res.status(200).json({ success: true, notifications: [], total: 0 });
    }

    const notifications = await TransportNotification.find({
      'targetStudents.student': { $in: childIds }
    })
      .populate('nextStop', 'stopName stopOrder')
      .populate('trip', 'type status startTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enrich with only children that belong to this parent
    const formatted = notifications.map(n => ({
      _id: n._id,
      notificationType: n.notificationType,
      title: n.title,
      message: n.message,
      nextStop: n.nextStop,
      trip: n.trip,
      affectedChildren: n.targetStudents.filter(s =>
        childIds.some(cid => cid.toString() === s.student?.toString())
      ),
      createdAt: n.createdAt
    }));

    const total = await TransportNotification.countDocuments({
      'targetStudents.student': { $in: childIds }
    });

    res.status(200).json({
      success: true,
      notifications: formatted,
      total,
      childrenCount: childIds.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
