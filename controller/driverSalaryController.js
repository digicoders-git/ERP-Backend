const DriverSalary = require('../model/DriverSalary');
const Driver = require('../model/Driver');
const { successResponse, errorResponse } = require('../responseFormatter');

exports.getAllDriverSalaries = async (req, res) => {
  try {
    const branch = req.user.branch;
    const client = req.user.client;
    
    const query = {};
    if (branch) query.branch = branch;
    if (client) query.client = client;
    
    const salaries = await DriverSalary.find(query)
      .populate('driver', 'name email mobileNo')
      .sort({ createdAt: -1 });
    return successResponse(res, salaries, 'Driver salaries fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getDriverSalaryById = async (req, res) => {
  try {
    const salary = await DriverSalary.findById(req.params.id)
      .populate('driver', 'name email mobileNo');
    if (!salary) {
      return errorResponse(res, 'Salary record not found', 404);
    }
    return successResponse(res, salary, 'Salary fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createDriverSalary = async (req, res) => {
  try {
    const { driver, driverName, month, baseSalary, allowances, deductions, status, paymentDate } = req.body;
    const branch = req.user.branch;
    const client = req.user.client;
    
    if (!driver && !driverName) {
      return errorResponse(res, 'Driver identification is required', 400);
    }
    
    if (!month || baseSalary === undefined) {
      return errorResponse(res, 'Month and base salary are required', 400);
    }

    const b = Number(baseSalary) || 0;
    const a = Number(allowances) || 0;
    const d = Number(deductions) || 0;
    const netSalary = b + a - d;

    let driverId = driver;
    if (!driverId && driverName) {
      const driverDoc = await Driver.findOne({ name: driverName });
      if (driverDoc) {
        driverId = driverDoc._id;
      }
    }

    const salary = new DriverSalary({
      driver: driverId || null,
      driverName: driverName,
      month,
      baseSalary: b,
      allowances: a,
      deductions: d,
      netSalary,
      status: status || 'Pending',
      paymentDate: status === 'Paid' ? (paymentDate ? new Date(paymentDate) : new Date()) : null,
      branch,
      client
    });

    await salary.save();
    return successResponse(res, salary, 'Driver salary record created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateDriverSalary = async (req, res) => {
  try {
    const { driver, driverName, month, baseSalary, allowances, deductions, status, paymentDate } = req.body;
    const salary = await DriverSalary.findById(req.params.id);
 
    if (!salary) {
      return errorResponse(res, 'Salary record not found', 404);
    }

    if (driver) salary.driver = driver;
    if (driverName) salary.driverName = driverName;
    if (month) salary.month = month;
    if (baseSalary !== undefined) salary.baseSalary = Number(baseSalary);
    if (allowances !== undefined) salary.allowances = Number(allowances);
    if (deductions !== undefined) salary.deductions = Number(deductions);
    if (status) salary.status = status;
    if (paymentDate && status === 'Paid') salary.paymentDate = new Date(paymentDate);

    salary.netSalary = salary.baseSalary + salary.allowances - salary.deductions;

    await salary.save();
    return successResponse(res, salary, 'Driver salary record updated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteDriverSalary = async (req, res) => {
  try {
    const salary = await DriverSalary.findByIdAndDelete(req.params.id);
    if (!salary) {
      return errorResponse(res, 'Salary record not found', 404);
    }
    return successResponse(res, null, 'Driver salary record deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getDriverSalariesByMonth = async (req, res) => {
  try {
    const { month } = req.params;
    const branch = req.user.branch;
    const client = req.user.client;
    
    const query = { month };
    if (branch) query.branch = branch;
    if (client) query.client = client;
    
    const salaries = await DriverSalary.find(query)
      .populate('driver', 'name email mobileNo');
    return successResponse(res, salaries, 'Driver salaries fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getDriverSalariesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    if (!['Pending', 'Paid'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const branch = req.user.branch;
    const client = req.user.client;
    
    const query = { status };
    if (branch) query.branch = branch;
    if (client) query.client = client;
    
    const salaries = await DriverSalary.find(query)
      .populate('driver', 'name email mobileNo');
    return successResponse(res, salaries, `${status} driver salaries fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getDriverSalaryReport = async (req, res) => {
  try {
    const branch = req.user.branch;
    const client = req.user.client;
    
    const query = {};
    if (branch) query.branch = branch;
    if (client) query.client = client;
    
    const totalSalaries = await DriverSalary.countDocuments(query);
    const paidSalaries = await DriverSalary.countDocuments({ ...query, status: 'Paid' });
    const pendingSalaries = await DriverSalary.countDocuments({ ...query, status: 'Pending' });
    
    const totalPaid = await DriverSalary.aggregate([
      { $match: { ...query, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } }
    ]);

    const totalPending = await DriverSalary.aggregate([
      { $match: { ...query, status: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } }
    ]);

    const report = {
      totalSalaries,
      paidSalaries,
      pendingSalaries,
      totalPaidAmount: totalPaid[0]?.total || 0,
      totalPendingAmount: totalPending[0]?.total || 0
    };

    return successResponse(res, report, 'Driver salary report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getDriversForSalary = async (req, res) => {
  try {
    const branch = req.user.branch;
    const client = req.user.client;
    
    const query = {};
    if (branch) query.branch = branch;
    if (client) query.client = client;
    
    const drivers = await Driver.find(query)
      .select('_id name email mobileNo')
      .sort({ name: 1 });
    
    return successResponse(res, drivers, 'Drivers fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
