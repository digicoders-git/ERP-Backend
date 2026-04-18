require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./errorHandler');
const { initCache } = require('./utils/cache');

// All route imports...
const adminRoutes = require('./router/adminRoutes');
const planRoutes = require('./router/planRoutes');
const clientRoutes = require('./router/clientRoutes');
const branchRoutes = require('./router/branchRoutes');
const superAdminProfileRoutes = require('./router/superAdminProfileRoutes');
const schoolAdminProfileRoutes = require('./router/schoolAdminProfileRoutes');
const branchAdminProfileRoutes = require('./router/branchAdminProfileRoutes');
const staffRoutes = require('./router/staffRoutes');
const taskRoutes = require('./router/taskRoutes');
const teacherRoutes = require('./router/teacherRoutes');
const classRoutes = require('./router/classRoutes');
const sectionRoutes = require('./router/sectionRoutes');
const feeRoutes = require('./router/feeRoutes');
const feeMappingRoutes = require('./router/feeMappingRoutes');
const hostelRoutes = require('./router/hostelRoutes');
const roomTypeRoutes = require('./router/roomTypeRoutes');
const roomRoutes = require('./router/roomRoutes');
const wardenRoutes = require('./router/wardenRoutes');
const hostelAllocationRoutes = require('./router/hostelAllocationRoutes');
const vehicleRoutes = require('./router/vehicleRoutes');
const driverRoutes = require('./router/driverRoutes');
const driverSalaryRoutes = require('./router/driverSalaryRoutes');
const routeRoutes = require('./router/routeRoutes');
const routeStopRoutes = require('./router/routeStopRoutes');
const routeChargeRoutes = require('./router/routeChargeRoutes');
const transportAssignmentRoutes = require('./router/transportAssignmentRoutes');
const transportAllocationRoutes = require('./router/transportAllocationRoutes');

// Transport Panel APIs
const driverPanelRoutes = require('./router/transport/driverPanelRoutes');
const vehicleChecklistRoutes = require('./router/transport/vehicleChecklistRoutes');
const driverComplaintRoutes = require('./router/transport/driverComplaintRoutes');
const salaryDocumentsRoutes = require('./router/transport/salaryDocumentsRoutes');
const gpsTrackingRoutes = require('./router/transport/gpsTrackingRoutes');
const transportPanelRoutes = require('./router/transport/transportPanelRoutes');
const driverLoginRoutes = require('./router/transport/driverLoginRoutes');
const transportAttendanceRoutes = require('./router/transport/transportAttendanceRoutes');

// All other routes...
const staffAdmissionRoutes = require('./router/staff/admissionRoutes');
const staffNoticeRoutes = require('./router/staff/noticeRoutes');
const staffExamScheduleRoutes = require('./router/staff/examScheduleRoutes');
const staffDashboardRoutes = require('./router/staff/dashboardRoutes');
const staffStudentRoutes = require('./router/staff/studentRoutes');
const staffFeeCollectionRoutes = require('./router/staff/feeCollectionRoutes');
const staffExamRoutes = require('./router/staff/examRoutes');
const staffIdCardRoutes = require('./router/staff/idCardRoutes');
const notificationRoutes = require('./router/notificationRoutes');
const staffClassRoutes = require('./router/staff/classRoutes');
const staffReportRoutes = require('./router/staff/reportRoutes');
const staffELearningRoutes = require('./router/staff/eLearningRoutes');
const staffProfileRoutes = require('./router/staff/profileRoutes');
const staffHostelRoutes = require('./router/staff/hostelRoutes');
const staffTransportRoutes = require('./router/staff/transportRoutes');
const staffLibrarianRoutes = require('./router/staff/librarianRoutes');
const staffLibraryRoutes = require('./router/staff/libraryRoutes');
const staffTeacherManagementRoutes = require('./router/staff/teacherManagementRoutes');
const staffSalaryRoutes = require('./router/staff/salaryRoutes');
const staffPerformanceEvaluationRoutes = require('./router/staff/performanceEvaluationRoutes');
const staffTeacherAttendanceRoutes = require('./router/staff/teacherAttendanceRoutes');
const staffDocumentRoutes = require('./router/staff/documentRoutes');
const staffNotificationRoutes = require('./router/staff/notificationRoutes');
const staffTimetableRoutes = require('./router/staff/timetableRoutes');
const staffFeeAdminRoutes = require('./router/staff/feeAdminRoutes');

const feeStructureRoutes = require('./router/fee/feeStructureRoutes');
const feeAdminRoutes = require('./router/fee/feeAdminRoutes');
const feeDashboardRoutes = require('./router/fee/feeDashboardRoutes');
const feeReportsRoutes = require('./router/fee/feeReportsRoutes');
const feeExtrasRoutes = require('./router/fee/feeExtrasRoutes');
const paymentGatewayRoutes = require('./router/fee/paymentGatewayRoutes');

const hostelMenuRoutes = require('./router/warden/hostelMenuRoutes');
const hostelAttendanceRoutes = require('./router/warden/hostelAttendanceRoutes');
const messAttendanceRoutes = require('./router/warden/messAttendanceRoutes');
const hostelComplaintRoutes = require('./router/warden/hostelComplaintRoutes');
const checkInOutRoutes = require('./router/warden/checkInOutRoutes');
const visitorRoutes = require('./router/warden/visitorRoutes');
const leaveGatePassRoutes = require('./router/warden/leaveGatePassRoutes');
const hostelFeeRoutes = require('./router/warden/hostelFeeRoutes');
const studentQueryRoutes = require('./router/warden/studentQueryRoutes');
const wardenDashboardRoutes = require('./router/warden/wardenDashboardRoutes');
const hostelServiceRoutes = require('./router/warden/hostelServiceRoutes');
const bedAllocationRoutes = require('./router/warden/bedAllocationRoutes');
const entryExitRoutes = require('./router/warden/entryExitRoutes');
const wardenAnalyticsRoutes = require('./router/warden/analyticsRoutes');
const wardenReportsRoutes = require('./router/warden/reportsRoutes');
const wardenAuthRoutes = require('./router/warden/wardenAuthRoutes');
const messManagementRoutes = require('./router/warden/messManagementRoutes');
const hostelStudentRoutes = require('./router/warden/hostelStudentRoutes');
const wardenOptimizedRoutes = require('./router/warden/wardenOptimizedRoutes');

const teacherAuthRoutes = require('./router/teacher/authRoutes');
const timetableRoutes = require('./router/teacher/timetableRoutes');
const assignmentRoutes = require('./router/teacher/assignmentRoutes');
const diaryRoutes = require('./router/teacher/diaryRoutes');
const teacherNoticeRoutes = require('./router/teacher/noticeRoutes');
const liveClassRoutes = require('./router/teacher/liveClassRoutes');
const videoClassRoutes = require('./router/teacher/videoClassRoutes');
const quizRoutes = require('./router/teacher/quizRoutes');
const resourceRoutes = require('./router/teacher/resourceRoutes');
const teacherAttendanceRoutes = require('./router/teacher/attendanceRoutes');
const teacherReportsRoutes = require('./router/teacher/reportsRoutes');
const parentAlertsRoutes = require('./router/teacher/parentAlertsRoutes');
const teacherDashboardRoutes = require('./router/teacher/dashboardRoutes');
const teacherProfileRoutes = require('./router/teacher/profileRoutes');
const debugCheckRoutes = require('./router/teacher/debugCheckRoutes');
const teacherSalaryRoutes = require('./router/teacher/salaryRoutes');
const teacherPerformanceEvaluationRoutes = require('./router/teacher/performanceEvaluationRoutes');

const admissionRoutes = require('./router/admissionRoutes');
const branchDashboardRoutes = require('./router/branchDashboardRoutes');
const branchReportsRoutes = require('./router/branchReportsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();
initCache().catch(err => console.warn('Cache initialization skipped:', err.message));

// All existing routes...
app.use('/api/admin', adminRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/branch', branchRoutes);
app.use('/api/super-admin', superAdminProfileRoutes);
app.use('/api/school-admin', schoolAdminProfileRoutes);
app.use('/api/branch-admin', branchAdminProfileRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/class', classRoutes);
app.use('/api/section', sectionRoutes);
app.use('/api/fee', feeRoutes);
app.use('/api/fee-mapping', feeMappingRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/room-type', roomTypeRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/warden', wardenRoutes);
app.use('/api/hostel-allocation', hostelAllocationRoutes);
app.use('/api/vehicle', vehicleRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver-salary', driverSalaryRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/route-stop', routeStopRoutes);
app.use('/api/route-charge', routeChargeRoutes);
app.use('/api/transport-assignment', transportAssignmentRoutes);
app.use('/api/transport-allocation', transportAllocationRoutes);

// Transport Panel APIs - WITH ATTENDANCE
app.use('/api/transport-panel/driver', driverPanelRoutes);
app.use('/api/transport-panel/checklist', vehicleChecklistRoutes);
app.use('/api/transport-panel/complaints', driverComplaintRoutes);
app.use('/api/transport-panel/salary-docs', salaryDocumentsRoutes);
app.use('/api/transport-panel/gps', gpsTrackingRoutes);
app.use('/api/transport-panel/attendance', transportAttendanceRoutes);
app.use('/api/transport', transportPanelRoutes);
app.use('/api/driver-auth', driverLoginRoutes);

// All other panel routes...
app.use('/api/staff-panel/auth', require('./router/staff/authRoutes'));
app.use('/api/staff-panel/admission', staffAdmissionRoutes);
app.use('/api/staff-panel/notice', staffNoticeRoutes);
app.use('/api/staff-panel/exam-schedule', staffExamScheduleRoutes);
app.use('/api/staff-panel/dashboard', staffDashboardRoutes);
app.use('/api/staff-panel/student', staffStudentRoutes);
app.use('/api/staff-panel/fee-collection', staffFeeCollectionRoutes);
app.use('/api/staff-panel/exam', staffExamRoutes);
app.use('/api/staff-panel/id-card', staffIdCardRoutes);
app.use('/api/staff-panel/class', staffClassRoutes);
app.use('/api/staff-panel/report', staffReportRoutes);
app.use('/api/staff-panel/e-learning', staffELearningRoutes);
app.use('/api/staff-panel/profile', staffProfileRoutes);
app.use('/api/staff-panel/hostel', staffHostelRoutes);
app.use('/api/staff-panel/notification', notificationRoutes);
app.use('/api/staff-panel/transport', staffTransportRoutes);
app.use('/api/staff-panel/librarian', staffLibrarianRoutes);
app.use('/api/staff-panel/library', staffLibraryRoutes);
app.use('/api/staff-panel/teacher-management', staffTeacherManagementRoutes);
app.use('/api/staff-panel/salary', staffSalaryRoutes);
app.use('/api/staff-panel/performance-evaluation', staffPerformanceEvaluationRoutes);
app.use('/api/staff-panel/teacher-attendance', staffTeacherAttendanceRoutes);
app.use('/api/staff-panel/documents', staffDocumentRoutes);
app.use('/api/staff-panel/notifications', staffNotificationRoutes);
app.use('/api/staff-panel/timetable', staffTimetableRoutes);
app.use('/api/staff-panel/fee-admin', staffFeeAdminRoutes);

app.use('/api/fee-panel/fee-structure', feeStructureRoutes);
app.use('/api/fee-panel/fee-admin', feeAdminRoutes);
app.use('/api/fee-panel/dashboard', feeDashboardRoutes);
app.use('/api/fee-panel/reports', feeReportsRoutes);
app.use('/api/fee-panel/extras', feeExtrasRoutes);
app.use('/api/fee-panel/payment', paymentGatewayRoutes);

app.use('/api/warden-panel/hostel-menu', hostelMenuRoutes);
app.use('/api/warden-panel/attendance', hostelAttendanceRoutes);
app.use('/api/warden-panel/mess-attendance', messAttendanceRoutes);
app.use('/api/warden-panel/complaints', hostelComplaintRoutes);
app.use('/api/warden-panel/check-in-out', checkInOutRoutes);
app.use('/api/warden-panel/visitors', visitorRoutes);
app.use('/api/warden-panel/leave-gatepass', leaveGatePassRoutes);
app.use('/api/warden-panel/hostel-fee', hostelFeeRoutes);
app.use('/api/warden-panel/student-queries', studentQueryRoutes);
app.use('/api/warden-panel', wardenDashboardRoutes);
app.use('/api/warden-panel/services', hostelServiceRoutes);
app.use('/api/warden-panel/bed-allocation', bedAllocationRoutes);
app.use('/api/warden-panel/entry-exit', entryExitRoutes);
app.use('/api/warden-panel/analytics', wardenAnalyticsRoutes);
app.use('/api/warden-panel/reports', wardenReportsRoutes);
app.use('/api/warden-panel/mess', messManagementRoutes);
app.use('/api/warden-panel/students', hostelStudentRoutes);
app.use('/api/warden-panel/optimized', wardenOptimizedRoutes);
app.use('/api/warden-auth', wardenAuthRoutes);

app.use('/api/teacher-panel/auth', teacherAuthRoutes);
app.use('/api/teacher-panel/timetable', timetableRoutes);
app.use('/api/teacher-panel/assignment', assignmentRoutes);
app.use('/api/teacher-panel/diary', diaryRoutes);
app.use('/api/teacher-panel/notice', teacherNoticeRoutes);
app.use('/api/teacher-panel/live-class', liveClassRoutes);
app.use('/api/teacher-panel/video-class', videoClassRoutes);
app.use('/api/teacher-panel/quiz', quizRoutes);
app.use('/api/teacher-panel/resource', resourceRoutes);
app.use('/api/teacher-panel/attendance', teacherAttendanceRoutes);
app.use('/api/teacher-panel/reports', teacherReportsRoutes);
app.use('/api/teacher-panel/parent-alerts', parentAlertsRoutes);
app.use('/api/teacher-panel/dashboard', teacherDashboardRoutes);
app.use('/api/teacher-panel/salary', teacherSalaryRoutes);
app.use('/api/teacher-panel/debug', debugCheckRoutes);
app.use('/api/teacher-panel/performance-evaluation', teacherPerformanceEvaluationRoutes);
app.use('/api/teacher-panel', teacherProfileRoutes);

app.use('/api/admission', admissionRoutes);
app.use('/api/branch-admin', branchDashboardRoutes);
app.use('/api/branch-admin/reports', branchReportsRoutes);

const approvalRoutes = require('./router/approvalRoutes');
app.use('/api/approval', approvalRoutes);

const leaveRoutes = require('./router/leaveRoutes');
const attendanceRoutes = require('./router/attendanceRoutes');
const feeReportRoutes = require('./router/feeReportRoutes');
const alumniRoutes = require('./router/alumniRoutes');
const eventRoutes = require('./router/eventRoutes');
const staffQuizRoutes = require('./router/staffQuizRoutes');

app.use('/api/leave', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fee-report', feeReportRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/staff-quiz', staffQuizRoutes);

const staffOptimizedRoutes = require('./router/staff/staffOptimizedRoutes');
const teacherOptimizedRoutes = require('./router/staff/teacherOptimizedRoutes');
const feeOptimizedRoutes = require('./router/fee/feeOptimizedRoutes');
const hostelOptimizedRoutes = require('./router/hostelOptimizedRoutes');
const transportOptimizedRoutes = require('./router/transportOptimizedRoutes');
const studentOptimizedRoutes = require('./router/studentOptimizedRoutes');
const libraryOptimizedRoutes = require('./router/libraryOptimizedRoutes');

app.use('/api/admin-panel/staff', staffOptimizedRoutes);
app.use('/api/admin-panel/teachers', teacherOptimizedRoutes);
app.use('/api/admin-panel/fees', feeOptimizedRoutes);
app.use('/api/admin-panel/hostel', hostelOptimizedRoutes);
app.use('/api/admin-panel/transport', transportOptimizedRoutes);
app.use('/api/admin-panel/students', studentOptimizedRoutes);
app.use('/api/admin-panel/library', libraryOptimizedRoutes);

const reportsRoutes = require('./router/reportsRoutes');
app.use('/api/reports', reportsRoutes);

const superAdminReportRoutes = require('./router/superAdminReportRoutes');
app.use('/api/super-admin/reports', superAdminReportRoutes);

const libraryAuthRoutes = require('./router/library/libraryAuthRoutes');
const libraryDashboardRoutes = require('./router/library/libraryDashboardRoutes');
const libraryBookRoutes = require('./router/library/bookRoutes');
const libraryBookCategorizationRoutes = require('./router/library/bookCategorizationRoutes');
const libraryBookIssueRoutes = require('./router/library/bookIssueRoutes');
const libraryBookRequestRoutes = require('./router/library/bookRequestRoutes');
const libraryBookLimitRoutes = require('./router/library/bookLimitRoutes');
const libraryCardRoutes = require('./router/library/libraryCardRoutes');
const libraryMemberRoutes = require('./router/library/memberRoutes');
const libraryStudentRoutes = require('./router/library/studentRoutes');
const libraryDigitalLibraryRoutes = require('./router/library/digitalLibraryRoutes');
const libraryAdminRoutes = require('./router/library/libraryAdminRoutes');
const libraryProfileRoutes = require('./router/library/libraryProfileRoutes');
const libraryReportsRoutes = require('./router/library/libraryReportsRoutes');
const barcodeFineRoutes = require('./router/library/barcodeFineRoutes');

app.use('/api/library-panel/auth', libraryAuthRoutes);
app.use('/api/library-panel/dashboard', libraryDashboardRoutes);
app.use('/api/library-panel/book', libraryBookRoutes);
app.use('/api/library-panel/book-categorization', libraryBookCategorizationRoutes);
app.use('/api/library-panel/book-issue', libraryBookIssueRoutes);
app.use('/api/library-panel/book-request', libraryBookRequestRoutes);
app.use('/api/library-panel/book-limit', libraryBookLimitRoutes);
app.use('/api/library-panel/library-card', libraryCardRoutes);
app.use('/api/library-panel/member', libraryMemberRoutes);
app.use('/api/library-panel/student', libraryStudentRoutes);
app.use('/api/library-panel/digital-library', libraryDigitalLibraryRoutes);
app.use('/api/library-panel/admin', libraryAdminRoutes);
app.use('/api/library-panel/profile', libraryProfileRoutes);
app.use('/api/library-panel/reports', libraryReportsRoutes);
app.use('/api/library-panel/barcode-fine', barcodeFineRoutes);

const parentStudentRoutes = require('./router/parentStudentRoutes');
app.use('/api/parent-student', parentStudentRoutes);

const adminPanelRoutes = require('./router/adminPanelRoutes');
app.use('/api/school-admin', adminPanelRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { 
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

app.get('/', (req, res) => {
  res.json({ message: 'ERP Backend Server Running' });
});

app.use((req, res) => {
  console.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
