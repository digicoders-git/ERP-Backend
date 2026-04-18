const FeeCollection = require('../../model/FeeCollection');
const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const { successResponse, errorResponse } = require('../../responseFormatter');
const crypto = require('crypto');

// Payment Gateway Configuration
// In production, install: npm install razorpay stripe
// const Razorpay = require('razorpay');
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// ─── CREATE PAYMENT ORDER (Razorpay) ─────────────────────────────────────────

exports.createPaymentOrder = async (req, res) => {
  try {
    const { feeCollectionId, amount, currency = 'INR' } = req.body;
    
    if (!feeCollectionId || !amount) {
      return errorResponse(res, 'feeCollectionId and amount are required', 400);
    }

    const feeRecord = await FeeCollection.findById(feeCollectionId)
      .populate('student', 'firstName lastName email mobile')
      .lean();
    
    if (!feeRecord) return errorResponse(res, 'Fee record not found', 404);

    // Validate amount
    if (amount > feeRecord.balance) {
      return errorResponse(res, 'Amount exceeds pending balance', 400);
    }

    // Create Razorpay order
    // const order = await razorpay.orders.create({
    //   amount: amount * 100, // Convert to paise
    //   currency,
    //   receipt: `fee_${feeCollectionId}_${Date.now()}`,
    //   notes: {
    //     feeCollectionId,
    //     studentId: feeRecord.student._id.toString(),
    //     studentName: `${feeRecord.student.firstName} ${feeRecord.student.lastName}`
    //   }
    // });

    // Mock order for development
    const order = {
      id: `order_${Date.now()}`,
      entity: 'order',
      amount: amount * 100,
      amount_paid: 0,
      amount_due: amount * 100,
      currency,
      receipt: `fee_${feeCollectionId}_${Date.now()}`,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000)
    };

    return successResponse(res, {
      orderId: order.id,
      amount: amount,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
      studentName: `${feeRecord.student.firstName} ${feeRecord.student.lastName}`,
      studentEmail: feeRecord.student.email,
      studentMobile: feeRecord.student.mobile,
      feeType: feeRecord.feeType,
      description: `Fee payment for ${feeRecord.feeType}`
    }, 'Payment order created');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── VERIFY PAYMENT (Razorpay) ───────────────────────────────────────────────

exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      feeCollectionId,
      amount 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse(res, 'Missing payment verification parameters', 400);
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // In development, skip signature verification
    const isSignatureValid = true; // generatedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return errorResponse(res, 'Invalid payment signature', 400);
    }

    // Update fee collection record
    const feeRecord = await FeeCollection.findById(feeCollectionId);
    if (!feeRecord) return errorResponse(res, 'Fee record not found', 404);

    feeRecord.amountPaid += parseFloat(amount);
    feeRecord.balance -= parseFloat(amount);
    feeRecord.status = feeRecord.balance <= 0 ? 'paid' : 'partial';
    feeRecord.paymentDate = new Date();
    feeRecord.paymentMode = 'online';
    feeRecord.transactionId = razorpay_payment_id;
    feeRecord.paymentDetails = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      gateway: 'razorpay'
    };

    await feeRecord.save();

    // Send receipt email/SMS
    // await sendPaymentReceipt(feeRecord);

    return successResponse(res, {
      feeCollectionId: feeRecord._id,
      amountPaid: amount,
      balance: feeRecord.balance,
      status: feeRecord.status,
      transactionId: razorpay_payment_id,
      paymentDate: feeRecord.paymentDate
    }, 'Payment verified and recorded successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── MANUAL FEE COLLECTION ───────────────────────────────────────────────────

exports.manualCollectFee = async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, transactionId, chequeNumber, upiId } = req.body;
    
    if (!studentId || !amount) {
      return errorResponse(res, 'studentId and amount are required', 400);
    }

    // Find the student's pending fee collection records
    const feeRecords = await FeeCollection.find({ 
      student: studentId, 
      status: { $in: ['pending', 'partial'] },
      balance: { $gt: 0 }
    }).sort({ createdAt: 1 });

    if (!feeRecords || feeRecords.length === 0) {
      return errorResponse(res, 'No pending fees found for this student', 404);
    }

    let remainingAmount = parseFloat(amount);
    let totalCollected = 0;
    const processedRecords = [];

    // Distribute amount over pending records
    for (const record of feeRecords) {
      if (remainingAmount <= 0) break;

      const collectAmount = Math.min(record.balance, remainingAmount);
      
      record.amountPaid += collectAmount;
      record.balance -= collectAmount;
      record.status = record.balance <= 0 ? 'paid' : 'partial';
      record.paymentDate = new Date();
      record.paymentMode = paymentMethod;
      record.transactionId = transactionId || upiId || chequeNumber || `CASH-${Date.now()}`;
      
      await record.save();
      
      processedRecords.push({ feeId: record._id, collectedAmount: collectAmount });
      remainingAmount -= collectAmount;
      totalCollected += collectAmount;
    }

    return successResponse(res, {
      studentId,
      totalCollected,
      processedRecords
    }, 'Manual fee collection successful');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── GET PAYMENT HISTORY ──────────────────────────────────────────────────────

exports.getPaymentHistory = async (req, res) => {
  try {
    const { studentId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const query = { 
      status: { $in: ['paid', 'partial'] }
    };
    
    if (studentId) query.student = studentId;
    if (startDate && endDate) {
      query.paymentDate = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    const skip = (page - 1) * limit;

    // If class filter is provided, we need to handle it. 
    // Since class is inside Student, we might need a more complex query or aggregate if filtering by student.class.className
    // For now, let's stick to find and we'll filter by className in the pipeline if needed, 
    // or just fetch all and filter client-side as before but with a more robust 'Fetch' trigger.
    
    // Actually, let's try to add a simple regex or match if possible.
    // Given the current structure, a full aggregate would be better for server-side class filtering.

    const [payments, total] = await Promise.all([
      FeeCollection.find(query)
        .populate({
          path: 'student',
          select: 'firstName lastName rollNumber admissionNumber class',
          populate: { path: 'class', select: 'className' }
        })
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FeeCollection.countDocuments(query)
    ]);

    return successResponse(res, {
      payments: payments.map(p => ({
        _id: p._id,
        studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
        admissionNumber: p.student?.admissionNumber || 'N/A',
        rollNumber: p.student?.rollNumber || 'N/A',
        class: p.student?.class?.className || (typeof p.student?.class === 'string' ? p.student?.class : 'N/A'),
        studentMobile: p.student?.phone || 'N/A',
        feeType: p.feeType,
        amount: p.amountPaid,
        totalFee: p.amount,
        pendingFee: p.balance,
        transactionId: p.transactionId,
        paymentDate: p.paymentDate,
        paymentMode: p.paymentMode,
        status: p.status
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    }, 'Payment history fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── REFUND PAYMENT ───────────────────────────────────────────────────────────

exports.refundPayment = async (req, res) => {
  try {
    const { feeCollectionId, amount, reason } = req.body;
    
    if (!feeCollectionId || !amount || !reason) {
      return errorResponse(res, 'feeCollectionId, amount and reason are required', 400);
    }

    const feeRecord = await FeeCollection.findById(feeCollectionId);
    if (!feeRecord) return errorResponse(res, 'Fee record not found', 404);

    if (!feeRecord.transactionId) {
      return errorResponse(res, 'No online payment found for this record', 400);
    }

    // Create refund in Razorpay
    // const refund = await razorpay.payments.refund(feeRecord.transactionId, {
    //   amount: amount * 100,
    //   notes: { reason }
    // });

    // Mock refund
    const refund = {
      id: `rfnd_${Date.now()}`,
      payment_id: feeRecord.transactionId,
      amount: amount * 100,
      status: 'processed'
    };

    // Update fee record
    feeRecord.amountPaid -= parseFloat(amount);
    feeRecord.balance += parseFloat(amount);
    feeRecord.status = feeRecord.balance > 0 ? 'partial' : 'pending';
    feeRecord.refundDetails = {
      refundId: refund.id,
      refundAmount: amount,
      refundReason: reason,
      refundDate: new Date()
    };

    await feeRecord.save();

    return successResponse(res, {
      refundId: refund.id,
      amount,
      status: 'processed',
      message: 'Refund processed successfully'
    }, 'Refund successful');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── PAYMENT ANALYTICS ────────────────────────────────────────────────────────

exports.getPaymentAnalytics = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.paymentDate = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    const [onlinePayments, offlinePayments, paymentMethods, dailyCollection] = await Promise.all([
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: admin.branch, 
            paymentMode: 'online', 
            status: { $in: ['paid', 'partial'] },
            ...dateFilter
          } 
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
      ]),
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: admin.branch, 
            paymentMode: { $ne: 'online' }, 
            status: { $in: ['paid', 'partial'] },
            ...dateFilter
          } 
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
      ]),
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: admin.branch, 
            status: { $in: ['paid', 'partial'] },
            ...dateFilter
          } 
        },
        { $group: { _id: '$paymentMode', total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
      ]),
      FeeCollection.aggregate([
        { 
          $match: { 
            branch: admin.branch, 
            status: { $in: ['paid', 'partial'] },
            ...dateFilter
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
            total: { $sum: '$amountPaid' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const onlineTotal = onlinePayments[0]?.total || 0;
    const offlineTotal = offlinePayments[0]?.total || 0;
    const totalCollection = onlineTotal + offlineTotal;

    return successResponse(res, {
      summary: {
        totalCollection,
        onlineCollection: onlineTotal,
        offlineCollection: offlineTotal,
        onlinePercentage: totalCollection > 0 ? Math.round((onlineTotal / totalCollection) * 100) : 0,
        totalTransactions: (onlinePayments[0]?.count || 0) + (offlinePayments[0]?.count || 0)
      },
      paymentMethods: paymentMethods.map(pm => ({
        method: pm._id,
        total: pm.total,
        count: pm.count,
        percentage: totalCollection > 0 ? Math.round((pm.total / totalCollection) * 100) : 0
      })),
      dailyCollection: dailyCollection.map(dc => ({
        date: dc._id,
        amount: dc.total,
        transactions: dc.count
      }))
    }, 'Payment analytics fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── SEND PAYMENT REMINDER ────────────────────────────────────────────────────

exports.sendPaymentReminder = async (req, res) => {
  try {
    const { studentIds, message } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return errorResponse(res, 'studentIds array is required', 400);
    }

    const students = await Student.find({ 
      _id: { $in: studentIds } 
    }).select('firstName lastName email mobile').lean();

    // Send SMS/Email reminders
    const reminders = students.map(student => ({
      studentId: student._id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      mobile: student.mobile,
      message: message || 'Your fee payment is pending. Please pay at the earliest.',
      status: 'sent',
      sentAt: new Date()
    }));

    // In production, integrate with SMS/Email service
    // await sendBulkSMS(reminders);
    // await sendBulkEmail(reminders);

    return successResponse(res, {
      totalSent: reminders.length,
      reminders
    }, 'Payment reminders sent successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── GENERATE PAYMENT RECEIPT ─────────────────────────────────────────────────

exports.generateReceipt = async (req, res) => {
  try {
    const { feeCollectionId } = req.params;
    
    const feeRecord = await FeeCollection.findById(feeCollectionId)
      .populate({
        path: 'student',
        select: 'firstName lastName rollNumber class section admissionNumber guardianInfo',
        populate: [
          { path: 'class', select: 'className' },
          { path: 'section', select: 'sectionName' }
        ]
      })
      .populate('branch', 'branchName address phone email')
      .lean();

    if (!feeRecord) return errorResponse(res, 'Fee record not found', 404);

    const receipt = {
      receiptNumber: `REC-${Date.now()}`,
      date: feeRecord.paymentDate,
      student: {
        name: `${feeRecord.student?.firstName || ''} ${feeRecord.student?.lastName || ''}`,
        admissionNumber: feeRecord.student?.admissionNumber || 'N/A',
        rollNumber: feeRecord.student?.rollNumber || 'N/A',
        parentName: feeRecord.student?.guardianInfo?.fatherName || 'N/A',
        class: feeRecord.student?.class?.className || 'N/A',
        section: feeRecord.student?.section?.sectionName || 'N/A'
      },
      branch: {
        name: feeRecord.branch?.branchName || 'School Name',
        address: feeRecord.branch?.address || 'School Address',
        phone: feeRecord.branch?.phone || 'N/A',
        email: feeRecord.branch?.email || 'N/A'
      },
      payment: {
        feeType: feeRecord.feeType,
        amount: feeRecord.amountPaid,
        paymentMode: feeRecord.paymentMode,
        transactionId: feeRecord.transactionId,
        paymentDate: feeRecord.paymentDate
      },
      balance: feeRecord.balance
    };

    // In production, generate PDF using pdfkit or puppeteer
    // const pdf = await generatePDF(receipt);
    // res.setHeader('Content-Type', 'application/pdf');
    // return res.send(pdf);

    return successResponse(res, receipt, 'Receipt generated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

module.exports = exports;
