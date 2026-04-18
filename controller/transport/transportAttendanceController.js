const TransportAttendance = require('../../model/TransportAttendance');
const TransportAssignment = require('../../model/TransportAssignment');
const TransportAllocation = require('../../model/TransportAllocation');
const RouteStop = require('../../model/RouteStop');
const Driver = require('../../model/Driver');
const Notification = require('../../model/Notification');

// Get today's route with all stops and students
exports.getTodayRoute = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await TransportAssignment.findOne({ 
      driver: req.driverId, 
      status: true 
    })
      .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
      .populate('route', 'routeName routeCode startPoint endPoint totalDistance')
      .lean();

    if (!assignment || !assignment.route) {
      return res.status(404).json({ 
        success: false, 
        message: !assignment ? 'No active assignment found' : 'Assigned route no longer exists' 
      });
    }

    const routeStops = await RouteStop.find({ route: assignment.route._id })
      .sort({ stopOrder: 1 })
      .lean();

    const students = await TransportAllocation.find({
      route: assignment.route._id,
      status: true
    })
      .populate('routeStop', 'stopName stopOrder pickupTime dropTime latitude longitude')
      .populate('student', 'name rollNo class parentPhone parentEmail')
      .lean();

    // Get today's attendance
    const todayAttendance = await TransportAttendance.find({
      driver: req.driverId,
      date: { $gte: today }
    })
      .lean();

    // Group students by stop
    const stopWiseStudents = {};
    routeStops.forEach(stop => {
      stopWiseStudents[stop._id] = [];
    });

    students.forEach(student => {
      const stopId = student.routeStop?._id?.toString() || student.routeStop?.toString();
      
      if (stopId && stopWiseStudents[stopId]) {
        // Find attendance for this student today
        const attendance = todayAttendance.find(a => {
          // Match by linked ID if available
          if (a.student && student.student) {
            return a.student.toString() === student.student._id?.toString() || 
                   a.student.toString() === student.student.toString();
          }
          // Fallback: Match by name if links are missing
          return a.studentName === student.userName;
        });

        stopWiseStudents[stopId].push({
          ...student,
          attendance
        });
      }
    });

    res.status(200).json({
      success: true,
      assignment,
      routeStops,
      stopWiseStudents,
      todayAttendance
    });
  } catch (error) {
    console.error('getTodayRoute Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Mark attendance for a student
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, routeStopId, attendanceType, status, latitude, longitude, location, notes } = req.body;

    if (!studentId || !routeStopId || !attendanceType || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'studentId, routeStopId, attendanceType, and status are required' 
      });
    }

    const driver = await Driver.findById(req.driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const assignment = await TransportAssignment.findOne({ 
      driver: req.driverId, 
      status: true 
    }).lean();

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'No active assignment' });
    }

    const student = await TransportAllocation.findById(studentId)
      .populate('student', 'name rollNo class parentPhone parentEmail')
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const routeStop = await RouteStop.findById(routeStopId).lean();
    if (!routeStop) {
      return res.status(404).json({ success: false, message: 'Route stop not found' });
    }

    // Create attendance record
    const attendance = new TransportAttendance({
      driver: req.driverId,
      route: assignment.route,
      routeStop: routeStopId,
      vehicle: assignment.vehicle,
      student: (student.student && (student.student._id || student.student)) || null,
      studentName: (student.student && student.student.name) || student.userName,
      parentPhone: (student.student && student.student.parentPhone) || null,
      parentEmail: (student.student && student.student.parentEmail) || null,
      attendanceType,
      status,
      scheduledTime: attendanceType === 'pickup' ? routeStop.pickupTime : routeStop.dropTime,
      latitude,
      longitude,
      location,
      notes,
      date: new Date(),
      branch: driver.branch,
      client: driver.client
    });

    await attendance.save();

    // Send notification to parent
    await sendParentNotification(student, attendanceType, routeStop, driver);

    res.status(201).json({
      success: true,
      message: `${attendanceType} attendance marked`,
      attendance
    });
  } catch (error) {
    console.error('markAttendance Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get attendance for a specific stop
exports.getStopAttendance = async (req, res) => {
  try {
    const { routeStopId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await TransportAttendance.find({
      driver: req.driverId,
      routeStop: routeStopId,
      date: { $gte: today }
    })
      .populate('student', 'name rollNo class')
      .lean();

    res.status(200).json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error('getStopAttendance Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update stop status (departed/arrived)
exports.updateStopStatus = async (req, res) => {
  try {
    const { routeStopId, status, latitude, longitude } = req.body;

    if (!routeStopId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'routeStopId and status are required' 
      });
    }

    const driver = await Driver.findById(req.driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const assignment = await TransportAssignment.findOne({ 
      driver: req.driverId, 
      status: true 
    })
      .populate('route')
      .lean();

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'No active assignment' });
    }

    const routeStop = await RouteStop.findById(routeStopId).lean();
    if (!routeStop) {
      return res.status(404).json({ success: false, message: 'Route stop not found' });
    }

    // Get all students at this stop
    const students = await TransportAllocation.find({
      route: assignment.route._id,
      routeStop: routeStopId,
      status: true
    })
      .populate('student', 'parentPhone parentEmail')
      .lean();

    // Send notification to all parents
    if (status === 'departed') {
      for (const student of students) {
        await sendDepartureNotification(student, routeStop, driver);
      }
    }

    res.status(200).json({
      success: true,
      message: `Stop status updated to ${status}`,
      notificationsSent: students.length
    });
  } catch (error) {
    console.error('updateStopStatus Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get daily attendance summary
exports.getDailyAttendanceSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await TransportAttendance.find({
      driver: req.driverId,
      date: { $gte: today }
    })
      .populate('routeStop', 'stopName stopOrder')
      .lean();

    const summary = {
      totalStudents: 0,
      presentPickup: 0,
      absentPickup: 0,
      latePickup: 0,
      presentDrop: 0,
      absentDrop: 0,
      lateDrop: 0,
      byStop: {}
    };

    attendance.forEach(record => {
      summary.totalStudents++;
      
      if (record.attendanceType === 'pickup') {
        if (record.status === 'present') summary.presentPickup++;
        else if (record.status === 'absent') summary.absentPickup++;
        else if (record.status === 'late') summary.latePickup++;
      } else {
        if (record.status === 'present') summary.presentDrop++;
        else if (record.status === 'absent') summary.absentDrop++;
        else if (record.status === 'late') summary.lateDrop++;
      }

      const stopId = record.routeStop._id.toString();
      if (!summary.byStop[stopId]) {
        summary.byStop[stopId] = {
          stopName: record.routeStop.stopName,
          total: 0,
          present: 0,
          absent: 0,
          late: 0
        };
      }
      summary.byStop[stopId].total++;
      if (record.status === 'present') summary.byStop[stopId].present++;
      else if (record.status === 'absent') summary.byStop[stopId].absent++;
      else if (record.status === 'late') summary.byStop[stopId].late++;
    });

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('getDailyAttendanceSummary Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Helper function to send parent notification
async function sendParentNotification(student, attendanceType, routeStop, driver) {
  try {
    const message = attendanceType === 'pickup'
      ? `Your child has been picked up at ${routeStop.stopName} at ${new Date().toLocaleTimeString()}`
      : `Your child has been dropped at ${routeStop.stopName} at ${new Date().toLocaleTimeString()}`;

    // Create notification record
    const studentId = student.student?._id || student.student;
    if (studentId && (student.student?.parentPhone || student.student?.parentEmail)) {
      const notification = new Notification({
        recipient: studentId,
        type: 'transport',
        title: `${attendanceType === 'pickup' ? 'Pickup' : 'Drop'} Confirmation`,
        message,
        data: {
          driverId: driver._id,
          routeStop: routeStop._id,
          attendanceType
        }
      });
      await notification.save();
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Helper function to send departure notification
async function sendDepartureNotification(student, routeStop, driver) {
  try {
    const message = `Vehicle has departed from ${routeStop.stopName}. Next stop: ${routeStop.stopName}`;

    const studentId = student.student?._id || student.student;
    if (studentId && (student.student?.parentPhone || student.student?.parentEmail)) {
      const notification = new Notification({
        recipient: studentId,
        type: 'transport',
        title: 'Vehicle Departed',
        message,
        data: {
          driverId: driver._id,
          routeStop: routeStop._id
        }
      });
      await notification.save();
    }
  } catch (error) {
    console.error('Error sending departure notification:', error);
  }
}
