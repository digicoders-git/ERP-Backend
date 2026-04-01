const Admin = require('../../model/Admin');

// Create Library Admin (by Branch Admin)
exports.createLibraryAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const branchAdminId = req.userId;

    const branchAdmin = await Admin.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can create library admin' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const libraryAdmin = new Admin({
      email,
      password,
      role: 'libraryAdmin',
      client: branchAdmin.client,
      branch: branchAdmin.branch,
      allowedPanels: ['library']
    });

    await libraryAdmin.save();
    res.status(201).json({ message: 'Library Admin created successfully', libraryAdmin: { email: libraryAdmin.email, role: libraryAdmin.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Library Admins (by Branch Admin)
exports.getAllLibraryAdmins = async (req, res) => {
  try {
    const branchAdminId = req.userId;

    const branchAdmin = await Admin.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can view library admins' });
    }

    const libraryAdmins = await Admin.find({ 
      role: 'libraryAdmin', 
      branch: branchAdmin.branch 
    }).select('-password');

    res.status(200).json({ libraryAdmins });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Library Admin (by Branch Admin)
exports.deleteLibraryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const branchAdminId = req.userId;

    const branchAdmin = await Admin.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can delete library admin' });
    }

    const libraryAdmin = await Admin.findById(id);
    if (!libraryAdmin || libraryAdmin.role !== 'libraryAdmin') {
      return res.status(404).json({ message: 'Library Admin not found' });
    }

    if (libraryAdmin.branch.toString() !== branchAdmin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Admin.findByIdAndDelete(id);
    res.status(200).json({ message: 'Library Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
