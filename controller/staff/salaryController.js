const Salary = require('../../model/Salary');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAllSalaries = async (req, res) => {
  try {
    const salaries = await Salary.find().sort({ createdAt: -1 });
    return successResponse(res, salaries, 'Salaries fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getSalaryById = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return errorResponse(res, 'Salary record not found', 404);
    }
    return successResponse(res, salary, 'Salary fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createSalary = async (req, res) => {
  try {
    const { teacherName, month, baseSalary, allowances, deductions, status, paymentDate } = req.body;

    if (!teacherName || !month || !baseSalary) {
      return errorResponse(res, 'Required fields missing', 400);
    }

    const netSalary = baseSalary + (allowances || 0) - (deductions || 0);

    const salary = new Salary({
      teacherName,
      month,
      baseSalary,
      allowances: allowances || 0,
      deductions: deductions || 0,
      netSalary,
      status: status || 'Pending',
      paymentDate: status === 'Paid' ? new Date(paymentDate) : null
    });

    await salary.save();
    return successResponse(res, salary, 'Salary record created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateSalary = async (req, res) => {
  try {
    const { teacherName, month, baseSalary, allowances, deductions, status, paymentDate } = req.body;
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return errorResponse(res, 'Salary record not found', 404);
    }

    if (teacherName) salary.teacherName = teacherName;
    if (month) salary.month = month;
    if (baseSalary) salary.baseSalary = baseSalary;
    if (allowances !== undefined) salary.allowances = allowances;
    if (deductions !== undefined) salary.deductions = deductions;
    if (status) salary.status = status;
    if (paymentDate && status === 'Paid') salary.paymentDate = new Date(paymentDate);

    salary.netSalary = salary.baseSalary + salary.allowances - salary.deductions;

    await salary.save();
    return successResponse(res, salary, 'Salary record updated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) {
      return errorResponse(res, 'Salary record not found', 404);
    }
    return successResponse(res, null, 'Salary record deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getSalariesByMonth = async (req, res) => {
  try {
    const { month } = req.params;
    const salaries = await Salary.find({ month });
    return successResponse(res, salaries, 'Salaries fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getSalariesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    if (!['Pending', 'Paid'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const salaries = await Salary.find({ status });
    return successResponse(res, salaries, `${status} salaries fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getSalaryReport = async (req, res) => {
  try {
    const totalSalaries = await Salary.countDocuments();
    const paidSalaries = await Salary.countDocuments({ status: 'Paid' });
    const pendingSalaries = await Salary.countDocuments({ status: 'Pending' });
    
    const totalPaid = await Salary.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } }
    ]);

    const totalPending = await Salary.aggregate([
      { $match: { status: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } }
    ]);

    const report = {
      totalSalaries,
      paidSalaries,
      pendingSalaries,
      totalPaidAmount: totalPaid[0]?.total || 0,
      totalPendingAmount: totalPending[0]?.total || 0
    };

    return successResponse(res, report, 'Salary report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
