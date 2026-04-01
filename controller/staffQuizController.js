const StaffQuiz = require('../model/StaffQuiz');
const Admin = require('../model/Admin');

const getBranch = async (userId) => {
  const admin = await Admin.findById(userId).select('branch').lean();
  return admin?.branch || null;
};

// Create / Save Quiz
exports.createQuiz = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { title, subject, class: cls, timeLimit, questions, status } = req.body;
    if (!title) return res.status(400).json({ message: 'Quiz title is required' });
    if (!questions?.length) return res.status(400).json({ message: 'Add at least one question' });

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    const quiz = await StaffQuiz.create({
      branch, title, subject, class: cls, timeLimit, questions, totalPoints,
      status: status || 'draft', createdBy: req.userId
    });

    res.status(201).json({ message: 'Quiz saved successfully', quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Quizzes (fast lean)
exports.getAllQuizzes = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { status, subject } = req.query;
    const query = { branch };
    if (status) query.status = status;
    if (subject) query.subject = subject;

    const quizzes = await StaffQuiz.find(query)
      .select('-questions')  // exclude questions in list for speed
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ quizzes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Single Quiz with questions
exports.getQuizById = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const quiz = await StaffQuiz.findOne({ _id: req.params.id, branch }).lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    res.status(200).json({ quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Quiz
exports.updateQuiz = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const updateData = { ...req.body };
    if (updateData.questions) {
      updateData.totalPoints = updateData.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    }

    const quiz = await StaffQuiz.findOneAndUpdate(
      { _id: req.params.id, branch },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.status(200).json({ message: 'Quiz updated successfully', quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const quiz = await StaffQuiz.findOneAndDelete({ _id: req.params.id, branch });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.status(200).json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
