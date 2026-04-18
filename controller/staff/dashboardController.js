const Student = require('../../model/Student');
const Teacher = require('../../model/Teacher');
const Staff = require('../../model/Staff');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const FeeCollection = require('../../model/FeeCollection');
const Event = require('../../model/Event');
const Leave = require('../../model/Leave');
const Attendance = require('../../model/Attendance');
const Approval = require('../../model/Approval');
const Hostel = require('../../model/Hostel');
const HostelAllocation = require('../../model/HostelAllocation');
const Vehicle = require('../../model/Vehicle');
const Route = require('../../model/Route');
const mongoose = require('mongoose');

exports.getDashboardStats = async (req, res) => {
  try {
    const staff = await Staff.findById(req.userId).lean();
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    const branchId = staff.branch;
    const clientId = staff.client;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalStudents,
      newAdmissions,
      feeCollectionRes,
      recentStudents,
      upcomingEvents
    ] = await Promise.all([
      Student.countDocuments({ branch: new mongoose.Types.ObjectId(branchId) }),
      Student.countDocuments({ branch: new mongoose.Types.ObjectId(branchId), createdAt: { $gte: thirtyDaysAgo } }),
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: new mongoose.Types.ObjectId(branchId),
            paymentDate: { 
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      Student.find({ branch: new mongoose.Types.ObjectId(branchId) })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName createdAt')
        .lean(),
      Event.find({ branch: new mongoose.Types.ObjectId(branchId), date: { $gte: new Date() } })
        .sort({ date: 1 })
        .limit(5)
        .select('title date type')
        .lean()
    ]);

    const feeCollection = feeCollectionRes[0]?.total || 0;

    // Generate recent activities based on recent students and upcoming events
    const recentActivities = [
      ...recentStudents.map(s => ({
        activity: `New Admission: ${s.firstName} ${s.lastName}`,
        time: new Date(s.createdAt).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : new Date(s.createdAt).toLocaleDateString()
      })),
      ...upcomingEvents.map(e => ({
        activity: `Upcoming Event: ${e.title}`,
        time: new Date(e.date).toLocaleDateString()
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    res.status(200).json({
      stats: {
        totalStudents,
        newAdmissions,
        feeCollection: `₹${feeCollection.toLocaleString()}`
      },
      recentActivities
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
