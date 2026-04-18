const Leave = require('../model/Leave');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');

const getBranch = async (userId) => {
  // Try Admin first
  let user = await Admin.findById(userId).select('branch role').lean();
  if (user?.branch) return user.branch;
  
  // Try Staff if not found in Admin
  user = await Staff.findById(userId).select('branch').lean();
  return user?.branch || null;
};

// Apply Leave
exports.applyLeave = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { staffName, staffId, leaveType, startDate, endDate, reason } = req.body;
    
    if (!staffName || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ 
        message: 'All fields are required',
        required: ['staffName', 'leaveType', 'startDate', 'endDate', 'reason'],
        received: { staffName, leaveType, startDate, endDate, reason }
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return res.status(400).json({ message: 'End date must be after start date' });

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leaveData = {
      branch, 
      staffName, 
      leaveType, 
      startDate: start, 
      endDate: end, 
      days, 
      reason, 
      appliedBy: req.userId
    };
    
    if (staffId) leaveData.staffId = staffId;

    const leave = await Leave.create(leaveData);

    res.status(201).json({ message: 'Leave applied successfully', leave });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Leaves (with filters, fast lean query)
exports.getAllLeaves = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { status, leaveType, search } = req.query;
    const query = { branch };
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (search) query.staffName = { $regex: search, $options: 'i' };

    const [leaves, stats] = await Promise.all([
      Leave.find(query).sort({ createdAt: -1 }).populate('staffId', 'name profileImage email').lean(),
      Leave.aggregate([
        { $match: { branch } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const statsMap = { pending: 0, approved: 0, rejected: 0 };
    stats.forEach(s => { statsMap[s._id] = s.count; });

    res.status(200).json({ leaves, stats: statsMap });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Leave
exports.updateLeave = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    let { staffName, name, staffId, leaveType, type, startDate, fromDate, endDate, toDate, reason } = req.body;
    
    // Support multiple field name formats
    staffName = staffName || name;
    leaveType = leaveType || type;
    startDate = startDate || fromDate;
    endDate = endDate || toDate;

    const leave = await Leave.findOne({ _id: req.params.id, branch });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    if (staffName) leave.staffName = staffName;
    if (staffId) leave.staffId = staffId;
    if (leaveType) leave.leaveType = leaveType;
    if (reason) leave.reason = reason;
    
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : leave.startDate;
      const end = endDate ? new Date(endDate) : leave.endDate;
      
      if (end < start) return res.status(400).json({ message: 'End date must be after start date' });
      
      leave.startDate = start;
      leave.endDate = end;
      leave.days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    await leave.save();
    res.status(200).json({ message: 'Leave updated successfully', leave });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Leave Status
exports.updateLeaveStatus = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const leave = await Leave.findOneAndUpdate(
      { _id: req.params.id, branch },
      { status, reviewNote, reviewedBy: req.userId },
      { new: true }
    ).lean();

    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.status(200).json({ message: `Leave ${status} successfully`, leave });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Leave
exports.deleteLeave = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const leave = await Leave.findOneAndDelete({ _id: req.params.id, branch });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.status(200).json({ message: 'Leave deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
