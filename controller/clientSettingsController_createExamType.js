// Create Exam Type - SIMPLIFIED
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
    const clientId = admin.client || new mongoose.Types.ObjectId();

    // Try to find existing settings
    let settings = await ClientSettings.findOne({ 
      branchId: branchObjectId, 
      client: clientId
    });

    // If not found, create new
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
      } catch (saveErr) {
        if (saveErr.code === 11000) {
          // Duplicate - fetch existing
          settings = await ClientSettings.findOne({ 
            branchId: branchObjectId, 
            client: clientId
          });
          if (!settings) {
            return res.status(500).json({ message: 'Could not create or fetch settings' });
          }
        } else {
          throw saveErr;
        }
      }
    }

    // Initialize marksheet if needed
    if (!settings.marksheet) {
      settings.marksheet = {};
    }
    if (!settings.marksheet.examTypes) {
      settings.marksheet.examTypes = [];
    }

    // Check duplicate
    if (settings.marksheet.examTypes.some(et => et.code === code)) {
      return res.status(400).json({ message: 'Exam type with this code already exists' });
    }

    // Add new exam type
    settings.marksheet.examTypes.push({
      _id: new mongoose.Types.ObjectId(),
      name,
      code,
      description: description || '',
      isActive: true
    });

    await settings.save();

    res.status(201).json({
      success: true,
      message: 'Exam type created successfully',
      examTypes: settings.marksheet.examTypes
    });
  } catch (error) {
    console.error('Create exam type error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
