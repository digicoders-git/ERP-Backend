const ExamType = require('../model/ExamType');
const MarksheetTemplate = require('../model/MarksheetTemplate');

// Get all exam types for a branch
exports.getAllExamTypes = async (req, res) => {
  try {
    const { branchId } = req.query;
    
    const query = { status: true };
    if (branchId) {
      query.branch = branchId;
    }

    const examTypes = await ExamType.find(query)
      .populate('marksheetTemplate', 'templateName templateFile fileType')
      .populate('branch', 'branchName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: examTypes
    });
  } catch (error) {
    console.error('Error fetching exam types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam types',
      error: error.message
    });
  }
};

// Get single exam type with marksheet template
exports.getExamTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const examType = await ExamType.findById(id)
      .populate('marksheetTemplate')
      .populate('branch', 'branchName');

    if (!examType) {
      return res.status(404).json({
        success: false,
        message: 'Exam type not found'
      });
    }

    res.status(200).json({
      success: true,
      data: examType
    });
  } catch (error) {
    console.error('Error fetching exam type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam type',
      error: error.message
    });
  }
};

// Create exam type
exports.createExamType = async (req, res) => {
  try {
    const { 
      examTypeName, 
      examTypeCode, 
      description, 
      marksheetTemplate, 
      branchId,
      marksType,
      passingPercentage,
      theoryMarks,
      practicalMarks,
      totalMarks
    } = req.body;
    const userId = req.userId;

    if (!examTypeName || !examTypeCode || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'examTypeName, examTypeCode, and branchId are required'
      });
    }

    // Check if exam type code already exists for this branch
    const existingCode = await ExamType.findOne({ examTypeCode, branch: branchId });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Exam type code already exists for this branch'
      });
    }

    const newExamType = new ExamType({
      examTypeName,
      examTypeCode,
      description,
      marksheetTemplate: marksheetTemplate || null,
      branch: branchId,
      client: req.user.client,
      createdBy: userId,
      status: true,
      marksType: marksType || 'theory',
      passingPercentage: passingPercentage || 33,
      theoryMarks: theoryMarks || 100,
      practicalMarks: practicalMarks || 0,
      totalMarks: totalMarks || 100
    });

    await newExamType.save();
    await newExamType.populate('marksheetTemplate', 'templateName templateFile fileType');
    await newExamType.populate('branch', 'branchName');

    res.status(201).json({
      success: true,
      message: 'Exam type created successfully',
      data: newExamType
    });
  } catch (error) {
    console.error('Error creating exam type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exam type',
      error: error.message
    });
  }
};

// Update exam type
exports.updateExamType = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      examTypeName, 
      description, 
      marksheetTemplate,
      marksType,
      passingPercentage,
      theoryMarks,
      practicalMarks,
      totalMarks
    } = req.body;

    const examType = await ExamType.findByIdAndUpdate(
      id,
      {
        examTypeName,
        description,
        marksheetTemplate: marksheetTemplate || null,
        marksType,
        passingPercentage,
        theoryMarks,
        practicalMarks,
        totalMarks
      },
      { new: true }
    ).populate('marksheetTemplate');

    if (!examType) {
      return res.status(404).json({
        success: false,
        message: 'Exam type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam type updated successfully',
      data: examType
    });
  } catch (error) {
    console.error('Error updating exam type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exam type',
      error: error.message
    });
  }
};

// Delete exam type
exports.deleteExamType = async (req, res) => {
  try {
    const { id } = req.params;

    const examType = await ExamType.findByIdAndUpdate(
      id,
      { status: false },
      { new: true }
    );

    if (!examType) {
      return res.status(404).json({
        success: false,
        message: 'Exam type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam type',
      error: error.message
    });
  }
};

// Get marksheet template for exam type
exports.getMarksheetTemplate = async (req, res) => {
  try {
    const { examTypeId } = req.params;

    const examType = await ExamType.findById(examTypeId)
      .populate('marksheetTemplate');

    if (!examType) {
      return res.status(404).json({
        success: false,
        message: 'Exam type not found'
      });
    }

    if (!examType.marksheetTemplate) {
      return res.status(404).json({
        success: false,
        message: 'No marksheet template assigned to this exam type'
      });
    }

    res.status(200).json({
      success: true,
      data: examType.marksheetTemplate
    });
  } catch (error) {
    console.error('Error fetching marksheet template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marksheet template',
      error: error.message
    });
  }
};
