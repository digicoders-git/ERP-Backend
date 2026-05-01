const FeeCollection = require('../../model/FeeCollection');
const Student = require('../../model/Student');
const FeeMapping = require('../../model/FeeMapping');
const Fee = require('../../model/Fee');
const Staff = require('../../model/Staff');
const ClientSettings = require('../../model/ClientSettings');

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

    if (!fee || (staff.branch && fee.branch._id.toString() !== staff.branch.toString())) {
      return res.status(404).json({ message: 'Fee record not found or access denied' });
    }

    const settings = await ClientSettings.findOne({ branchId: fee.branch._id }).select('branding.logo').lean();

    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const getLogoUrl = (logo) => {
      if (!logo) return '';
      if (logo.startsWith('http')) return logo;
      const baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5002';
      return `${baseUrl}${logo.startsWith('/') ? '' : '/'}${logo}`;
    };

    const logoUrl = getLogoUrl(settings?.branding?.logo);

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Receipt - ${fee.student?.firstName} ${fee.student?.lastName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap');
          
          :root {
            --primary: #1e293b;
            --accent: #4f46e5;
            --success: #10b981;
            --text-main: #334155;
            --text-light: #64748b;
          }

          body { 
            font-family: 'Outfit', sans-serif; 
            color: var(--text-main); 
            margin: 0; 
            padding: 40px; 
            background: #f8fafc; 
            -webkit-print-color-adjust: exact;
          }

          .invoice-card { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 50px; 
            border-radius: 24px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.05); 
            position: relative; 
            overflow: hidden; 
            border: 1px solid #e2e8f0;
          }

          /* Watermark */
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(79, 70, 229, 0.05);
            white-space: nowrap;
            pointer-events: none;
            z-index: 0;
            text-transform: uppercase;
            letter-spacing: 10px;
          }

          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 2px solid #f1f5f9; 
            padding-bottom: 30px; 
            margin-bottom: 40px; 
            position: relative;
            z-index: 1;
          }

          .logo-area {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .logo-placeholder {
            width: 50px;
            height: 50px;
            background: var(--accent);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 20px;
          }

          .branch-info h1 { 
            font-size: 22px; 
            font-weight: 800; 
            margin: 0; 
            color: var(--primary); 
            letter-spacing: -0.5px;
          }

          .branch-info p { 
            font-size: 11px; 
            color: var(--text-light); 
            margin: 4px 0 0 0; 
            max-width: 250px; 
            line-height: 1.4;
          }

          .receipt-title-box {
            text-align: right;
          }

          .receipt-title-box h2 { 
            font-size: 11px; 
            font-weight: 900; 
            color: var(--accent); 
            margin: 0; 
            text-transform: uppercase; 
            letter-spacing: 2px;
          }

          .receipt-number { 
            font-size: 24px; 
            font-weight: 800; 
            margin: 5px 0 0 0; 
            color: var(--primary); 
          }

          .details-section {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
            position: relative;
            z-index: 1;
          }

          .info-block h3 {
            font-size: 10px;
            font-weight: 800;
            color: var(--text-light);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }

          .info-block p {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
            color: var(--primary);
          }

          .student-meta {
            font-size: 11px;
            color: var(--text-light);
            margin-top: 4px;
          }

          .table-container {
            position: relative;
            z-index: 1;
            margin-bottom: 30px;
          }

          .fee-table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0;
          }

          .fee-table th { 
            text-align: left; 
            background: #f8fafc; 
            padding: 16px; 
            font-size: 10px; 
            font-weight: 800; 
            color: var(--text-light); 
            text-transform: uppercase; 
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
          }

          .fee-table td { 
            padding: 20px 16px; 
            border-bottom: 1px solid #f1f5f9; 
            font-size: 14px; 
            color: var(--text-main); 
          }

          .amount { 
            text-align: right; 
            font-weight: 700; 
            font-family: 'Courier New', Courier, monospace;
          }

          .total-row {
            background: #fdfdfd;
          }

          .summary-section {
            display: flex;
            justify-content: flex-end;
            position: relative;
            z-index: 1;
          }

          .summary-box {
            width: 280px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 16px;
          }

          .summary-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 12px;
          }

          .summary-item.grand-total {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px dashed #cbd5e1;
            font-size: 16px;
            font-weight: 800;
            color: var(--accent);
          }

          .status-stamp {
            position: absolute;
            top: 200px;
            right: 50px;
            border: 4px solid var(--success);
            color: var(--success);
            padding: 10px 20px;
            border-radius: 12px;
            font-weight: 900;
            font-size: 24px;
            text-transform: uppercase;
            transform: rotate(15deg);
            opacity: 0.2;
            z-index: 0;
          }

          .footer { 
            margin-top: 60px; 
            padding-top: 30px; 
            border-top: 1px solid #f1f5f9; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end; 
            position: relative;
            z-index: 1;
          }

          .footer-note { 
            font-size: 10px; 
            color: var(--text-light); 
            line-height: 1.6;
            max-width: 400px;
          }

          .sign-area {
            text-align: center;
          }

          .sign-line {
            width: 160px;
            border-top: 1.5px solid var(--primary);
            margin-bottom: 8px;
          }

          .sign-area p {
            font-size: 10px;
            font-weight: 800;
            color: var(--text-light);
            text-transform: uppercase;
          }

          .no-print-area {
            text-align: center;
            margin-bottom: 30px;
          }

          .print-btn {
            background: var(--accent);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 14px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
            transition: all 0.3s;
          }

          .print-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(79, 70, 229, 0.4);
          }

          @media print {
            body { background: white; padding: 0; }
            .invoice-card { box-shadow: none; border: none; padding: 20px; }
            .no-print-area { display: none; }
            .status-stamp { opacity: 0.15; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-area">
          <button class="print-btn" onclick="window.print()">Print Receipt</button>
        </div>
        
        <div class="invoice-card">
          ${logoUrl ? `<img src="${logoUrl}" class="watermark-img" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; opacity: 0.05; z-index: 0; pointer-events: none;" />` : `<div class="watermark">${fee.branch?.branchName || 'SCHOOL'}</div>`}
          
          ${fee.status === 'paid' ? '<div class="status-stamp">PAID</div>' : ''}

          <div class="header">
            <div class="logo-area">
              <div class="logo-placeholder" style="overflow: hidden; background: ${logoUrl ? 'transparent' : 'var(--accent)'};">
                ${logoUrl ? `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span>${(fee.branch?.branchName || 'S').charAt(0)}</span>`}
              </div>
              <div class="branch-info">
                <h1>${fee.branch?.branchName || 'Institutional Academy'}</h1>
                <p>${fee.branch?.address || 'City Center, Academic District'}</p>
              </div>
            </div>
            <div class="receipt-title-box">
              <h2>Official Fee Receipt</h2>
              <p class="receipt-number">#${fee._id.toString().slice(-8).toUpperCase()}</p>
              <div style="font-size: 10px; color: var(--text-light); font-weight: 800; margin-top: 4px;">
                DATE: ${formatDate(fee.paymentDate)}
              </div>
            </div>
          </div>
          
          <div class="details-section">
            <div class="info-block">
              <h3>Student Details</h3>
              <p>${fee.student?.firstName} ${fee.student?.lastName}</p>
              <div class="student-meta">
                ADMISSION NO: ${fee.student?.admissionNumber} | FATHER: ${fee.student?.fatherName || 'N/A'}
              </div>
            </div>
            <div class="info-block" style="text-align: right;">
              <h3>Payment Method</h3>
              <p>${fee.paymentMode}</p>
              <div class="student-meta">
                REF: ${fee.transactionId || 'DIRECT_CASH'}
              </div>
            </div>
          </div>
          
          <div class="table-container">
            <table class="fee-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Total Fee</th>
                  <th style="text-align: right;">Paid Amount</th>
                  <th style="text-align: right;">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 600;">${fee.feeType}</td>
                  <td class="amount">₹${fee.amount.toLocaleString()}</td>
                  <td class="amount" style="color: var(--accent);">₹${fee.amountPaid.toLocaleString()}</td>
                  <td class="amount" style="color: #ef4444;">₹${fee.balance.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="summary-section">
            <div class="summary-box">
              <div class="summary-item">
                <span>Total Amount Paid</span>
                <span style="font-weight: 700;">₹${fee.amountPaid.toLocaleString()}</span>
              </div>
              <div class="summary-item grand-total">
                <span>Net Total</span>
                <span>₹${fee.amountPaid.toLocaleString()}</span>
              </div>
              <div style="font-size: 9px; color: var(--text-light); text-align: right; margin-top: 10px; font-style: italic;">
                Amount in words: Rupees ${Number(fee.amountPaid).toLocaleString('en-IN')} Only
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-note">
              <p>• This is a digital receipt issued by the school administration system.</p>
              <p>• Please keep this copy for your records and future verification.</p>
              <p style="margin-top: 10px; font-weight: 700;">Processed by: ${fee.collectedBy?.email || 'Admin'}</p>
            </div>
            <div class="sign-area">
              <div class="sign-line"></div>
              <p>Authorized Signatory</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.status(200).send(receiptHtml);
  } catch (error) {
    console.error('generateReceipt error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
