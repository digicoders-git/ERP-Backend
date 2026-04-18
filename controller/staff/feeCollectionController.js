const FeeCollection = require('../../model/FeeCollection');
const Student = require('../../model/Student');
const FeeMapping = require('../../model/FeeMapping');
const Fee = require('../../model/Fee');
const Staff = require('../../model/Staff');

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

    const staff = await Staff.findById(req.userId).lean();
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const mongoose = require('mongoose');

    let targetStudentId = studentId;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      const studentByAdm = await Student.findOne({ 
        admissionNumber: studentId, 
        branch: staff.branch 
      }).select('_id');
      
      if (!studentByAdm) {
        return res.status(404).json({ message: 'Student Identity not found in Registry.' });
      }
      targetStudentId = studentByAdm._id;
    }

    const student = await Student.findById(targetStudentId).lean();
    if (!student || student.branch.toString() !== staff.branch.toString()) {
      return res.status(404).json({ message: 'Student not found or access denied.' });
    }

    const balance = amount - amountPaid;
    let status = 'pending';
    
    let normalizedPaymentMode = paymentMode;
    if (paymentMode === 'Common Service Point') normalizedPaymentMode = 'Online';

    if (amountPaid === 0) {
      status = 'pending';
    } else if (amountPaid >= amount) {
      status = 'paid';
    } else {
      status = 'partial';
    }

    const fee = new FeeCollection({
      student: targetStudentId,
      branch: staff.branch,
      client: staff.client,
      feeType,
      amount,
      amountPaid,
      balance,
      paymentMode: normalizedPaymentMode,
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
    console.error('collectFee error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Fee Collection List
exports.getFeeCollections = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status, fromDate, toDate } = req.query;
    const staff = await Staff.findById(req.userId).lean();
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const skip = (page - 1) * limit;
    const mongoose = require('mongoose');

    const query = { branch: new mongoose.Types.ObjectId(staff.branch) };

    if (status) query.status = status;
    
    if (search) {
      const matchingStudents = await Student.find({
        branch: staff.branch,
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { admissionNumber: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.student = { $in: matchingStudents.map(s => s._id) };
    }

    if (fromDate && toDate) {
      query.paymentDate = { 
        $gte: new Date(fromDate), 
        $lte: new Date(toDate) 
      };
    }

    const [fees, total, todayCollection, monthlyCollection, statusWiseCount] = await Promise.all([
      FeeCollection.find(query)
        .populate('student', 'firstName lastName admissionNumber class')
        .populate('collectedBy', 'email')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FeeCollection.countDocuments(query),
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: new mongoose.Types.ObjectId(staff.branch),
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
            branch: new mongoose.Types.ObjectId(staff.branch),
            paymentDate: { 
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            },
            status: { $in: ['paid', 'partial'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      FeeCollection.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(staff.branch) } },
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
    console.error('getFeeCollections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Student Fee Details
exports.getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const staff = await Staff.findById(req.userId).lean();
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const student = await Student.findById(studentId)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .lean();

    if (!student || student.branch.toString() !== staff.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const mongoose = require('mongoose');
    
    const feeMappings = await FeeMapping.find({ 
      class: student.class?._id || student.class,
      section: student.section?._id || student.section,
      branch: staff.branch 
    }).populate('fee').lean();

    const assignedTotal = feeMappings.reduce((sum, mapping) => sum + (mapping.fee?.totalAmount || 0), 0);

    const [feeHistory, totalPaidAgg] = await Promise.all([
      FeeCollection.find({ student: studentId })
        .sort({ paymentDate: -1 })
        .lean(),
      FeeCollection.aggregate([
        { $match: { student: new mongoose.Types.ObjectId(studentId), status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ])
    ]);

    const totalPaid = totalPaidAgg[0]?.total || 0;
    const actualPending = Math.max(0, assignedTotal - totalPaid);

    res.status(200).json({
      student,
      feeHistory,
      totalPaid,
      totalPending: actualPending,
      assignedStructure: feeMappings
    });
  } catch (error) {
    console.error('getStudentFeeDetails error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Pending Fees List
exports.getPendingFees = async (req, res) => {
  try {
    const { page = 1, limit = 20, classId } = req.query;
    const staff = await Staff.findById(req.userId).lean();
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const skip = (page - 1) * limit;
    const mongoose = require('mongoose');

    const matchQuery = { branch: new mongoose.Types.ObjectId(staff.branch) };
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
            firstName: 1,
            lastName: 1,
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
      Student.countDocuments({ branch: staff.branch })
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
    console.error('getPendingFees error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate Fee Receipt
exports.generateReceipt = async (req, res) => {
  try {
    const { feeId } = req.params;
    const staff = await Staff.findById(req.userId).lean();
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const fee = await FeeCollection.findById(feeId)
      .populate('student', 'firstName lastName admissionNumber fatherName class')
      .populate('branch', 'branchName address')
      .populate('collectedBy', 'email')
      .lean();

    if (!fee || fee.branch._id.toString() !== staff.branch.toString()) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    res.status(200).json({ receipt: fee });
  } catch (error) {
    console.error('generateReceipt error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
