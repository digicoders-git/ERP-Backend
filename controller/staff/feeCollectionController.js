const FeeCollection = require('../../model/FeeCollection');
const Student = require('../../model/Student');
const FeeStructure = require('../../model/FeeStructure');
const Admin = require('../../model/Admin');

// Collect Fee
exports.collectFee = async (req, res) => {
  try {
    const { 
      studentId, 
      feeType, 
      amount, 
      amountPaid, 
      paymentMode, 
      transactionId,
      chequeNumber,
      bankName,
      remarks 
    } = req.body;

    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(studentId).lean();
    if (!student || student.branch.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const balance = amount - amountPaid;
    let status = 'pending';
    
    if (amountPaid === 0) {
      status = 'pending';
    } else if (amountPaid >= amount) {
      status = 'paid';
    } else {
      status = 'partial';
    }

    const fee = new FeeCollection({
      student: studentId,
      branch: admin.branch,
      client: admin.client,
      feeType,
      amount,
      amountPaid,
      balance,
      paymentMode,
      transactionId,
      chequeNumber,
      bankName,
      remarks,
      collectedBy: req.userId,
      paymentDate: new Date(),
      status
    });

    await fee.save();

    res.status(201).json({ 
      message: 'Fee collected successfully',
      fee,
      receiptNumber: fee._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Fee Collection List
exports.getFeeCollections = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status, fromDate, toDate } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;
    const mongoose = require('mongoose');

    const query = { branch: new mongoose.Types.ObjectId(admin.branch) };

    if (status) query.status = status;
    if (fromDate && toDate) {
      query.paymentDate = { 
        $gte: new Date(fromDate), 
        $lte: new Date(toDate) 
      };
    }

    const [fees, total, todayCollection, monthlyCollection, statusWiseCount] = await Promise.all([
      FeeCollection.find(query)
        .populate('student', 'name admissionNumber class')
        .populate('collectedBy', 'email')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FeeCollection.countDocuments(query),
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: new mongoose.Types.ObjectId(admin.branch),
            paymentDate: { 
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
              $lte: new Date(new Date().setHours(23, 59, 59, 999))
            },
            status: { $in: ['paid', 'partial'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: new mongoose.Types.ObjectId(admin.branch),
            paymentDate: { 
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            },
            status: { $in: ['paid', 'partial'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      FeeCollection.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(admin.branch) } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amountPaid' } } }
      ])
    ]);

    res.status(200).json({
      fees,
      summary: {
        todayCollection: todayCollection[0]?.total || 0,
        monthlyCollection: monthlyCollection[0]?.total || 0,
        statusWise: statusWiseCount
      },
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

// Get Student Fee Details
exports.getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(studentId)
      .populate('class', 'className')
      .lean();

    if (!student || student.branch.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const mongoose = require('mongoose');
    
    const [feeHistory, totalPaid, totalPending] = await Promise.all([
      FeeCollection.find({ student: studentId })
        .sort({ paymentDate: -1 })
        .lean(),
      FeeCollection.aggregate([
        { $match: { student: new mongoose.Types.ObjectId(studentId), status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      FeeCollection.aggregate([
        { $match: { student: new mongoose.Types.ObjectId(studentId), status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ])
    ]);

    res.status(200).json({
      student,
      feeHistory,
      totalPaid: totalPaid[0]?.total || 0,
      totalPending: totalPending[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Pending Fees List
exports.getPendingFees = async (req, res) => {
  try {
    const { page = 1, limit = 20, classId } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;
    const mongoose = require('mongoose');

    const matchQuery = { branch: new mongoose.Types.ObjectId(admin.branch) };
    if (classId) matchQuery.class = new mongoose.Types.ObjectId(classId);

    const [students, total] = await Promise.all([
      Student.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'feecollections',
            localField: '_id',
            foreignField: 'student',
            as: 'fees'
          }
        },
        {
          $addFields: {
            totalPending: {
              $sum: {
                $map: {
                  input: { $filter: { input: '$fees', cond: { $ne: ['$$this.status', 'paid'] } } },
                  in: '$$this.balance'
                }
              }
            }
          }
        },
        { $match: { totalPending: { $gt: 0 } } },
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
          $project: {
            name: 1,
            admissionNumber: 1,
            fatherName: 1,
            mobile: 1,
            className: '$classInfo.className',
            totalPending: 1
          }
        },
        { $sort: { totalPending: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      Student.countDocuments({ branch: admin.branch })
    ]);

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

// Generate Fee Receipt
exports.generateReceipt = async (req, res) => {
  try {
    const { feeId } = req.params;
    const admin = await Admin.findById(req.userId).lean();

    const fee = await FeeCollection.findById(feeId)
      .populate('student', 'name admissionNumber fatherName class')
      .populate('branch', 'branchName address')
      .populate('collectedBy', 'email')
      .lean();

    if (!fee || fee.branch._id.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    res.status(200).json({ receipt: fee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
