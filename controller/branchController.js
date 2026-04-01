const Branch = require('../model/Branch');
const Admin = require('../model/Admin');
const Client = require('../model/Client');

// Create Branch (Only by Client Admin with school panel)
exports.createBranch = async (req, res) => {
  try {
    const { branchName, branchCode, location, address, establishedYear, principalName, phone, email, password, capacity } = req.body;

    if (!branchName || !branchCode || !email || !password) {
      return res.status(400).json({ message: 'Branch name, branch code, email, and password are required' });
    }

    // Get client admin details
    const clientAdmin = await Admin.findById(req.userId).populate('client');
    if (!clientAdmin || clientAdmin.role !== 'clientAdmin') {
      return res.status(403).json({ message: 'Only client admin can create branches' });
    }

    // Check if client has school panel
    if (!clientAdmin.allowedPanels.includes('school')) {
      return res.status(403).json({ message: 'School panel is required to create branches' });
    }

    const client = clientAdmin.client;

    // Check if client has branch creation limit
    if (client.maxBranches === 0) {
      return res.status(403).json({ message: 'Your plan does not allow branch creation' });
    }

    // Check if branch limit exceeded
    if (client.currentBranchCount >= client.maxBranches) {
      return res.status(400).json({ message: `Branch limit exceeded. Maximum ${client.maxBranches} branches allowed` });
    }

    // Check if branch code already exists
    const existingBranch = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
    if (existingBranch) {
      return res.status(400).json({ message: 'Branch code already exists' });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create Branch
    const branch = new Branch({
      branchName,
      branchCode: branchCode.toUpperCase(),
      location,
      address,
      establishedYear,
      principalName,
      phone,
      email,
      capacity: capacity || 0,
      students: 0,
      teachers: 0,
      classes: 0,
      rating: 0,
      fees: 0,
      client: client._id,
      createdBy: req.userId,
      status: true
    });
    await branch.save();

    // Create Branch Admin
    const branchAdmin = new Admin({
      email,
      password,
      role: 'branchAdmin',
      client: client._id,
      branch: branch._id,
      allowedPanels: [],
      status: true
    });
    await branchAdmin.save();

    // Increment branch count
    client.currentBranchCount += 1;
    await client.save();

    res.status(201).json({
      message: 'Branch and Branch Admin created successfully',
      branch: {
        id: branch._id,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        location: branch.location,
        address: branch.address,
        establishedYear: branch.establishedYear,
        principalName: branch.principalName,
        phone: branch.phone,
        email: branch.email,
        capacity: branch.capacity,
        students: branch.students,
        teachers: branch.teachers,
        classes: branch.classes,
        rating: branch.rating,
        fees: branch.fees,
        status: branch.status
      },
      admin: {
        id: branchAdmin._id,
        email: branchAdmin.email,
        role: branchAdmin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Branches (By Client Admin)
exports.getAllBranches = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const admin = await Admin.findById(req.userId);

    const searchQuery = search ? {
      $or: [
        { branchName: { $regex: search, $options: 'i' } },
        { branchCode: { $regex: search, $options: 'i' } },
        { principalName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
    if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      const branches = await Branch.find(searchQuery)
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Branch.countDocuments(searchQuery);
      return res.status(200).json({ 
        branches, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (admin.role === 'superAdmin') {
      const branches = await Branch.find(searchQuery)
        .populate('client', 'name')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Branch.countDocuments(searchQuery);
      return res.status(200).json({ 
        branches, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Single Branch
exports.getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const admin = await Admin.findById(req.userId);

    const branch = await Branch.findById(branchId)
      .populate('client', 'name phone address')
      .populate('createdBy', 'email');

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check access rights
    if (admin.role === 'clientAdmin' && branch.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'branchAdmin' && branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get branch admin details
    const branchAdmin = await Admin.findOne({ branch: branchId, role: 'branchAdmin' }).select('-password');

    res.status(200).json({ branch, admin: branchAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Branch
exports.updateBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { branchName, branchCode, location, address, establishedYear, principalName, phone, email, capacity, students, teachers, classes, rating, fees, password } = req.body;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'clientAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only client admin or super admin can update branches' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if client admin owns this branch
    if (admin.role === 'clientAdmin' && branch.client.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (branchName) branch.branchName = branchName;
    if (location !== undefined) branch.location = location;
    if (address !== undefined) branch.address = address;
    if (establishedYear !== undefined) branch.establishedYear = establishedYear;
    if (principalName !== undefined) branch.principalName = principalName;
    if (phone !== undefined) branch.phone = phone;
    if (email !== undefined) branch.email = email;
    if (capacity !== undefined) branch.capacity = capacity;
    if (students !== undefined) branch.students = students;
    if (teachers !== undefined) branch.teachers = teachers;
    if (classes !== undefined) branch.classes = classes;
    if (rating !== undefined) branch.rating = rating;
    if (fees !== undefined) branch.fees = fees;
    
    if (branchCode) {
      const existingBranch = await Branch.findOne({ 
        branchCode: branchCode.toUpperCase(),
        _id: { $ne: branchId }
      });
      if (existingBranch) {
        return res.status(400).json({ message: 'Branch code already exists' });
      }
      branch.branchCode = branchCode.toUpperCase();
    }

    await branch.save();

    // Update branch admin password if provided
    if (password) {
      const branchAdmin = await Admin.findOne({ branch: branchId, role: 'branchAdmin' });
      if (branchAdmin) {
        branchAdmin.password = password;
        await branchAdmin.save();
      }
    }

    res.status(200).json({ message: 'Branch updated successfully', branch });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Branch
exports.deleteBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'clientAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only client admin or super admin can delete branches' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if client admin owns this branch
    if (admin.role === 'clientAdmin' && branch.client.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete branch admin
    await Admin.deleteOne({ branch: branchId, role: 'branchAdmin' });

    // Decrement branch count
    await Client.updateOne(
      { _id: branch.client },
      { $inc: { currentBranchCount: -1 } }
    );

    // Delete branch
    await Branch.findByIdAndDelete(branchId);

    res.status(200).json({ message: 'Branch and associated admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Dashboard Stats (Client Admin / School Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).populate('client');
    if (!admin || (admin.role !== 'clientAdmin' && admin.role !== 'superAdmin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const clientId = admin.role === 'clientAdmin' ? admin.client._id : null;
    const query = clientId ? { client: clientId } : {};

    const [totalBranches, activeBranches, inactiveBranches] = await Promise.all([
      Branch.countDocuments(query),
      Branch.countDocuments({ ...query, status: true }),
      Branch.countDocuments({ ...query, status: false })
    ]);

    const recentBranches = await Branch.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('branchName branchCode principalName status createdAt');

    const branchLimit = admin.role === 'clientAdmin' ? admin.client.maxBranches : null;
    const branchesRemaining = branchLimit ? branchLimit - totalBranches : null;

    res.status(200).json({
      stats: {
        totalBranches,
        activeBranches,
        inactiveBranches,
        branchLimit,
        branchesRemaining
      },
      recentBranches
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Branch Status
exports.toggleBranchStatus = async (req, res) => {
  try {
    const { branchId } = req.params;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'clientAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if client admin owns this branch
    if (admin.role === 'clientAdmin' && branch.client.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    branch.status = !branch.status;
    await branch.save();

    // Also toggle branch admin status
    await Admin.updateOne(
      { branch: branchId, role: 'branchAdmin' },
      { status: branch.status }
    );

    res.status(200).json({ message: 'Branch status updated successfully', status: branch.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
