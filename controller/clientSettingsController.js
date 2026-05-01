const ClientSettings = require('../model/ClientSettings');
const Client = require('../model/Client');
const Admin = require('../model/Admin');
const mongoose = require('mongoose');

// Get Client Settings
exports.getSettings = async (req, res) => {
  try {
    const branchId = req.query.branchId || req.user?.branch;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    // Validate branchId is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: req.user.client 
    });
    
    // If settings don't exist, create default settings
    if (!settings) {
      try {
        settings = new ClientSettings({ 
          branchId: new mongoose.Types.ObjectId(branchId), 
          client: req.user.client 
        });
        await settings.save();
      } catch (err) {
        // If duplicate key error, fetch the existing one
        if (err.code === 11000) {
          settings = await ClientSettings.findOne({ 
            branchId: new mongoose.Types.ObjectId(branchId), 
            client: req.user.client 
          });
        } else {
          throw err;
        }
      }
    }

    const client = await Client.findById(req.user.client).select('purchasedPanels');
    res.status(200).json({ 
      success: true, 
      settings,
      purchasedPanels: client?.purchasedPanels || []
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Branding Settings
exports.updateBranding = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    // Validate branchId is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { schoolName, address, phone, email, website, primaryColor, secondaryColor, accentColor, fontFamily } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    // Handle logo upload
    if (req.file) {
      settings.branding.logo = req.file.cloudinaryUrl || `/uploads/client-settings/${req.file.filename}`;
    }

    if (schoolName) settings.branding.schoolName = schoolName;
    if (address) settings.branding.address = address;
    if (phone) settings.branding.phone = phone;
    if (email) settings.branding.email = email;
    if (website) settings.branding.website = website;
    if (primaryColor) settings.branding.primaryColor = primaryColor;
    if (secondaryColor) settings.branding.secondaryColor = secondaryColor;
    if (accentColor) settings.branding.accentColor = accentColor;
    if (fontFamily) settings.branding.fontFamily = fontFamily;

    await settings.save();
    res.status(200).json({ success: true, message: 'Branding updated', settings: settings.branding });
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Staff Configuration
exports.updateStaffConfig = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { idFormat, displayFields, customFields, idCardFields } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (idFormat) settings.staff.idFormat = idFormat;
    if (displayFields) settings.staff.displayFields = displayFields;
    if (customFields) settings.staff.customFields = customFields;
    if (idCardFields) settings.staff.idCardFields = idCardFields;

    await settings.save();
    res.status(200).json({ success: true, message: 'Staff configuration updated', settings: settings.staff });
  } catch (error) {
    console.error('Update staff config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Teacher Configuration
exports.updateTeacherConfig = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { idFormat, displayFields, customFields, idCardFields } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (idFormat) settings.teacher.idFormat = idFormat;
    if (displayFields) settings.teacher.displayFields = displayFields;
    if (customFields) settings.teacher.customFields = customFields;
    if (idCardFields) settings.teacher.idCardFields = idCardFields;

    await settings.save();
    res.status(200).json({ success: true, message: 'Teacher configuration updated', settings: settings.teacher });
  } catch (error) {
    console.error('Update teacher config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Student Configuration
exports.updateStudentConfig = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { idFormat, rollNumberFormat, displayFields, customFields, idCardFields } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (idFormat) settings.student.idFormat = idFormat;
    if (rollNumberFormat) settings.student.rollNumberFormat = rollNumberFormat;
    if (displayFields) settings.student.displayFields = displayFields;
    if (customFields) settings.student.customFields = customFields;
    if (idCardFields) settings.student.idCardFields = idCardFields;

    await settings.save();
    res.status(200).json({ success: true, message: 'Student configuration updated', settings: settings.student });
  } catch (error) {
    console.error('Update student config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Attendance Settings
exports.updateAttendanceSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { method, autoMarkRules, latePolicy } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (method) settings.attendance.method = method;
    if (autoMarkRules) settings.attendance.autoMarkRules = autoMarkRules;
    if (latePolicy) settings.attendance.latePolicy = latePolicy;

    await settings.save();
    res.status(200).json({ success: true, message: 'Attendance settings updated', settings: settings.attendance });
  } catch (error) {
    console.error('Update attendance settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Admission Settings
exports.updateAdmissionSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { requiredDocuments, optionalDocuments, customFields, approvalWorkflow } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (requiredDocuments) settings.admission.requiredDocuments = requiredDocuments;
    if (optionalDocuments) settings.admission.optionalDocuments = optionalDocuments;
    if (customFields) settings.admission.customFields = customFields;
    if (approvalWorkflow) settings.admission.approvalWorkflow = approvalWorkflow;

    await settings.save();
    res.status(200).json({ success: true, message: 'Admission settings updated', settings: settings.admission });
  } catch (error) {
    console.error('Update admission settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update ID Card Design
exports.updateIDCardDesign = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { roleType, template, cardLayout, fields, design, printSettings } = req.body;
    const validRoles = ['student', 'staff', 'teacher', 'driver', 'warden'];
    const role = roleType && validRoles.includes(roleType) ? roleType : 'student';

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    // Ensure idCard[role] exists
    if (!settings.idCard[role]) {
      settings.idCard[role] = {};
    }

    // Update template
    if (template) {
      settings.idCard[role].template = template;
    }

    // Update cardLayout
    if (cardLayout) {
      settings.idCard[role].cardLayout = cardLayout;
    }

    // Update fields
    if (fields && Array.isArray(fields)) {
      settings.idCard[role].fields = fields.map(f => ({
        id: f.id || '',
        label: f.label || '',
        visible: f.visible !== undefined ? f.visible : true,
        position: f.position || 0,
        fontSize: f.fontSize || 11,
        bold: f.bold !== undefined ? f.bold : false,
        section: f.section || 'body',
        format: f.format || ''
      }));
    }

    // Update design
    if (design && typeof design === 'object') {
      settings.idCard[role].design = {
        cardWidth: design.cardWidth || 350,
        cardHeight: design.cardHeight || 550,
        backgroundColor: design.backgroundColor || '#ffffff',
        headerColor: design.headerColor || '#1e40af',
        accentColor: design.accentColor || '#2563eb',
        textColor: design.textColor || '#1f2937',
        borderColor: design.borderColor || '#1e40af',
        borderWidth: design.borderWidth || 3,
        borderRadius: design.borderRadius || 12,
        logoSize: design.logoSize || 50,
        photoSize: design.photoSize || 120,
        headerHeight: design.headerHeight || 80
      };
    }

    // Update printSettings
    if (printSettings && typeof printSettings === 'object') {
      settings.idCard[role].printSettings = {
        paperSize: printSettings.paperSize || 'A4',
        orientation: ['portrait', 'landscape'].includes(printSettings.orientation) ? printSettings.orientation : 'portrait',
        margins: printSettings.margins || 10,
        cardsPerPage: printSettings.cardsPerPage || 4
      };
    }

    await settings.save();
    res.status(200).json({ success: true, message: `${role} ID Card design updated`, settings: settings.idCard[role] });
  } catch (error) {
    console.error('ID Card Update Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Fee Slip Design
exports.updateFeeSlipDesign = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { template, backgroundImage, fields, cardWidth, cardHeight, header, content, footer } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (template) settings.feeSlip.template = template;
    if (backgroundImage !== undefined) settings.feeSlip.backgroundImage = backgroundImage;
    if (fields) settings.feeSlip.fields = fields;
    if (cardWidth) settings.feeSlip.cardWidth = cardWidth;
    if (cardHeight) settings.feeSlip.cardHeight = cardHeight;
    if (header) settings.feeSlip.header = header;
    if (content) settings.feeSlip.content = content;
    if (footer) settings.feeSlip.footer = footer;

    settings.markModified('feeSlip');
    await settings.save();
    res.status(200).json({ success: true, message: 'Fee Slip design updated', settings: settings.feeSlip });
  } catch (error) {
    console.error('Update fee slip design error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload Fee Slip Template
exports.uploadFeeSlipTemplate = async (req, res) => {
  try {
    const branchId = req.query.branchId || req.user?.branch;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId)
    });
    
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: req.user.client
      });
    }

    const templateUrl = req.file.cloudinaryUrl || (req.file.filename ? `/uploads/client-settings/branding/${req.file.filename}` : '');
    
    if (!templateUrl) {
      return res.status(400).json({ message: 'Upload failed: No URL generated' });
    }

    settings.feeSlip.backgroundImage = templateUrl;
    settings.markModified('feeSlip');
    await settings.save();

    res.status(200).json({
      success: true,
      message: `Fee Slip template uploaded successfully`,
      templateUrl
    });
  } catch (error) {
    console.error('Fee slip template upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Marksheet Design
exports.updateMarksheetDesign = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { examType, template, gradingSystem, signatureFields } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (examType) settings.marksheet.examType = examType;
    if (template) settings.marksheet.template = template;
    if (gradingSystem) settings.marksheet.gradingSystem = gradingSystem;
    if (signatureFields) settings.marksheet.signatureFields = signatureFields;

    await settings.save();
    res.status(200).json({ success: true, message: 'Marksheet design updated', settings: settings.marksheet });
  } catch (error) {
    console.error('Update marksheet design error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Transport Settings
exports.updateTransportSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { trackingMethod, alertSettings, routeCustomization } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    if (trackingMethod) settings.transport.trackingMethod = trackingMethod;
    if (alertSettings) settings.transport.alertSettings = alertSettings;
    if (routeCustomization) settings.transport.routeCustomization = routeCustomization;

    await settings.save();
    res.status(200).json({ success: true, message: 'Transport settings updated', settings: settings.transport });
  } catch (error) {
    console.error('Update transport settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get specific section settings
exports.getSettingSection = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin', 'staff', 'teacher'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only authorized users can access settings' });
    }

    const { section } = req.params;
    const branchId = req.query.branchId;
    
    const validSections = ['branding', 'staff', 'teacher', 'student', 'attendance', 'admission', 'idCard', 'feeSlip', 'marksheet', 'transport'];

    if (!validSections.includes(section)) {
      return res.status(400).json({ message: 'Invalid section' });
    }

    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId),
      client: admin.client 
    });
    
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId),
        client: admin.client 
      });
      await settings.save();
    }

    res.status(200).json({ success: true, [section]: settings[section] });
  } catch (error) {
    console.error('Get setting section error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload ID Card Template
exports.uploadIDCardTemplate = async (req, res) => {
  try {
    console.log('ID Card Template Upload Started');
    const branchId = req.query.branchId || req.user?.branch;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    if (!req.file) {
      console.log('Upload denied: No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { role } = req.body;
    const validRoles = ['student', 'staff', 'teacher', 'driver', 'warden'];

    if (!role || !validRoles.includes(role)) {
      console.log('Upload denied: Invalid role -', role);
      return res.status(400).json({ message: 'Invalid role' });
    }

    console.log(`Processing upload for role: ${role}, branch: ${branchId}`);

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId)
    });
    
    if (!settings) {
      console.log('Creating new settings for branch');
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: req.user.client
      });
    }

    // Ensure idCard object and role sub-object
    if (!settings.idCard) settings.idCard = {};
    if (!settings.idCard[role]) settings.idCard[role] = {};

    const templateUrl = req.file.cloudinaryUrl || (req.file.filename ? `/uploads/client-settings/branding/${req.file.filename}` : '');
    
    if (!templateUrl) {
      console.log('Upload error: Could not determine template URL');
      return res.status(400).json({ message: 'Upload failed: No URL generated' });
    }

    console.log('Template URL generated:', templateUrl);

    // Update safely
    settings.idCard[role].template = templateUrl;
    
    if (!settings.idCard.htmlContent) {
        settings.idCard.htmlContent = `
<div style="width: 350px; height: 550px; background-image: url('${templateUrl}'); background-repeat: no-repeat; background-position: center; background-size: 100% 100%; position: relative; font-family: sans-serif;">
  <div style="position: absolute; top: 110px; left: 115px; width: 120px; height: 120px; border: 2px solid #fff; border-radius: 10px; overflow: hidden;">
    {{student_photo}}
  </div>
  <div style="position: absolute; top: 250px; width: 100%; text-align: center; color: #000; font-size: 24px; font-weight: bold;">
    {{student_name}}
  </div>
  <div style="position: absolute; top: 290px; width: 100%; text-align: center; color: #333; font-size: 14px;">
    Roll: {{roll_no}} | Class: {{class}}
  </div>
</div>`;
    }

    settings.markModified('idCard');
    await settings.save();
    console.log('Settings saved successfully');

    res.status(200).json({
      success: true,
      message: `${role} template uploaded successfully`,
      templateUrl,
      role
    });
  } catch (error) {
    console.error('CRITICAL: Template upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update ID Card Configuration (templates + fields + design)
exports.updateIDCardConfig = async (req, res) => {
  try {
    const branchId = req.query.branchId || req.user?.branch;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { templates, configs } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId)
    });
    
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: req.user.client
      });
    }

    if (!settings.idCard) {
      settings.idCard = {};
    }

    const role = req.body.role || 'student';
    const validRoles = ['student', 'staff', 'teacher', 'driver', 'warden'];

    if (req.body.htmlContent !== undefined) {
      settings.idCard.htmlContent = req.body.htmlContent;
    }

    // Direct support for role-specific template/fields (from Visual Mapper)
    if (req.body.template) {
      if (!settings.idCard[role]) settings.idCard[role] = {};
      settings.idCard[role].template = req.body.template;
    }
    if (req.body.fields) {
      if (!settings.idCard[role]) settings.idCard[role] = {};
      settings.idCard[role].fields = req.body.fields;
    }
    if (req.body.design) {
      if (!settings.idCard[role]) settings.idCard[role] = {};
      settings.idCard[role].design = req.body.design;
    }

    // Update all roles if templates/configs provided (Bulk update)
    validRoles.forEach(r => {
      if (!settings.idCard[r]) {
        settings.idCard[r] = {};
      }

      if (templates && templates[r]) {
        settings.idCard[r].template = templates[r];
      }
      
      if (configs && configs[r]) {
        settings.idCard[r].fields = configs[r].fields || settings.idCard[r].fields;
        settings.idCard[r].design = configs[r].design || settings.idCard[r].design;
      }
    });

    settings.markModified('idCard');
    await settings.save();
    console.log('ID Card configuration updated successfully');
    res.status(200).json({
      success: true,
      message: 'ID Card configuration updated successfully',
      settings: settings.idCard
    });
  } catch (error) {
    console.error('ID Card config update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Upload Marksheet Template
exports.uploadMarksheetTemplate = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can upload templates' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { examType } = req.body;
    const validExamTypes = ['board', 'internal', 'semester'];

    if (!examType || !validExamTypes.includes(examType)) {
      return res.status(400).json({ message: 'Invalid exam type' });
    }

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    // Ensure marksheet templates exist
    if (!settings.marksheet.templates) {
      settings.marksheet.templates = {};
    }

    // Store template URL
    const templateUrl = req.file.cloudinaryUrl || `/uploads/client-settings/${req.file.filename}`;
    settings.marksheet.templates[examType] = templateUrl;

    await settings.save();

    res.status(200).json({
      success: true,
      message: `${examType} marksheet template uploaded successfully`,
      templateUrl,
      examType
    });
  } catch (error) {
    console.error('Marksheet template upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Marksheet Templates
exports.updateMarksheetTemplates = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || !['clientAdmin', 'branchAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Only admin can update settings' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { templates } = req.body;

    let settings = await ClientSettings.findOne({ 
      branchId: new mongoose.Types.ObjectId(branchId), 
      client: admin.client 
    });
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: new mongoose.Types.ObjectId(branchId), 
        client: admin.client 
      });
    }

    // Update all exam types
    const validExamTypes = ['board', 'internal', 'semester'];
    if (!settings.marksheet.templates) {
      settings.marksheet.templates = {};
    }

    validExamTypes.forEach(examType => {
      if (templates && templates[examType]) {
        settings.marksheet.templates[examType] = templates[examType];
      }
    });

    await settings.save();
    res.status(200).json({
      success: true,
      message: 'Marksheet templates updated successfully',
      settings: settings.marksheet.templates
    });
  } catch (error) {
    console.error('Marksheet templates update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Create Exam Type
exports.createExamType = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    // Use branchId as clientId to make it branch-specific
    const clientId = branchObjectId;

    console.log('Creating exam type for branch:', branchId, 'clientId:', clientId.toString());

    // Find existing settings
    let settings = await ClientSettings.findOne({ 
      branchId: branchObjectId, 
      client: clientId
    });
    
    console.log('Settings found:', settings ? 'yes' : 'no');
    
    // If not found, create new one
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: branchObjectId, 
        client: clientId,
        marksheet: {
          examTypes: []
        }
      });
      
      try {
        await settings.save();
        console.log('Settings created successfully');
      } catch (err) {
        console.log('Settings save error:', err.code, err.message);
        if (err.code === 11000) {
          // Duplicate key error - fetch existing
          settings = await ClientSettings.findOne({ 
            branchId: branchObjectId, 
            client: clientId
          });
          console.log('Fetched existing settings after duplicate error');
          if (!settings) {
            return res.status(500).json({ message: 'Failed to create or fetch settings' });
          }
        } else {
          throw err;
        }
      }
    }

    // Ensure marksheet.examTypes exists
    if (!settings.marksheet) {
      settings.marksheet = { examTypes: [] };
    }
    if (!settings.marksheet.examTypes) {
      settings.marksheet.examTypes = [];
    }

    // Check if exam type already exists
    const exists = settings.marksheet.examTypes.some(et => et.code === code);
    if (exists) {
      return res.status(400).json({ message: 'Exam type with this code already exists' });
    }

    settings.marksheet.examTypes.push({
      _id: new mongoose.Types.ObjectId(),
      name,
      code,
      description: description || '',
      isActive: true
    });

    await settings.save();
    console.log('Exam type created successfully');
    
    res.status(201).json({
      success: true,
      message: 'Exam type created successfully',
      examTypes: settings.marksheet.examTypes
    });
  } catch (error) {
    console.error('Create exam type error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Exam Types
exports.getExamTypes = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    const branchId = req.query.branchId;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branchId format' });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const clientId = branchObjectId;

    let settings = await ClientSettings.findOne({ 
      branchId: branchObjectId, 
      client: clientId
    });
    
    if (!settings) {
      settings = new ClientSettings({ 
        branchId: branchObjectId, 
        client: clientId,
        marksheet: {
          examTypes: []
        }
      });
      try {
        await settings.save();
      } catch (err) {
        if (err.code === 11000) {
          settings = await ClientSettings.findOne({ 
            branchId: branchObjectId, 
            client: clientId
          });
        } else {
          throw err;
        }
      }
    }

    // Ensure marksheet.examTypes exists
    if (!settings.marksheet) {
      settings.marksheet = { examTypes: [] };
    }
    if (!settings.marksheet.examTypes) {
      settings.marksheet.examTypes = [];
    }

    res.status(200).json({
      success: true,
      examTypes: settings.marksheet.examTypes || []
    });
  } catch (error) {
    console.error('Get exam types error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Exam Type
exports.updateExamType = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    const branchId = req.query.branchId;
    const { examTypeId } = req.params;
    if (!branchId || !examTypeId) {
      return res.status(400).json({ message: 'branchId and examTypeId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(examTypeId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const { name, code, description, isActive } = req.body;
    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const clientId = branchObjectId;

    let settings = await ClientSettings.findOne({ 
      branchId: branchObjectId, 
      client: clientId
    });
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const examType = settings.marksheet.examTypes.id(examTypeId);
    if (!examType) {
      return res.status(404).json({ message: 'Exam type not found' });
    }

    if (name) examType.name = name;
    if (code) examType.code = code;
    if (description !== undefined) examType.description = description;
    if (isActive !== undefined) examType.isActive = isActive;

    await settings.save();
    res.status(200).json({
      success: true,
      message: 'Exam type updated successfully',
      examTypes: settings.marksheet.examTypes
    });
  } catch (error) {
    console.error('Update exam type error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Exam Type
exports.deleteExamType = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    const branchId = req.query.branchId;
    const { examTypeId } = req.params;
    if (!branchId || !examTypeId) {
      return res.status(400).json({ message: 'branchId and examTypeId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(examTypeId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const clientId = branchObjectId;

    let settings = await ClientSettings.findOne({ 
      branchId: branchObjectId, 
      client: clientId
    });
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const examTypeIndex = settings.marksheet.examTypes.findIndex(et => et._id.toString() === examTypeId);
    if (examTypeIndex === -1) {
      return res.status(404).json({ message: 'Exam type not found' });
    }

    settings.marksheet.examTypes.splice(examTypeIndex, 1);
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Exam type deleted successfully',
      examTypes: settings.marksheet.examTypes
    });
  } catch (error) {
    console.error('Delete exam type error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload Exam Type Template
exports.uploadExamTypeTemplate = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    const branchId = req.query.branchId;
    const { examTypeId } = req.params;
    if (!branchId || !examTypeId) {
      return res.status(400).json({ message: 'branchId and examTypeId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(examTypeId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const clientId = branchObjectId;

    let settings = await ClientSettings.findOne({ 
      branchId: branchObjectId, 
      client: clientId
    });
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const examType = settings.marksheet.examTypes.id(examTypeId);
    if (!examType) {
      return res.status(404).json({ message: 'Exam type not found' });
    }

    const templateUrl = req.file.cloudinaryUrl || `/uploads/client-settings/${req.file.filename}`;
    examType.template = templateUrl;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Template uploaded successfully',
      examTypes: settings.marksheet.examTypes
    });
  } catch (error) {
    console.error('Upload exam type template error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
