const express = require('express');
const router = express.Router();
const MarksheetTemplate = require('../model/MarksheetTemplate');
const auth = require('../middleware/auth');
const uploadTemplate = require('../middleware/uploadTemplate');

// Get all marksheet templates for a branch
router.get('/', auth, async (req, res) => {
  try {
    const { branchId } = req.query;
    
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    const templates = await MarksheetTemplate.find({ branch: branchId, status: true })
      .populate('branch', 'branchName')
      .populate('client', 'clientName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// Get single template
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await MarksheetTemplate.findById(req.params.id)
      .populate('branch', 'branchName')
      .populate('client', 'clientName');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
});

// Create marksheet template
router.post('/', auth, uploadTemplate.single('file'), async (req, res) => {
  try {
    const { templateName, fileType, branchId } = req.body;
    const userId = req.userId;

    if (!templateName || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'templateName and branchId are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    const templateFile = req.file.cloudinaryUrl || `/uploads/admin/templates/${req.file.filename}`;

    const newTemplate = new MarksheetTemplate({
      templateName,
      templateFile,
      fileType: fileType || 'pdf',
      fileSize: req.file.size,
      branch: branchId,
      client: req.user.client,
      createdBy: userId,
      status: true
    });

    await newTemplate.save();
    await newTemplate.populate('branch', 'branchName');
    await newTemplate.populate('client', 'clientName');

    res.status(201).json({
      success: true,
      message: 'Marksheet template created successfully',
      data: newTemplate
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
});

// Update marksheet template
router.put('/:id', auth, uploadTemplate.single('file'), async (req, res) => {
  try {
    const { templateName, fileType } = req.body;
    const { id } = req.params;

    const template = await MarksheetTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (templateName) template.templateName = templateName;
    if (fileType) template.fileType = fileType;

    if (req.file) {
      template.templateFile = req.file.cloudinaryUrl || `/uploads/admin/templates/${req.file.filename}`;
      template.fileSize = req.file.size;
    }

    await template.save();
    await template.populate('branch', 'branchName');
    await template.populate('client', 'clientName');

    res.status(200).json({
      success: true,
      message: 'Marksheet template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
});

// Delete marksheet template
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await MarksheetTemplate.findByIdAndUpdate(
      id,
      { status: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Marksheet template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
});

module.exports = router;
