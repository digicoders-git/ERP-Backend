const mongoose = require('mongoose');
const FeeCollection = require('../../model/FeeCollection');
const Student = require('../../model/Student');
const FeeStructure = require('../../model/FeeStructure');
const Admin = require('../../model/Admin');


// Get Dashboard Summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    const branchId = new mongoose.Types.ObjectId(admin.branch);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [
      totalStudents,
      totalFeeCollected,
      totalPending,
      recentCollections,
      pendingPayments,
      todayCollection,
      lastMonthCollection
    ] = await Promise.all([
      Student.countDocuments({ branch: branchId }),
      
      FeeCollection.aggregate([
        { $match: { branch: branchId, status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      
      FeeCollection.aggregate([
        { $match: { branch: branchId, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]),
      
      FeeCollection.find({ branch: branchId, status: { $in: ['paid', 'partial'] } })
        .populate({
          path: 'student',
          select: 'firstName lastName class admissionNumber',
          populate: { path: 'class', select: 'className' }
        })
        .sort({ paymentDate: -1 })
        .limit(5)
        .lean(),
      
      FeeCollection.find({ branch: branchId, status: { $in: ['pending', 'partial'] }, balance: { $gt: 0 } })
        .populate({
          path: 'student',
          select: 'firstName lastName class admissionNumber',
          populate: { path: 'class', select: 'className' }
        })
        .sort({ balance: -1 })
        .limit(5)
        .lean(),
      
      FeeCollection.aggregate([
        { $match: { branch: branchId, paymentDate: { $gte: today, $lte: todayEnd }, status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      
      FeeCollection.aggregate([
        { $match: { branch: branchId, paymentDate: { $gte: lastMonth }, status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ])
    ]);

    const feeCollected = totalFeeCollected[0]?.total || 0;
    const pendingFees = totalPending[0]?.total || 0;
    const totalFee = feeCollected + pendingFees;
    const collectionRate = totalFee > 0 ? Math.round((feeCollected / totalFee) * 100) : 0;

    const todayTotal = todayCollection[0]?.total || 0;
    const lastMonthTotal = lastMonthCollection[0]?.total || 0;
    const changePercent = lastMonthTotal > 0 ? Math.round(((todayTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;

    res.status(200).json({
      stats: {
        totalStudents,
        feeCollected,
        pendingFees,
        collectionRate,
        changePercent: changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`
      },
      recentCollections: recentCollections.map(fee => ({
        studentName: fee.student ? `${fee.student.firstName} ${fee.student.lastName}` : 'Unknown',
        admissionNumber: fee.student?.admissionNumber || 'N/A',
        class: fee.student?.class?.className || (typeof fee.student?.class === 'string' ? fee.student?.class : 'N/A'),
        amount: fee.amountPaid,
        date: fee.paymentDate
      })),
      pendingPayments: pendingPayments.map(fee => ({
        studentName: fee.student ? `${fee.student.firstName} ${fee.student.lastName}` : 'Unknown',
        admissionNumber: fee.student?.admissionNumber || 'N/A',
        class: fee.student?.class?.className || (typeof fee.student?.class === 'string' ? fee.student?.class : 'N/A'),
        amount: fee.balance,
        dueDate: fee.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Students with Fee Status
exports.getStudentsWithFeeStatus = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const mongoose = require('mongoose');
    const skip = (page - 1) * limit;

    const matchQuery = { branch: new mongoose.Types.ObjectId(admin.branch) };
    
    if (search) {
      matchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'feestructures',
          localField: 'class',
          foreignField: 'class',
          as: 'feeStructure'
        }
      },
      { $unwind: { path: '$feeStructure', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'feecollections',
          localField: '_id',
          foreignField: 'student',
          as: 'payments'
        }
      },
      {
        $addFields: {
          totalFee: { $ifNull: ['$feeStructure.totalFee', 0] },
          paidFee: {
            $sum: {
              $map: {
                input: { $filter: { input: '$payments', cond: { $in: ['$$this.status', ['paid', 'partial']] } } },
                in: '$$this.amountPaid'
              }
            }
          }
        }
      },
      {
        $addFields: {
          pendingFee: { $subtract: ['$totalFee', '$paidFee'] },
          feeStatus: {
            $cond: [
              { $eq: [{ $subtract: ['$totalFee', '$paidFee'] }, 0] },
              'Paid',
              {
                $cond: [
                  { $gt: [{ $subtract: ['$totalFee', '$paidFee'] }, 5000] },
                  'Overdue',
                  'Pending'
                ]
              }
            ]
          }
        }
      },
      ...(status && status !== 'All' ? [{ $match: { feeStatus: status } }] : []),
      {
        $project: {
          firstName: 1,
          lastName: 1,
          name: { $concat: ['$firstName', ' ', '$lastName'] },
          admissionNumber: 1,
          rollNumber: 1,
          mobile: 1,
          email: 1,
          address: 1,
          class: '$classInfo.className',
          totalFee: 1,
          paidFee: 1,
          pendingFee: 1,
          feeStatus: 1
        }
      },
      { $sort: { firstName: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const total = await Student.countDocuments(matchQuery);

    res.status(200).json({
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Lookup Student by Admission Number
exports.getStudentLookup = async (req, res) => {
  try {
    const { studentId } = req.params;
    const admin = await Admin.findById(req.userId).lean();
    
    if (!studentId) return res.status(400).json({ message: 'Student ID is required' });

    const student = await Student.findOne({ 
      admissionNumber: studentId,
      branch: admin.branch 
    }).populate('class', 'className').lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        class: student.class?.className || 'N/A',
        rollNumber: student.rollNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
