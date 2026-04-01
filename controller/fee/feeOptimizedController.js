const Fee = require('../../model/Fee');
const FeeCollection = require('../../model/FeeCollection');
const Student = require('../../model/Student');

exports.getFeeStats = async (req, res) => {
  try {
    const { branch } = req.query;
    const adminBranch = req.user.branch;

    const stats = await FeeCollection.aggregate([
      { $match: { branch: adminBranch || branch } },
      {
        $facet: {
          totalCollection: [
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
          ],
          monthlyCollection: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                amount: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    const statusMap = {};
    stats[0].byStatus.forEach(s => {
      statusMap[s._id] = { count: s.count, amount: s.amount };
    });

    res.status(200).json({
      success: true,
      data: {
        totalCollection: stats[0].totalCollection[0]?.total || 0,
        byStatus: statusMap,
        monthlyCollection: stats[0].monthlyCollection
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingFees = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch;

    const pendingFees = await FeeCollection.aggregate([
      {
        $match: {
          branch: adminBranch || branch,
          status: 'pending'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      { $unwind: '$studentDetails' },
      {
        $project: {
          _id: 1,
          studentName: '$studentDetails.firstName',
          studentEmail: '$studentDetails.email',
          amount: 1,
          dueDate: 1,
          status: 1,
          createdAt: 1
        }
      },
      { $sort: { dueDate: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const total = await FeeCollection.countDocuments({
      branch: adminBranch || branch,
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      data: pendingFees,
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

exports.getStudentFeeStatus = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user.branch;

    const students = await Student.find({ branch: adminBranch || branch, status: 'active' })
      .select('_id firstName email')
      .limit(parseInt(limit))
      .lean();

    const studentIds = students.map(s => s._id);

    const feeStatus = await FeeCollection.aggregate([
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

exports.recordFeePayment = async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, transactionId } = req.body;
    const adminBranch = req.user.branch;

    if (!studentId || !amount) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const feeCollection = new FeeCollection({
      studentId,
      amount,
      paymentMethod,
      transactionId,
      status: 'paid',
      branch: adminBranch,
      client: req.user.client,
      createdBy: req.userId
    });

    await feeCollection.save();

    res.status(201).json({
      success: true,
      message: 'Fee payment recorded successfully',
      data: feeCollection
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeeDashboard = async (req, res) => {
  try {
    const adminBranch = req.user.branch;

    const [stats, recentPayments, pendingCount, monthlyTrend] = await Promise.all([
      FeeCollection.aggregate([
        { $match: { branch: adminBranch } },
        {
          $facet: {
            totalCollection: [
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ],
            paidCount: [
              { $match: { status: 'paid' } },
              { $count: 'count' }
            ],
            pendingCount: [
              { $match: { status: 'pending' } },
              { $count: 'count' }
            ]
          }
        }
      ]),
      FeeCollection.find({ branch: adminBranch, status: 'paid' })
        .select('amount createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      FeeCollection.countDocuments({ branch: adminBranch, status: 'pending' }),
      FeeCollection.aggregate([
        { $match: { branch: adminBranch } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 6 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalCollection: stats[0].totalCollection[0]?.total || 0,
          paidCount: stats[0].paidCount[0]?.count || 0,
          pendingCount: stats[0].pendingCount[0]?.count || 0
        },
        recentPayments,
        pendingCount,
        monthlyTrend: monthlyTrend.reverse()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeeReport = async (req, res) => {
  try {
    const { branch, startDate, endDate } = req.query;
    const adminBranch = req.user.branch;

    const query = { branch: adminBranch || branch };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const report = await FeeCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
