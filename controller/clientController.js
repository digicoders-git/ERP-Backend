const Client = require('../model/Client');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Plan = require('../model/Plan');

// Create Client with Client Admin
exports.createClient = async (req, res) => {
  try {
    const { clientName, phone, address, planId, email, password, principal, established, capacity, status } = req.body;

    if (!clientName || !planId || !email || !password) {
      return res.status(400).json({ message: 'Client name, plan, email, and password are required' });
    }

    // Check if plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if email already exists in Admin
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists in Admin' });
    }

    // Check if email already exists in Staff
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: 'Email already exists in Staff' });
    }

    // Check if email already exists in Teacher
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already exists in Teacher' });
    }

    // Create Client
    const client = new Client({
      name: clientName,
      phone,
      address,
      principal,
      established,
      capacity: capacity || 0,
      students: 0,
      rating: 0,
      status: status || 'active',
      plan: planId,
      purchasedPanels: plan.panelsIncluded,
      maxBranches: plan.maxBranches,
      currentBranchCount: 0
    });
    await client.save();

    // Create Client Admin
    const clientAdmin = new Admin({
      email,
      password,
      role: 'clientAdmin',
      client: client._id,
      allowedPanels: plan.panelsIncluded,
      status: true
    });
    await clientAdmin.save();

    res.status(201).json({ 
      message: 'Client and Client Admin created successfully',
      client: {
        id: client._id,
        name: client.name,
        phone: client.phone,
        address: client.address,
        principal: client.principal,
        established: client.established,
        capacity: client.capacity,
        students: client.students,
        rating: client.rating,
        status: client.status,
        purchasedPanels: client.purchasedPanels,
        maxBranches: client.maxBranches,
        currentBranchCount: client.currentBranchCount
      },
      admin: {
        id: clientAdmin._id,
        email: clientAdmin.email,
        role: clientAdmin.role,
        status: clientAdmin.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Clients
exports.getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const clients = await Client.find(searchQuery)
      .populate('plan', 'planName planType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const Student = require('../model/Student');
    
    // Fetch actual student counts from database
    const clientsWithCounts = await Promise.all(
      clients.map(async (client) => {
        const studentCount = await Student.countDocuments({ client: client._id });
        return {
          ...client.toObject(),
          students: studentCount
        };
      })
    );

    const total = await Client.countDocuments(searchQuery);

    res.status(200).json({ 
      clients: clientsWithCounts, 
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

// Get Single Client
exports.getClientById = async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await Client.findById(clientId).populate('plan');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get client admin
    const clientAdmin = await Admin.findOne({ client: clientId, role: 'clientAdmin' }).select('-password');

    res.status(200).json({ client, admin: clientAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Client
exports.updateClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { name, phone, address, planId, password, principal, established, capacity, students, rating, status } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (name) client.name = name;
    if (phone !== undefined) client.phone = phone;
    if (address !== undefined) client.address = address;
    if (principal !== undefined) client.principal = principal;
    if (established !== undefined) client.established = established;
    if (capacity !== undefined) client.capacity = capacity;
    if (students !== undefined) client.students = students;
    if (rating !== undefined) client.rating = rating;
    if (status !== undefined) client.status = status;
    
    // If plan is being changed, update panels automatically
    if (planId) {
      const newPlan = await Plan.findById(planId);
      if (!newPlan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      
      client.plan = planId;
      client.purchasedPanels = newPlan.panelsIncluded;
      client.maxBranches = newPlan.maxBranches;
      
      // Update client admin's allowed panels
      await Admin.updateOne(
        { client: clientId, role: 'clientAdmin' },
        { allowedPanels: newPlan.panelsIncluded }
      );
    }

    // Update client admin password if provided
    if (password) {
      const clientAdmin = await Admin.findOne({ client: clientId, role: 'clientAdmin' });
      if (clientAdmin) {
        clientAdmin.password = password;
        await clientAdmin.save();
      }
    }

    await client.save();
    res.status(200).json({ message: 'Client updated successfully', client });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Client
exports.deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findByIdAndDelete(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Delete associated client admin
    await Admin.deleteOne({ client: clientId, role: 'clientAdmin' });

    res.status(200).json({ message: 'Client and associated admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Client Status
exports.toggleClientStatus = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Toggle status
    client.status = client.status === 'active' ? 'inactive' : 'active';
    await client.save();

    // Also toggle client admin status
    const clientAdmin = await Admin.findOne({ client: clientId, role: 'clientAdmin' });
    if (clientAdmin) {
      clientAdmin.status = client.status === 'active';
      await clientAdmin.save();
    }

    res.status(200).json({ 
      message: `Client status changed to ${client.status}`, 
      status: client.status 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
