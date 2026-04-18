const Quiz = require('../../model/Quiz');
const Admin = require('../../model/Admin');

// Create Quiz
exports.createQuiz = async (req, res) => {
  try {
    const { title, subject, numberOfQuestions, timeLimit, classId, sectionId } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can create quizzes' });
    }

    const quiz = new Quiz({
      title,
      subject,
      numberOfQuestions,
      timeLimit,
      class: classId,
      section: sectionId,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await quiz.save();
    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Quizzes
exports.getAllQuizzes = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, classId, sectionId } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view quizzes' });
    }

    const searchQuery = { branch: admin.branch, createdBy: adminId };
    if (subject) searchQuery.subject = { $regex: subject, $options: 'i' };
    if (classId) searchQuery.class = classId;
    if (sectionId) searchQuery.section = sectionId;

    const quizzes = await Quiz.find(searchQuery)
      .populate('createdBy', 'email role')
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Quiz.countDocuments(searchQuery);

    res.status(200).json({
      quizzes,
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

// Get Quiz By ID
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view quiz details' });
    }

    const quiz = await Quiz.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, numberOfQuestions, timeLimit, classId, sectionId, status } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update quizzes' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) quiz.title = title;
    if (subject) quiz.subject = subject;
    if (numberOfQuestions) quiz.numberOfQuestions = numberOfQuestions;
    if (timeLimit) quiz.timeLimit = timeLimit;
    if (classId) quiz.class = classId;
    if (sectionId) quiz.section = sectionId;
    if (status) quiz.status = status;

    await quiz.save();
    res.status(200).json({ message: 'Quiz updated successfully', quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete quizzes' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Quiz.findByIdAndDelete(id);
    res.status(200).json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
