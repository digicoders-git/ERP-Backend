const Librarian = require('../../model/Librarian');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const { successResponse, errorResponse } = require('../../responseFormatter');

const getUserContext = async (userId) => {
  let user = await Admin.findById(userId).select('branch client').lean();
  if (!user) {
    user = await Staff.findById(userId).select('branch client').lean();
  }
  return user;
};

exports.getAllLibrarians = async (req, res) => {
  try {
    const currentUser = await getUserContext(req.userId);
    if (!currentUser) return errorResponse(res, 'User context not found', 404);

    const librarians = await Librarian.find({ 
        branch: currentUser.branch,
        client: currentUser.client
      })
      .select('-password')
      .sort({ createdAt: -1 });
    
    return successResponse(res, librarians, 'Librarians fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getLibrarianById = async (req, res) => {
  try {
    const librarian = await Librarian.findById(req.params.id).select('-password');
    
    if (!librarian) {
      return errorResponse(res, 'Librarian not found', 404);
    }
    
    return successResponse(res, librarian, 'Librarian fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createLibrarian = async (req, res) => {
  try {
    const { name, email, phone, password, qualification, status, salary, address, gender, dob, experience } = req.body;
    const currentUser = await getUserContext(req.userId);

    if (!currentUser) return errorResponse(res, 'Administrative context missing', 401);

    if (!name || !email || !phone || !password) {
      return errorResponse(res, 'Primary protocol fields are required', 400);
    }

    const existingLibrarian = await Librarian.findOne({ $or: [{ email }, { phone }] });
    if (existingLibrarian) {
      return errorResponse(res, 'Identity conflict detected (email or phone already registered)', 400);
    }

    // Check if email already exists in Admin
    const existingAdminEmail = await Admin.findOne({ email });
    if (existingAdminEmail) {
      return errorResponse(res, 'Identity conflict detected in administrative matrix', 400);
    }

    const lastLibrarian = await Librarian.findOne({ branch: currentUser.branch }).sort({ createdAt: -1 });
    const lastNumber = lastLibrarian ? parseInt(lastLibrarian.staffId.slice(3)) : 0;
    const staffId = `LIB${String(lastNumber + 1).padStart(3, '0')}`;

    const profileImage = req.file ? (req.file.cloudinaryUrl || `/uploads/library/staff/${req.file.filename}`) : null;

    const librarian = new Librarian({
      name,
      email,
      phone,
      password,
      profileImage,
      qualification,
      salary,
      address,
      gender,
      dob,
      experience,
      status: status || 'Active',
      staffId,
      department: 'Library',
      branch: currentUser.branch,
      client: currentUser.client,
      createdBy: currentUser._id
    });

    await librarian.save();

    // Create Admin login record so librarian can login via /api/admin/login
    await Admin.create({
        email,
        password,
        name,
        mobile: phone,
        profileImage,
        role: 'libraryAdmin',
        branch: currentUser.branch,
        client: currentUser.client,
        status: true,
        allowedPanels: ['library']
    });

    const librarianData = librarian.toObject();
    delete librarianData.password;

    return successResponse(res, librarianData, 'Librarian unit deployed successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateLibrarian = async (req, res) => {
  try {
    const { name, email, phone, password, qualification, status, salary, address, gender, dob, experience } = req.body;
    const librarian = await Librarian.findById(req.params.id);

    if (!librarian) {
      return errorResponse(res, 'Librarian unit not found', 404);
    }

    if (email && email !== librarian.email) {
      const existingAdminEmail = await Admin.findOne({ email });
      if (existingAdminEmail) {
        return errorResponse(res, 'Email identity conflict in admin matrix', 400);
      }
      const existingEmail = await Librarian.findOne({ email });
      if (existingEmail) {
        return errorResponse(res, 'Email identity conflict in librarian matrix', 400);
      }
      
      // Update Admin record as well
      await Admin.findOneAndUpdate({ email: librarian.email, role: 'libraryAdmin' }, { email });
      librarian.email = email;
    }

    if (phone && phone !== librarian.phone) {
      const existingPhone = await Librarian.findOne({ phone });
      if (existingPhone) {
        return errorResponse(res, 'Phone identity conflict detected', 400);
      }
      librarian.phone = phone;
      await Admin.findOneAndUpdate({ email: librarian.email, role: 'libraryAdmin' }, { mobile: phone });
    }

    if (name) {
        librarian.name = name;
        await Admin.findOneAndUpdate({ email: librarian.email, role: 'libraryAdmin' }, { name });
    }
    if (password) {
        librarian.password = password;
        // Password encryption is handled by pre-save hooks in both models
        const adminToUpdate = await Admin.findOne({ email: librarian.email, role: 'libraryAdmin' });
        if (adminToUpdate) {
            adminToUpdate.password = password;
            await adminToUpdate.save();
        }
    }
    if (qualification) librarian.qualification = qualification;
    if (salary) librarian.salary = salary;
    if (address) librarian.address = address;
    if (gender) librarian.gender = gender;
    if (dob) librarian.dob = dob;
    if (experience) librarian.experience = experience;

    if (req.file) {
        librarian.profileImage = req.file.cloudinaryUrl || `/uploads/library/staff/${req.file.filename}`;
        await Admin.findOneAndUpdate({ email: librarian.email, role: 'libraryAdmin' }, { profileImage: librarian.profileImage });
    }

    if (status) {
        librarian.status = status;
        await Admin.findOneAndUpdate({ email: librarian.email, role: 'libraryAdmin' }, { status: status === 'Active' });
    }

    await librarian.save();

    const librarianData = librarian.toObject();
    delete librarianData.password;

    return successResponse(res, librarianData, 'Librarian unit updated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteLibrarian = async (req, res) => {
  try {
    const librarian = await Librarian.findByIdAndDelete(req.params.id);

    if (!librarian) {
      return errorResponse(res, 'Librarian unit not found', 404);
    }

    // Remove corresponding Admin login record
    await Admin.findOneAndDelete({ email: librarian.email, role: 'libraryAdmin' });

    return successResponse(res, null, 'Librarian unit liquidated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.searchLibrarians = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUser = await getUserContext(req.userId);

    if (!query) {
      return errorResponse(res, 'Search query is required', 400);
    }

    const librarians = await Librarian.find({
      branch: currentUser.branch,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { staffId: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');

    return successResponse(res, librarians, 'Query synchronization complete');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getLibrariansByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const currentUser = await getUserContext(req.userId);

    if (!['Active', 'Inactive'].includes(status)) {
      return errorResponse(res, 'Invalid protocol status', 400);
    }

    const librarians = await Librarian.find({ 
        branch: currentUser.branch,
        status 
    }).select('-password');

    return successResponse(res, librarians, `${status} status units fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
