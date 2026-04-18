const PerformanceEvaluation = require('../../model/PerformanceEvaluation');
const Teacher = require('../../model/Teacher');
const Admin = require('../../model/Admin');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getMyEvaluations = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId).select('teacher').lean();
    
    if (!admin || !admin.teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    const teacher = await Teacher.findById(admin.teacher).select('name').lean();
    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    const evaluations = await PerformanceEvaluation.find({ teacher: admin.teacher })
      .populate('teacher', 'name profileImage email')
      .sort({ evaluationDate: -1 })
      .lean();

    return successResponse(res, evaluations, 'Evaluations fetched successfully');
  } catch (error) {
    console.error('Get my evaluations error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getAllEvaluations = async (req, res) => {
  try {
    const evaluations = await PerformanceEvaluation.find()
      .populate('teacher', 'name profileImage email')
      .sort({ createdAt: -1 });
    return successResponse(res, evaluations, 'Evaluations fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getEvaluationById = async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluation.findById(req.params.id);
    if (!evaluation) {
      return errorResponse(res, 'Evaluation not found', 404);
    }
    return successResponse(res, evaluation, 'Evaluation fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createEvaluation = async (req, res) => {
  try {
    const { teacher, teacherName, evaluationPeriod, teachingQuality, studentEngagement, punctuality, professionalism, feedback, evaluatedBy } = req.body;

    if (!teacherName || !evaluationPeriod || !teachingQuality || !studentEngagement || !punctuality || !professionalism || !evaluatedBy) {
      return errorResponse(res, 'All required fields must be provided', 400);
    }

    const overallRating = ((parseFloat(teachingQuality) + parseFloat(studentEngagement) + parseFloat(punctuality) + parseFloat(professionalism)) / 4).toFixed(1);

    const evaluation = new PerformanceEvaluation({
      teacher: teacher || null,
      teacherName,
      evaluationPeriod,
      teachingQuality: parseFloat(teachingQuality),
      studentEngagement: parseFloat(studentEngagement),
      punctuality: parseFloat(punctuality),
      professionalism: parseFloat(professionalism),
      overallRating: parseFloat(overallRating),
      feedback: feedback || '',
      evaluatedBy,
      evaluationDate: new Date()
    });

    await evaluation.save();
    return successResponse(res, evaluation, 'Evaluation created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateEvaluation = async (req, res) => {
  try {
    const { teacher, teacherName, evaluationPeriod, teachingQuality, studentEngagement, punctuality, professionalism, feedback, evaluatedBy } = req.body;
    const evaluation = await PerformanceEvaluation.findById(req.params.id);

    if (!evaluation) {
      return errorResponse(res, 'Evaluation not found', 404);
    }

    if (teacher) evaluation.teacher = teacher;
    if (teacherName) evaluation.teacherName = teacherName;
    if (evaluationPeriod) evaluation.evaluationPeriod = evaluationPeriod;
    if (teachingQuality !== undefined) evaluation.teachingQuality = parseFloat(teachingQuality);
    if (studentEngagement !== undefined) evaluation.studentEngagement = parseFloat(studentEngagement);
    if (punctuality !== undefined) evaluation.punctuality = parseFloat(punctuality);
    if (professionalism !== undefined) evaluation.professionalism = parseFloat(professionalism);
    if (feedback) evaluation.feedback = feedback;
    if (evaluatedBy) evaluation.evaluatedBy = evaluatedBy;

    evaluation.overallRating = ((evaluation.teachingQuality + evaluation.studentEngagement + evaluation.punctuality + evaluation.professionalism) / 4).toFixed(1);

    await evaluation.save();
    return successResponse(res, evaluation, 'Evaluation updated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteEvaluation = async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluation.findByIdAndDelete(req.params.id);
    if (!evaluation) {
      return errorResponse(res, 'Evaluation not found', 404);
    }
    return successResponse(res, null, 'Evaluation deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getEvaluationsByTeacher = async (req, res) => {
  try {
    const { teacherName } = req.params;
    const evaluations = await PerformanceEvaluation.find({ teacherName }).sort({ evaluationDate: -1 });
    return successResponse(res, evaluations, 'Evaluations fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getEvaluationsByPeriod = async (req, res) => {
  try {
    const { period } = req.params;
    const evaluations = await PerformanceEvaluation.find({ evaluationPeriod: period });
    return successResponse(res, evaluations, 'Evaluations fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getPerformanceReport = async (req, res) => {
  try {
    const totalEvaluations = await PerformanceEvaluation.countDocuments();
    
    const highPerformers = await PerformanceEvaluation.countDocuments({ overallRating: { $gte: 4.5 } });
    const averagePerformers = await PerformanceEvaluation.countDocuments({ overallRating: { $gte: 3.5, $lt: 4.5 } });
    const lowPerformers = await PerformanceEvaluation.countDocuments({ overallRating: { $lt: 3.5 } });

    const avgRating = await PerformanceEvaluation.aggregate([
      { $group: { _id: null, average: { $avg: '$overallRating' } } }
    ]);

    const report = {
      totalEvaluations,
      highPerformers,
      averagePerformers,
      lowPerformers,
      averageRating: avgRating[0]?.average.toFixed(1) || 0
    };

    return successResponse(res, report, 'Performance report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
