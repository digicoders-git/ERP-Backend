const ExamSchedule = require('../../model/ExamSchedule');
const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const mongoose = require('mongoose');

// Marks Schema (embedded in ExamSchedule or separate collection)
const marksSchema = new mongoose.Schema({
  examSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSchedule', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  marksObtained: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  grade: { type: String },
  remarks: { type: String },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: { type: Date, default: Date.now }
});

const Marks = mongoose.models.Marks || mongoose.model('Marks', marksSchema);

// Add/Update Marks
exports.addMarks = async (req, res) => {
  try {
    const { examScheduleId, studentId, subject, marksObtained, totalMarks, remarks } = req.body;
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(studentId).lean();
    if (!student || student.branch.toString() !== admin.branch.toString()) {
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
      branch: admin.branch,
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
    const admin = await Admin.findById(req.userId).lean();

    const query = { branch: admin.branch };
    if (classId) query.class = classId;
    if (section) query.section = section;
    query.status = 'active';

    const [students, marks] = await Promise.all([
      Student.find(query)
        .select('name admissionNumber rollNumber')
        .sort({ rollNumber: 1 })
        .lean(),
      Marks.find({ examSchedule: examScheduleId, branch: admin.branch })
        .lean()
    ]);

    const marksMap = {};
    marks.forEach(m => {
      const key = `${m.student}_${m.subject}`;
      marksMap[key] = m;
    });

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
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(studentId)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .lean();

    if (!student || student.branch.toString() !== admin.branch.toString()) {
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
    const admin = await Admin.findById(req.userId).lean();

    const grading = new GradingSystem({
      branch: admin.branch,
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
    const admin = await Admin.findById(req.userId).lean();

    const grading = await GradingSystem.find({ branch: admin.branch })
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
    const admin = await Admin.findById(req.userId).lean();

    const grading = await GradingSystem.findOne({ _id: id, branch: admin.branch });
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
    const admin = await Admin.findById(req.userId).lean();

    await GradingSystem.findOneAndDelete({ _id: id, branch: admin.branch });

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
    const { title, description, class: classId, section, subject, duration, totalMarks, passingMarks, startDate, endDate, questions } = req.body;
    const admin = await Admin.findById(req.userId).lean();

    const exam = new OnlineExam({
      branch: admin.branch,
      title,
      description,
      class: classId,
      section,
      subject,
      duration,
      totalMarks,
      passingMarks,
      startDate,
      endDate,
      questions,
      createdBy: req.userId
    });

    await exam.save();

    res.status(201).json({ message: 'Online exam created successfully', exam });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Online Exams
exports.getAllOnlineExams = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;

    const query = { branch: admin.branch };
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
    const admin = await Admin.findById(req.userId).lean();

    const exam = await OnlineExam.findOne({ _id: id, branch: admin.branch })
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
    const admin = await Admin.findById(req.userId).lean();

    const exam = await OnlineExam.findOneAndUpdate(
      { _id: id, branch: admin.branch },
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
    const admin = await Admin.findById(req.userId).lean();

    await OnlineExam.findOneAndDelete({ _id: id, branch: admin.branch });

    res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to calculate grade
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

module.exports.Marks = Marks;
module.exports.GradingSystem = GradingSystem;
module.exports.OnlineExam = OnlineExam;
