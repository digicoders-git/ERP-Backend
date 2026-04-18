const Student = require('../model/Student');
const Attendance = require('../model/Attendance');
const Fee = require('../model/Fee');
const mongoose = require('mongoose');

exports.getStudentStats = async (req, res) => {
  try {
    const { branch } = req.query;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;

    const matchQuery = adminBranch
      ? { branch: adminBranch }
      : branch
      ? { branch: new mongoose.Types.ObjectId(branch) }
      : adminClient
      ? { client: adminClient }
      : {};

    const stats = await Student.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: 'active' } }, { $count: 'count' }],
          inactive: [{ $match: { status: 'inactive' } }, { $count: 'count' }],
          byClass: [
            { $group: { _id: '$class', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: stats[0].total[0]?.count || 0,
        active: stats[0].active[0]?.count || 0,
        inactive: stats[0].inactive[0]?.count || 0,
        byClass: stats[0].byClass
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;

    const query = {};
    if (adminBranch) query.branch = adminBranch;
    else if (branch) query.branch = new mongoose.Types.ObjectId(branch);
    else if (adminClient) query.client = adminClient;
    if (status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('firstName lastName email admissionNumber rollNumber class section status createdAt')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentWithAttendance = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user.branch;

    const students = await Student.find({ branch: adminBranch || branch, status: 'active' })
      .select('_id firstName email')
      .limit(parseInt(limit))
      .lean();

    const studentIds = students.map(s => s._id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.aggregate([
      {
        $match: {
          studentId: { $in: studentIds },
          date: { $gte: today },
          type: 'student'
        }
      },
      {
        $group: {
          _id: '$studentId',
          status: { $first: '$status' },
          time: { $first: '$time' }
        }
      }
    ]);

    const attMap = {};
    attendance.forEach(a => {
      attMap[a._id.toString()] = { status: a.status, time: a.time };
    });

    const result = students.map(s => ({
      ...s,
      todayAttendance: attMap[s._id.toString()] || { status: 'absent', time: null }
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentFeeStatus = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user.branch;

    const students = await Student.find({ branch: adminBranch || branch, status: 'active' })
      .select('_id firstName email')
      .limit(parseInt(limit))
      .lean();

    const studentIds = students.map(s => s._id);

    const feeStatus = await Fee.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      {
        $group: {
          _id: '$studentId',
          totalFee: { $sum: '$amount' },
          paid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const feeMap = {};
    feeStatus.forEach(f => {
      feeMap[f._id.toString()] = {
        totalFee: f.totalFee,
        paid: f.paid,
        pending: f.pending,
        percentage: Math.round((f.paid / f.totalFee) * 100)
      };
    });

    const result = students.map(s => ({
      ...s,
      feeStatus: feeMap[s._id.toString()] || { totalFee: 0, paid: 0, pending: 0, percentage: 0 }
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentDashboard = async (req, res) => {
  try {
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const matchQuery = adminBranch ? { branch: adminBranch } : adminClient ? { client: adminClient } : {};

    const [stats, recentStudents, activeStudents, totalEnrolled] = await Promise.all([
      Student.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: 'active' } }, { $count: 'count' }],
            inactive: [{ $match: { status: 'inactive' } }, { $count: 'count' }]
          }
        }
      ]),
      Student.find({ ...matchQuery, status: 'active' })
        .select('firstName email admissionNumber')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Student.countDocuments({ ...matchQuery, status: 'active' }),
      Student.countDocuments({ ...matchQuery, applicationStatus: 'enrolled' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total: stats[0].total[0]?.count || 0,
          active: stats[0].active[0]?.count || 0,
          inactive: stats[0].inactive[0]?.count || 0
        },
        recentStudents,
        activeStudents,
        totalEnrolled
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
