const ExamSchedule = require('../../model/ExamSchedule');
const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const ExamType = require('../../model/ExamType');
const ClientSettings = require('../../model/ClientSettings');
const mongoose = require('mongoose');

const getBranchClient = async (userId) => {
  let user = await Admin.findById(userId).populate('branch client').lean();
  if (!user) {
    user = await Staff.findById(userId).populate('branch client').lean();
  }
  if (!user) {
    throw new Error('User not found or unauthorized');
  }
  return user;
};

const Marks = require('../../model/Marks');

// Add/Update Marks
exports.addMarks = async (req, res) => {
  try {
    const { examScheduleId, studentId, subject, marksObtained, totalMarks, remarks } = req.body;
    const { branch } = await getBranchClient(req.userId);

    const student = await Student.findById(studentId).lean();
    if (!student || student.branch.toString() !== branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const percentage = (marksObtained / totalMarks) * 100;
    const grade = calculateGrade(percentage);

    const existingMarks = await Marks.findOne({
      examSchedule: examScheduleId,
      student: studentId,
      subject
    });

    if (existingMarks) {
      existingMarks.marksObtained = marksObtained;
      existingMarks.totalMarks = totalMarks;
      existingMarks.grade = grade;
      existingMarks.remarks = remarks;
      await existingMarks.save();
      return res.status(200).json({ message: 'Marks updated successfully', marks: existingMarks });
    }

    const marks = new Marks({
      examSchedule: examScheduleId,
      student: studentId,
      subject,
      marksObtained,
      totalMarks,
      grade,
      remarks,
      branch,
      enteredBy: req.userId
    });

    await marks.save();

    res.status(201).json({ message: 'Marks added successfully', marks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Marks by Exam and Class
exports.getMarksByExam = async (req, res) => {
  try {
    const { examScheduleId, classId, section } = req.query;
    const { branch } = await getBranchClient(req.userId);

    const query = { branch, status: 'active' };

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.class = new mongoose.Types.ObjectId(classId);
    }
    if (section && section !== 'undefined' && section !== 'null' && mongoose.Types.ObjectId.isValid(section)) {
      query.section = new mongoose.Types.ObjectId(section);
    }

    const [students, marks] = await Promise.all([
      Student.find(query)
        .select('firstName lastName admissionNumber rollNumber')
        .sort({ rollNumber: 1 })
        .lean(),
      examScheduleId
        ? Marks.find({ examSchedule: examScheduleId, branch }).lean()
        : []
    ]);

    const result = students.map(student => ({
      ...student,
      marks: marks.filter(m => m.student.toString() === student._id.toString())
    }));

    res.status(200).json({ students: result });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Student Marks Report
exports.getStudentMarksReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { branch } = await getBranchClient(req.userId);

    const student = await Student.findById(studentId)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .lean();

    if (!student || student.branch.toString() !== branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const marks = await Marks.find({ student: studentId })
      .populate('examSchedule', 'examName examType date')
      .sort({ createdAt: -1 })
      .lean();

    const groupedByExam = marks.reduce((acc, mark) => {
      const examId = mark.examSchedule._id.toString();
      if (!acc[examId]) {
        acc[examId] = {
          exam: mark.examSchedule,
          subjects: []
        };
      }
      acc[examId].subjects.push({
        subject: mark.subject,
        marksObtained: mark.marksObtained,
        totalMarks: mark.totalMarks,
        grade: mark.grade,
        percentage: ((mark.marksObtained / mark.totalMarks) * 100).toFixed(2)
      });
      return acc;
    }, {});

    res.status(200).json({
      student,
      exams: Object.values(groupedByExam)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Grading System
const gradingSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  gradeName: { type: String, required: true },
  minPercentage: { type: Number, required: true },
  maxPercentage: { type: Number, required: true },
  gradePoint: { type: Number },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const GradingSystem = mongoose.models.GradingSystem || mongoose.model('GradingSystem', gradingSchema);

// Create Grading System
exports.createGrading = async (req, res) => {
  try {
    const { gradeName, minPercentage, maxPercentage, gradePoint, description } = req.body;
    const { branch } = await getBranchClient(req.userId);

    const grading = new GradingSystem({
      branch,
      gradeName,
      minPercentage,
      maxPercentage,
      gradePoint,
      description
    });

    await grading.save();

    res.status(201).json({ message: 'Grading system created successfully', grading });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Grading System
exports.getGradingSystem = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);

    const grading = await GradingSystem.find({ branch })
      .sort({ minPercentage: -1 })
      .lean();

    res.status(200).json({ grading });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Grading
exports.updateGrading = async (req, res) => {
  try {
    const { id } = req.params;
    const { gradeName, minPercentage, maxPercentage, gradePoint, description } = req.body;
    const { branch } = await getBranchClient(req.userId);

    const grading = await GradingSystem.findOne({ _id: id, branch });
    if (!grading) {
      return res.status(404).json({ message: 'Grading not found' });
    }

    if (gradeName) grading.gradeName = gradeName;
    if (minPercentage !== undefined) grading.minPercentage = minPercentage;
    if (maxPercentage !== undefined) grading.maxPercentage = maxPercentage;
    if (gradePoint !== undefined) grading.gradePoint = gradePoint;
    if (description !== undefined) grading.description = description;

    await grading.save();

    res.status(200).json({ message: 'Grading updated successfully', grading });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Grading
exports.deleteGrading = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchClient(req.userId);

    await GradingSystem.findOneAndDelete({ _id: id, branch });

    res.status(200).json({ message: 'Grading deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Online Exam Schema
const onlineExamSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  title: { type: String, required: true },
  description: { type: String },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  subject: { type: String, required: true },
  duration: { type: Number, required: true }, // in minutes
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    marks: Number
  }],
  status: { type: String, enum: ['draft', 'published', 'completed'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

const OnlineExam = mongoose.models.OnlineExam || mongoose.model('OnlineExam', onlineExamSchema);

// Create Online Exam
exports.createOnlineExam = async (req, res) => {
  try {
    const { title, description, class: classId, section, subject, duration, totalMarks, passingMarks, startDate, endDate, questions, status } = req.body;
    const { branch } = await getBranchClient(req.userId);

    // Validation
    if (!title || !classId || !subject || !duration || !totalMarks || !passingMarks || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    const exam = new OnlineExam({
      branch,
      title,
      description,
      class: classId,
      section: section || null,
      subject,
      duration: Number(duration),
      totalMarks: Number(totalMarks),
      passingMarks: Number(passingMarks),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      questions,
      status: status || 'draft',
      createdBy: req.userId
    });

    await exam.save();

    res.status(201).json({ message: 'Online exam created successfully', exam });
  } catch (error) {
    console.error('Create online exam error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Online Exams
exports.getAllOnlineExams = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const { branch } = await getBranchClient(req.userId);
    const skip = (page - 1) * limit;

    const query = { branch };
    if (status) query.status = status;

    const [exams, total] = await Promise.all([
      OnlineExam.find(query)
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      OnlineExam.countDocuments(query)
    ]);

    res.status(200).json({
      exams,
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

// Get Online Exam by ID
exports.getOnlineExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchClient(req.userId);

    const exam = await OnlineExam.findOne({ _id: id, branch })
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .lean();

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.status(200).json({ exam });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Online Exam
exports.updateOnlineExam = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { branch } = await getBranchClient(req.userId);

    const exam = await OnlineExam.findOneAndUpdate(
      { _id: id, branch },
      updates,
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.status(200).json({ message: 'Exam updated successfully', exam });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Online Exam
exports.deleteOnlineExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchClient(req.userId);

    await OnlineExam.findOneAndDelete({ _id: id, branch });

    res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all marks history
exports.getAllMarksHistory = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { limit = 1000, classId, examScheduleId } = req.query;

    const query = { branch };
    if (examScheduleId) query.examSchedule = examScheduleId;

    const marks = await Marks.find(query)
      .populate({
        path: 'student',
        select: 'firstName lastName rollNumber admissionNumber class',
        populate: { path: 'class', select: 'className' }
      })
      .populate('examSchedule', 'examName examType date subject totalMarks passingMarks')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Filter by class if provided
    let filteredMarks = marks;
    if (classId) {
      filteredMarks = marks.filter(m =>
        m.student?.class?._id?.toString() === classId ||
        m.student?.class?.toString() === classId
      );
    }

    res.status(200).json({ marks: filteredMarks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- NEWLY ADDED MISSING FUNCTIONS ---

exports.getExamTypes = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);

    // Try fetching from ExamType collection first
    let examTypes = await ExamType.find({ branch, status: true })
      .populate('marksheetTemplate')
      .sort({ createdAt: -1 })
      .lean();

    // Map ExamType model to common format if found
    if (examTypes.length > 0) {
      examTypes = examTypes.map(et => ({
        _id: et._id,
        examTypeName: et.examTypeName,
        examTypeCode: et.examTypeCode,
        description: et.description,
        isActive: et.status !== false
      }));
    }

    // If empty, try fetching from ClientSettings
    if (examTypes.length === 0) {
      const settings = await ClientSettings.findOne({ branchId: branch }).lean();
      if (settings && settings.marksheet && settings.marksheet.examTypes) {
        examTypes = settings.marksheet.examTypes.map(et => ({
          _id: et._id,
          examTypeName: et.name,
          examTypeCode: et.code,
          description: et.description,
          isActive: et.isActive !== false
        }));
      }
    }

    res.status(200).json({ success: true, data: examTypes });
  } catch (error) {
    console.error('Get Exam Types Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching exam types', error: error.message });
  }
};

exports.getMarksheetTemplate = async (req, res) => {
  try {
    const { examTypeId } = req.params;
    const ExamType = require('../../model/ExamType');
    const examType = await ExamType.findById(examTypeId).populate('marksheetTemplate');
    if (!examType || !examType.marksheetTemplate) {
      return res.status(404).json({ message: 'Marksheet template not found for this exam type' });
    }
    res.status(200).json(examType.marksheetTemplate);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching marksheet template', error: error.message });
  }
};

exports.getBranding = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    res.status(200).json({ branch, client });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching branding', error: error.message });
  }
};

exports.debugAllExamTypes = async (req, res) => {
  try {
    const ExamType = require('../../model/ExamType');
    const examTypes = await ExamType.find({}).lean();
    res.status(200).json({ count: examTypes.length, examTypes });
  } catch (error) {
    res.status(500).json({ message: 'Debug failed', error: error.message });
  }
};

// --- END MISSING FUNCTIONS ---

// Helper function to calculate grade
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 33) return 'D';
  return 'E';
}

exports.getParsedDynamicMarksheet = async (req, res) => {
  try {
    const { studentId, examScheduleId, examTypeId } = req.query;
    const { branch } = await getBranchClient(req.userId);
    const fs = require('fs');
    const path = require('path');

    const schedule = await ExamSchedule.findById(examScheduleId).populate('examTypeId').lean();

    if (!schedule && !examScheduleId) {
      return res.status(200).send('<h1 style="color:red; text-align:center;">Exam Schedule or ID required</h1>');
    }

    // 1. Determine Exam Type and Template
    const ExamType = require('../../model/ExamType');
    let examType;
    const targetId = schedule?.examTypeId || examTypeId;

    if (targetId && typeof targetId === 'object' && targetId._id) {
      // If it's already a populated object, use it directly
      examType = targetId;
      // But we might need to populate marksheetTemplate if not already there
      if (!examType.marksheetTemplate || typeof examType.marksheetTemplate !== 'object') {
        const freshExamType = await ExamType.findById(examType._id).populate('marksheetTemplate').lean();
        if (freshExamType) examType = freshExamType;
      }
    } else if (mongoose.Types.ObjectId.isValid(targetId)) {
      examType = await ExamType.findById(targetId).populate('marksheetTemplate').lean();
    } else if (targetId) {
      // If it's a string name, search by name
      examType = await ExamType.findOne({
        $or: [
          { examTypeName: targetId },
          { examTypeCode: targetId }
        ],
        branch: branch
      }).populate('marksheetTemplate').lean();
    }

    let templateHtml = "";
    let templateSource = "Local File";

    if (examType && examType.marksheetTemplate && examType.marksheetTemplate.htmlContent) {
      templateHtml = examType.marksheetTemplate.htmlContent;
      templateSource = "Database Template";
    } else {
      try {
        const fs = require('fs');
        const path = require('path');
        templateHtml = fs.readFileSync(path.join(__dirname, '../../temp_marksheet_template.html'), 'utf8');
      } catch (e) {
        templateHtml = "<h1>Template Not Found</h1><p>Please upload a marksheet template in Admin Panel.</p>";
      }
    }

    console.log(`[Marksheet] Using ${templateSource} for Exam: ${examType?.examTypeName}`);

    // 2. Fetch Student, Marks, and Branding
    const student = await Student.findById(studentId).populate('class section').lean();
    if (!student) return res.status(200).send('<h1 style="color:red; text-align:center;">Student not found</h1>');

    const branding = await getBranchClient(req.userId);

    // Fetch ALL marks for this exam type
    const allSchedulesForExamType = await ExamSchedule.find({ examTypeId: examType?._id, branch }).select('_id').lean();
    const scheduleIds = allSchedulesForExamType.map(s => s._id);
    const marks = await Marks.find({
      student: studentId,
      examSchedule: { $in: scheduleIds }
    }).populate({
      path: 'examSchedule',
      populate: { path: 'subject', select: 'subjectName' }
    }).lean();

    if (!marks || marks.length === 0) {
      return res.status(200).send(`
            <div style="text-align: center; padding: 50px; font-family: sans-serif;">
                <h1 style="color: #ef4444;">Marks Not Found</h1>
                <p>No marks recorded for ${student.firstName} in ${examType?.examTypeName || 'this exam'}.</p>
                <p>Please ensure marks are uploaded for all subjects.</p>
            </div>
        `);
    }

    const totalObtained = marks.reduce((sum, m) => sum + (m.marksObtained || 0), 0);
    const totalMax = marks.reduce((sum, m) => sum + (m.totalMarks || 0), 0);
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
    const finalGrade = calculateGrade(percentage);
    const resultStatus = percentage >= 33 ? 'PASSED' : 'FAILED';

    let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr style="background-color: #f8fafc; color: #1e293b;">
                    <th style="border: 1px solid #e2e8f0; padding: 10px; font-size: 10px;">S.No</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px; font-size: 10px; text-align: left;">Subject Name</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px; font-size: 10px;">Max Marks</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px; font-size: 10px;">Min Marks</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px; font-size: 10px;">Obtained</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px; font-size: 10px;">Grade</th>
                </tr>
            </thead>
            <tbody>`;

    marks.forEach((m, index) => {
      const subMax = m.totalMarks || 100;
      const subObtained = m.marksObtained || 0;
      const subPercentage = (subObtained / subMax) * 100;

      tableHtml += `
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-weight: 500;">${m.subject || 'Subject'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${subMax}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">33</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-weight: bold;">${subObtained}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${calculateGrade(subPercentage)}</td>
            </tr>`;
    });
    tableHtml += `</tbody></table>`;

    const templatePath = path.join(__dirname, '../../temp_marksheet_template.html');
    if (!fs.existsSync(templatePath)) return res.status(200).send('<h1 style="color:red; text-align:center;">Template file not found</h1>');

    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    const settings = await ClientSettings.findOne({ branchId: branding.branch?._id }).lean();

    const schoolName = settings?.branding?.schoolName || branding.client?.name || branding.branch?.branchName || 'School Name';
    const schoolAddress = settings?.branding?.address || branding.branch?.address || 'Address Not Found';
    const schoolLogo = settings?.branding?.logo || '';
    const branchName = branding.branch?.branchName || '';

    const mappings = {
      '{{student_name}}': `${student.firstName} ${student.lastName}`,
      '{{father_name}}': student.fatherName || 'N/A',
      '{{roll_no}}': student.rollNumber || 'N/A',
      '{{admission_no}}': student.admissionNumber || 'N/A',
      '{{class}}': student.class?.className || 'N/A',
      '{{section}}': student.section?.sectionName || 'A',
      '{{dob}}': student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A',
      '{{gender}}': student.gender || 'N/A',
      '{{school_name}}': schoolName,
      '{{school_address}}': schoolAddress,
      '{{branch_name}}': branchName,
      '{{exam_title}}': marks[0].examSchedule?.examTitle || 'Examination',
      '{{academic_year}}': '2024 - 2025',
      '{{total_obtained}}': totalObtained,
      '{{total_max}}': totalMax,
      '{{percentage}}': percentage,
      '{{grade}}': finalGrade,
      '{{result_status}}': resultStatus,
      '{{subject_table}}': tableHtml,
      '{{school_logo}}': schoolLogo,
      '{{school_stamp}}': branding.branch?.stamp || ''
    };

    Object.keys(mappings).forEach(tag => {
      const regex = new RegExp(tag, 'g');
      htmlContent = htmlContent.replace(regex, mappings[tag]);
    });

    res.status(200).send(htmlContent);

  } catch (error) {
    console.error('Dynamic Marksheet Parser Error:', error);
    res.status(200).send(`<div style="text-align: center; padding: 50px;"><h1>Internal Error</h1><p>${error.message}</p></div>`);
  }
};

module.exports.Marks = Marks;
// module.exports.GradingSystem = GradingSystem; // If needed
// module.exports.OnlineExam = OnlineExam; // If needed
