const FeeCollection = require('../../model/FeeCollection');
const Student = require('../../model/Student');
const FeeStructure = require('../../model/FeeStructure');
const Admin = require('../../model/Admin');

// Get Fee Analytics
exports.getFeeAnalytics = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    const mongoose = require('mongoose');
    const branchId = new mongoose.Types.ObjectId(admin.branch);

    const [studentStatusBreakdown, feeAmountBreakdown, classWiseReport] = await Promise.all([
      // Student Status Breakdown
      Student.aggregate([
        { $match: { branch: branchId } },
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
        {
          $group: {
            _id: '$feeStatus',
            count: { $sum: 1 }
          }
        }
      ]),

      // Fee Amount Breakdown
      Student.aggregate([
        { $match: { branch: branchId } },
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
          $group: {
            _id: null,
            totalFee: { $sum: { $ifNull: ['$feeStructure.totalFee', 0] } },
            paidFee: {
              $sum: {
                $sum: {
                  $map: {
                    input: { $filter: { input: '$payments', cond: { $in: ['$$this.status', ['paid', 'partial']] } } },
                    in: '$$this.amountPaid'
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            pendingFee: { $subtract: ['$totalFee', '$paidFee'] }
          }
        }
      ]),

      // Class-wise Report
      Student.aggregate([
        { $match: { branch: branchId } },
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
          $group: {
            _id: '$classInfo.className',
            students: { $sum: 1 },
            totalFee: { $sum: { $ifNull: ['$feeStructure.totalFee', 0] } },
            paidFee: {
              $sum: {
                $sum: {
                  $map: {
                    input: { $filter: { input: '$payments', cond: { $in: ['$$this.status', ['paid', 'partial']] } } },
                    in: '$$this.amountPaid'
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            pendingFee: { $subtract: ['$totalFee', '$paidFee'] }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      studentStatusBreakdown: studentStatusBreakdown.map(item => ({
        name: item._id || 'Unknown',
        value: item.count
      })),
      feeAmountBreakdown: feeAmountBreakdown[0] ? [
        { name: 'Collected', value: Math.round(feeAmountBreakdown[0].paidFee) },
        { name: 'Pending', value: Math.round(feeAmountBreakdown[0].pendingFee) }
      ] : [],
      classWiseReport: classWiseReport.map(item => ({
        class: item._id || 'Unknown',
        students: item.students,
        totalFee: Math.round(item.totalFee),
        paidFee: Math.round(item.paidFee),
        pendingFee: Math.round(item.pendingFee)
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Payment Mode Report
exports.getPaymentModeReport = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    const mongoose = require('mongoose');
    const branchId = new mongoose.Types.ObjectId(admin.branch);

    const paymentModeData = await FeeCollection.aggregate([
      { $match: { branch: branchId, status: { $in: ['paid', 'partial'] } } },
      {
        $group: {
          _id: '$paymentMode',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountPaid' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.status(200).json({
      paymentModeReport: paymentModeData.map(item => ({
        mode: item._id,
        count: item.count,
        totalAmount: Math.round(item.totalAmount)
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Monthly Collection Report
exports.getMonthlyCollectionReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const mongoose = require('mongoose');
    const branchId = new mongoose.Types.ObjectId(admin.branch);

    const monthlyData = await FeeCollection.aggregate([
      {
        $match: {
          branch: branchId,
          status: { $in: ['paid', 'partial'] },
          paymentDate: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$paymentDate' },
          totalAmount: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyReport = months.map((month, index) => {
      const data = monthlyData.find(item => item._id === index + 1);
      return {
        month,
        amount: data ? Math.round(data.totalAmount) : 0,
        count: data ? data.count : 0
      };
    });

    res.status(200).json({ monthlyReport });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Defaulter List
exports.getDefaulterList = async (req, res) => {
  try {
    const { page = 1, limit = 20, minAmount = 5000 } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const mongoose = require('mongoose');
    const skip = (page - 1) * limit;

    const defaulters = await Student.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(admin.branch) } },
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
          pendingFee: { $subtract: ['$totalFee', '$paidFee'] }
        }
      },
      { $match: { pendingFee: { $gte: parseInt(minAmount) } } },
      {
        $project: {
          name: 1,
          admissionNumber: 1,
          mobile: 1,
          fatherName: 1,
          class: '$classInfo.className',
          totalFee: 1,
          paidFee: 1,
          pendingFee: 1
        }
      },
      { $sort: { pendingFee: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const total = await Student.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(admin.branch) } },
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
          pendingFee: { $subtract: ['$totalFee', '$paidFee'] }
        }
      },
      { $match: { pendingFee: { $gte: parseInt(minAmount) } } },
      { $count: 'total' }
    ]);

    res.status(200).json({
      defaulters,
      pagination: {
        total: total[0]?.total || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((total[0]?.total || 0) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
