const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const Fee = require('../../model/Fee');
const Event = require('../../model/Event');
const Leave = require('../../model/Leave');
const Attendance = require('../../model/Attendance');

exports.getDashboardStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    const branchId = admin.branch;

    // Parallel queries for faster response
    const [
      totalStudents,
      newAdmissions,
      todayAttendance,
      pendingLeaves,
      upcomingEvents,
      monthlyFeeCollection,
      recentActivities
    ] = await Promise.all([
      Student.countDocuments({ branch: branchId, status: 'active' }),
      Student.countDocuments({ 
        branch: branchId, 
        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
      }),
      Attendance.countDocuments({ 
        branch: branchId, 
        date: new Date().toISOString().split('T')[0],
        status: 'present'
      }),
      Leave.countDocuments({ branch: branchId, status: 'pending' }),
      Event.find({ branch: branchId, date: { $gte: new Date() } })
        .sort({ date: 1 })
        .limit(5)
        .select('title date type')
        .lean(),
      Fee.aggregate([
        { 
          $match: { 
            branch: branchId,
            createdAt: { 
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      Student.find({ branch: branchId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name admissionNumber createdAt')
        .lean()
    ]);

    const feeCollection = monthlyFeeCollection[0]?.total || 0;

    res.status(200).json({
      stats: {
        totalStudents,
        newAdmissions,
        todayAttendance,
        pendingLeaves,
        feeCollection: `₹${(feeCollection / 100000).toFixed(1)}L`
      },
      upcomingEvents,
      recentActivities: recentActivities.map(s => ({
        activity: `New admission: ${s.name}`,
        time: getTimeAgo(s.createdAt),
        type: 'admission'
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
