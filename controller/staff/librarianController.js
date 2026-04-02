const Librarian = require('../../model/Librarian');
const Admin = require('../../model/Admin');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAllLibrarians = async (req, res) => {
  try {
    const librarians = await Librarian.find()
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
    const { name, email, phone, password, qualification, status, branch, client } = req.body;

    if (!name || !email || !phone || !password) {
      return errorResponse(res, 'All fields are required', 400);
    }

    if (!branch || !client) {
      return errorResponse(res, 'branch and client are required', 400);
    }

    const existingLibrarian = await Librarian.findOne({ $or: [{ email }, { phone }] });
    if (existingLibrarian) {
      return errorResponse(res, 'Email or phone already exists', 400);
    }

    const lastLibrarian = await Librarian.findOne().sort({ createdAt: -1 });
    const lastNumber = lastLibrarian ? parseInt(lastLibrarian.staffId.slice(3)) : 0;
    const staffId = `LIB${String(lastNumber + 1).padStart(3, '0')}`;

    const librarian = new Librarian({
      name,
      email,
      phone,
      password,
      qualification: qualification || 'B.Lib',
      status: status || 'Active',
      staffId,
      department: 'Library'
    });

    await librarian.save();

    // Create Admin login record so librarian can login via /api/admin/login
    const existingAdmin = await Admin.findOne({ email });
    if (!existingAdmin) {
      await Admin.create({
        email,
        password,
        role: 'libraryAdmin',
        branch: req.body.branch || undefined,
        client: req.body.client || undefined,
        status: true
      });
    }

    const librarianData = librarian.toObject();
    delete librarianData.password;

    return successResponse(res, librarianData, 'Librarian created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateLibrarian = async (req, res) => {
  try {
    const { name, email, phone, password, qualification, status } = req.body;
    const librarian = await Librarian.findById(req.params.id);

    if (!librarian) {
      return errorResponse(res, 'Librarian not found', 404);
    }

    if (email && email !== librarian.email) {
      const existingEmail = await Librarian.findOne({ email });
      if (existingEmail) {
        return errorResponse(res, 'Email already exists', 400);
      }
      librarian.email = email;
    }

    if (phone && phone !== librarian.phone) {
      const existingPhone = await Librarian.findOne({ phone });
      if (existingPhone) {
        return errorResponse(res, 'Phone already exists', 400);
      }
      librarian.phone = phone;
    }

    if (name) librarian.name = name;
    if (password) librarian.password = password;
    if (qualification) librarian.qualification = qualification;
    if (status) librarian.status = status;

    await librarian.save();

    const librarianData = librarian.toObject();
    delete librarianData.password;

    return successResponse(res, librarianData, 'Librarian updated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteLibrarian = async (req, res) => {
  try {
    const librarian = await Librarian.findByIdAndDelete(req.params.id);

    if (!librarian) {
      return errorResponse(res, 'Librarian not found', 404);
    }

    // Remove corresponding Admin login record
    await Admin.findOneAndDelete({ email: librarian.email, role: 'libraryAdmin' });

    return successResponse(res, null, 'Librarian deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.searchLibrarians = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return errorResponse(res, 'Search query is required', 400);
    }

    const librarians = await Librarian.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { staffId: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');

    return successResponse(res, librarians, 'Search results');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getLibrariansByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    if (!['Active', 'Inactive'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const librarians = await Librarian.find({ status }).select('-password');

    return successResponse(res, librarians, `${status} librarians fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
