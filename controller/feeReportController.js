const Student = require('../model/Student');
const FeeMapping = require('../model/FeeMapping');
const Fee = require('../model/Fee');
const Class = require('../model/Class');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');

const getBranch = async (userId) => {
  // Try Admin first
  let user = await Admin.findById(userId).select('branch').lean();
  if (user?.branch) return user.branch;
  
  // Try Staff if not found in Admin
  user = await Staff.findById(userId).select('branch').lean();
  return user?.branch || null;
};

// Get Fee Reports (fast parallel aggregation)
exports.getFeeReport = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { classId } = req.query;
    const studentQuery = { branch, admissionStatus: 'confirmed' };
    if (classId) studentQuery.class = classId;

    const [totalStudents, feesByClass, feeMappings, classes] = await Promise.all([
      Student.countDocuments(studentQuery),
      Student.aggregate([
        { $match: { branch, admissionStatus: 'confirmed' } },
        { $group: { _id: '$class', count: { $sum: 1 } } }
      ]),
      FeeMapping.find({ branch })
        .populate('fee', 'feeName totalAmount feeType frequency')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .lean(),
      Class.find({ branch }).select('className').lean()
    ]);

    // Build class-wise fee summary
    const classMap = {};
    classes.forEach(c => { classMap[c._id.toString()] = c.className; });

    const studentCountMap = {};
    feesByClass.forEach(f => { studentCountMap[f._id?.toString()] = f.count; });

    // Group fee mappings by class
    const feeByClass = {};
    feeMappings.forEach(fm => {
      const cId = fm.class?._id?.toString();
      if (!cId) return;
      if (!feeByClass[cId]) {
        feeByClass[cId] = {
          className: fm.class.className,
          studentCount: studentCountMap[cId] || 0,
          fees: [],
          totalMonthlyAmount: 0
        };
      }
      feeByClass[cId].fees.push({
        feeName: fm.fee?.feeName,
        amount: fm.fee?.totalAmount,
        feeType: fm.fee?.feeType,
        frequency: fm.fee?.frequency,
        section: fm.section?.sectionName
      });
      if (fm.fee?.frequency === 'Monthly') {
        feeByClass[cId].totalMonthlyAmount += (fm.fee?.totalAmount || 0) * (studentCountMap[cId] || 0);
      }
    });

    const totalExpectedMonthly = Object.values(feeByClass).reduce((sum, c) => sum + c.totalMonthlyAmount, 0);

    res.status(200).json({
      summary: {
        totalStudents,
        totalClasses: classes.length,
        totalFeeMappings: feeMappings.length,
        totalExpectedMonthly
      },
      classwiseReport: Object.values(feeByClass)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Fee Collection Stats (students per class with fee info)
exports.getFeeCollectionStats = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const [confirmed, pending, rejected, totalFees] = await Promise.all([
      Student.countDocuments({ branch, admissionStatus: 'confirmed' }),
      Student.countDocuments({ branch, admissionStatus: 'pending' }),
      Student.countDocuments({ branch, admissionStatus: 'rejected' }),
      Fee.find({ branch }).select('feeName totalAmount feeType frequency').lean()
    ]);

    res.status(200).json({
      studentStats: { confirmed, pending, rejected, total: confirmed + pending + rejected },
      fees: totalFees
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
