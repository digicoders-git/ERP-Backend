const express = require('express');
const router = express.Router();

const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Student = require('../model/Student');
const Fee = require('../model/Fee');
const Book = require('../model/Book');
const Hostel = require('../model/Hostel');
const Vehicle = require('../model/Vehicle');

router.get('/staff-count', async (req, res) => {
  try {
    const count = await Staff.countDocuments();
    const data = await Staff.find().limit(5).lean();
    res.json({ success: true, count, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/teacher-count', async (req, res) => {
  try {
    const count = await Teacher.countDocuments();
    const data = await Teacher.find().limit(5).lean();
    res.json({ success: true, count, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/student-count', async (req, res) => {
  try {
    const count = await Student.countDocuments();
    const data = await Student.find().limit(5).lean();
    res.json({ success: true, count, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/fee-count', async (req, res) => {
  try {
    const count = await Fee.countDocuments();
    const data = await Fee.find().limit(5).lean();
    res.json({ success: true, count, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/book-count', async (req, res) => {
  try {
    const count = await Book.countDocuments();
    const data = await Book.find().limit(5).lean();
    // Also show all unique clients and branches
    const clients = [...new Set(data.map(b => b.client?.toString()))];
    const branches = [...new Set(data.map(b => b.branch?.toString()))];
    res.json({ success: true, count, data, uniqueClients: clients, uniqueBranches: branches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/hostel-count', async (req, res) => {
  try {
    const count = await Hostel.countDocuments();
    const data = await Hostel.find().limit(5).lean();
    res.json({ success: true, count, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/vehicle-count', async (req, res) => {
  try {
    const count = await Vehicle.countDocuments();
    const data = await Vehicle.find().limit(5).lean();
    res.json({ success: true, count, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/all-stats', async (req, res) => {
  try {
    const [staffCount, teacherCount, studentCount, feeCount, bookCount, hostelCount, vehicleCount] = await Promise.all([
      Staff.countDocuments(),
      Teacher.countDocuments(),
      Student.countDocuments(),
      Fee.countDocuments(),
      Book.countDocuments(),
      Hostel.countDocuments(),
      Vehicle.countDocuments()
    ]);

    res.json({
      success: true,
      stats: {
        staff: staffCount,
        teachers: teacherCount,
        students: studentCount,
        fees: feeCount,
        books: bookCount,
        hostels: hostelCount,
        vehicles: vehicleCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
