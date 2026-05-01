const TemplateMapping = require('../model/TemplateMapping');
const ExamType = require('../model/ExamType');

// Get all mappings for a branch
exports.getAllMappings = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) return res.status(400).json({ message: 'branchId is required' });

    const mappings = await TemplateMapping.find({ branch: branchId, status: true })
      .populate('examType', 'examTypeName')
      .populate('classes', 'className')
      .populate('template', 'templateName templateFile')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: mappings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create mapping
exports.createMapping = async (req, res) => {
  try {
    const { examType, classes, template, branchId } = req.body;
    const userId = req.userId;

    const mapping = new TemplateMapping({
      examType,
      classes,
      template,
      branch: branchId,
      client: req.user.client,
      createdBy: userId
    });

    await mapping.save();
    res.status(201).json({ success: true, message: 'Mapping created successfully', data: mapping });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Find correct template for exam and class
exports.getMappedTemplate = async (req, res) => {
  try {
    const { examTypeId, classId, branchId } = req.query;

    // 1. Check for specific mapping for this class
    let mapping = await TemplateMapping.findOne({
      examType: examTypeId,
      classes: classId,
      branch: branchId,
      status: true
    }).populate('template');

    // 2. If not found, check if there's a mapping with "no classes" (interpreted as default/all)
    if (!mapping) {
      mapping = await TemplateMapping.findOne({
        examType: examTypeId,
        classes: { $size: 0 },
        branch: branchId,
        status: true
      }).populate('template');
    }

    // 3. Fallback to the default template assigned to the ExamType itself
    if (!mapping) {
      const examType = await ExamType.findById(examTypeId).populate('marksheetTemplate');
      if (examType && examType.marksheetTemplate) {
        return res.status(200).json({ success: true, data: examType.marksheetTemplate });
      }
    }

    if (!mapping) {
      return res.status(404).json({ success: false, message: 'No template mapping found' });
    }

    res.status(200).json({ success: true, data: mapping.template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete mapping
exports.deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;
    await TemplateMapping.findByIdAndUpdate(id, { status: false });
    res.status(200).json({ success: true, message: 'Mapping deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
