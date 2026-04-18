const Staff = require('../../model/Staff');
const Admin = require('../../model/Admin');
const Attendance = require('../../model/Attendance');
const Leave = require('../../model/Leave');
const mongoose = require('mongoose');

exports.getAllStaff = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user?.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user?.client ? new mongoose.Types.ObjectId(req.user.client) : null;

    const query = {};
    if (adminBranch) query.branch = adminBranch;
    else if (branch) query.branch = new mongoose.Types.ObjectId(branch);
    else if (adminClient) query.client = adminClient;
    if (status !== 'all') query.status = status === 'active';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const [staff, total] = await Promise.all([
      Staff.find(query)
        .select('name email mobile qualification experience salary status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Staff.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: staff,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStaffStats = async (req, res) => {
  try {
    const adminBranch = req.user?.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user?.client ? new mongoose.Types.ObjectId(req.user.client) : null;

    const matchQuery = adminBranch
      ? { branch: adminBranch }
      : adminClient
      ? { client: adminClient }
      : {};

    const stats = await Staff.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: true } }, { $count: 'count' }],
          inactive: [{ $match: { status: false } }, { $count: 'count' }],
          avgSalary: [{ $group: { _id: null, avg: { $avg: '$salary' } } }],
          byQualification: [
            { $group: { _id: '$qualification', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const result = {
      total: stats[0].total[0]?.count || 0,
      active: stats[0].active[0]?.count || 0,
      inactive: stats[0].inactive[0]?.count || 0,
      avgSalary: Math.round(stats[0].avgSalary[0]?.avg || 0),
      byQualification: stats[0].byQualification
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStaffWithAttendance = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user?.branch || branch;

    const query = {};
    if (adminBranch) query.branch = adminBranch;
    query.status = true;

    const staff = await Staff.find(query)
      .select('_id name email mobile')
      .limit(parseInt(limit))
      .lean();

    const staffIds = staff.map(s => s._id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.aggregate([
      {
        $match: {
          staffId: { $in: staffIds },
          date: { $gte: today },
          type: 'staff'
        }
      },
      {
        $group: {
          _id: '$staffId',
          status: { $first: '$status' },
          time: { $first: '$time' }
        }
      }
    ]);

    const attMap = {};
    attendance.forEach(a => {
      attMap[a._id.toString()] = { status: a.status, time: a.time };
    });

    const result = staff.map(s => ({
      ...s,
      todayAttendance: attMap[s._id.toString()] || { status: 'absent', time: null }
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { name, email, mobile, qualification, experience, salary, address } = req.body;
    const adminBranch = req.user?.branch;

    if (!name || !email || !mobile) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    // Check if email already exists in Admin
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email already exists in Admin' });
    }

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ success: false, message: 'Email already exists in Staff' });
    }

    const staff = new Staff({
      name,
      email,
      mobile,
      qualification,
      experience,
      salary,
      address,
      branch: adminBranch,
      client: req.user?.client,
      createdBy: req.userId,
      status: true
    });

    await staff.save();

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: staff
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { name, email, mobile, qualification, experience, salary, address, status } = req.body;

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { name, email, mobile, qualification, experience, salary, address, status },
      { new: true, runValidators: true }
    );

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      data: staff
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findByIdAndDelete(staffId);

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff deleted successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStaffLeaves = async (req, res) => {
  try {
    const { branch, status = 'all' } = req.query;
    const adminBranch = req.user?.branch || branch;

    const query = {};
    if (adminBranch) query.branch = adminBranch;
    if (status !== 'all') query.status = status;

    const leaves = await Leave.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'staffs',
          localField: 'staffId',
          foreignField: '_id',
          as: 'staffDetails'
        }
      },
      { $unwind: '$staffDetails' },
      {
        $project: {
          _id: 1,
          staffName: '$staffDetails.name',
          staffEmail: '$staffDetails.email',
          leaveType: 1,
          startDate: 1,
          endDate: 1,
          reason: 1,
          status: 1,
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 50 }
    ]);

    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStaffDashboard = async (req, res) => {
  try {
    const adminBranch = req.user?.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user?.client ? new mongoose.Types.ObjectId(req.user.client) : null;

    const query = {};
    if (adminBranch) query.branch = adminBranch;
    else if (adminClient) query.client = adminClient;

    const [stats, recentStaff, onLeave, todayAttendance] = await Promise.all([
      Staff.aggregate([
        { $match: query },
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: true } }, { $count: 'count' }]
          }
        }
      ]),
      Staff.find(query)
        .select('name email mobile qualification')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Leave.find(query)
        .populate('staffId', 'name email')
        .limit(5)
        .lean(),
      Attendance.aggregate([
        {
          $match: {
            ...query,
            date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            type: 'staff'
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const attMap = {};
    todayAttendance.forEach(a => {
      attMap[a._id] = a.count;
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total: stats[0].total[0]?.count || 0,
          active: stats[0].active[0]?.count || 0
        },
        recentStaff,
        onLeave,
        todayAttendance: {
          present: attMap.present || 0,
          absent: attMap.absent || 0,
          late: attMap.late || 0
        }
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
