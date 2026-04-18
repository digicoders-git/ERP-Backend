const Alumni = require('../model/Alumni');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');

const getBranch = async (userId) => {
  // Try to get branch from Admin first
  let admin = await Admin.findById(userId).select('branch').lean();
  if (admin?.branch) return admin.branch;

  // If not found, try Staff
  let staff = await Staff.findById(userId).select('branch').lean();
  if (staff?.branch) return staff.branch;

  return null;
};

// Create Alumni
exports.createAlumni = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied - no branch assigned' });

    const { name, batch, department, currentRole, location, email, phone, achievements, bio, mentorship } = req.body;
    if (!name || !batch || !department) return res.status(400).json({ message: 'name, batch, department required' });

    const profileImage = req.file ? (req.file.cloudinaryUrl || req.file.path) : null;

    const alumni = await Alumni.create({
      branch, name, batch, department, currentRole, location, email, phone,
      achievements, bio, mentorship, profileImage, createdBy: req.userId
    });

    res.status(201).json({ message: 'Alumni added successfully', alumni });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Alumni (fast lean with filters)
exports.getAllAlumni = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied - no branch assigned' });

    const { batch, department, search, mentorship, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { branch };
    if (batch) query.batch = batch;
    if (department) query.department = department;
    if (mentorship === 'true') query.mentorship = true;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { currentRole: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } }
    ];

    const [alumni, total, batches, departments] = await Promise.all([
      Alumni.find(query).sort({ batch: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Alumni.countDocuments(query),
      Alumni.distinct('batch', { branch }),
      Alumni.distinct('department', { branch })
    ]);

    res.status(200).json({ 
      alumni, 
      batches: batches.sort().reverse(), 
      departments,
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

// Update Alumni
exports.updateAlumni = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied - no branch assigned' });

    const updateData = { ...req.body };
    if (req.file) {
      updateData.profileImage = req.file.cloudinaryUrl || req.file.path;
    }

    const alumni = await Alumni.findOneAndUpdate(
      { _id: req.params.id, branch },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!alumni) return res.status(404).json({ message: 'Alumni not found' });
    res.status(200).json({ message: 'Alumni updated successfully', alumni });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Alumni
exports.deleteAlumni = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied - no branch assigned' });

    const alumni = await Alumni.findOneAndDelete({ _id: req.params.id, branch });
    if (!alumni) return res.status(404).json({ message: 'Alumni not found' });
    res.status(200).json({ message: 'Alumni deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
