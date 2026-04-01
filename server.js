require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./errorHandler');
const { cacheMiddleware, CACHE_DURATION } = require('./cache');
const adminRoutes = require('./router/adminRoutes');
const planRoutes = require('./router/planRoutes');
const clientRoutes = require('./router/clientRoutes');
const branchRoutes = require('./router/branchRoutes');
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
const routeRoutes = require('./router/routeRoutes');
const routeStopRoutes = require('./router/routeStopRoutes');
const routeChargeRoutes = require('./router/routeChargeRoutes');
const transportAssignmentRoutes = require('./router/transportAssignmentRoutes');
const transportAllocationRoutes = require('./router/transportAllocationRoutes');

// Staff Panel Routes
const staffAdmissionRoutes = require('./router/staff/admissionRoutes');
const staffNoticeRoutes = require('./router/staff/noticeRoutes');
const staffExamScheduleRoutes = require('./router/staff/examScheduleRoutes');
const staffDashboardRoutes = require('./router/staff/dashboardRoutes');
const staffStudentRoutes = require('./router/staff/studentRoutes');
const staffFeeCollectionRoutes = require('./router/staff/feeCollectionRoutes');
const staffExamRoutes = require('./router/staff/examRoutes');
const staffIdCardRoutes = require('./router/staff/idCardRoutes');
const staffClassRoutes = require('./router/staff/classRoutes');
const staffReportRoutes = require('./router/staff/reportRoutes');
const staffELearningRoutes = require('./router/staff/eLearningRoutes');
const staffProfileRoutes = require('./router/staff/profileRoutes');
const staffHostelRoutes = require('./router/staff/hostelRoutes');
const staffTransportRoutes = require('./router/staff/transportRoutes');
const staffLibrarianRoutes = require('./router/staff/librarianRoutes');
const staffTeacherManagementRoutes = require('./router/staff/teacherManagementRoutes');
const staffSalaryRoutes = require('./router/staff/salaryRoutes');
const staffPerformanceEvaluationRoutes = require('./router/staff/performanceEvaluationRoutes');
const staffTeacherAttendanceRoutes = require('./router/staff/teacherAttendanceRoutes');
const staffDocumentRoutes = require('./router/staff/documentRoutes');
const staffNotificationRoutes = require('./router/staff/notificationRoutes');

// Fee Panel Routes
const feeStructureRoutes = require('./router/fee/feeStructureRoutes');
const feeAdminRoutes = require('./router/fee/feeAdminRoutes');
const feeDashboardRoutes = require('./router/fee/feeDashboardRoutes');
const feeReportsRoutes = require('./router/fee/feeReportsRoutes');
const feeExtrasRoutes = require('./router/fee/feeExtrasRoutes');

// Warden Panel Routes
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

// Library Panel Routes
const libraryAdminRoutes = require('./router/library/libraryAdminRoutes');
const bookRoutes = require('./router/library/bookRoutes');
const memberRoutes = require('./router/library/memberRoutes');
const bookIssueRoutes = require('./router/library/bookIssueRoutes');
const libraryStudentRoutes = require('./router/library/studentRoutes');
const bookRequestRoutes = require('./router/library/bookRequestRoutes');
const bookCategorizationRoutes = require('./router/library/bookCategorizationRoutes');
const libraryCardRoutes = require('./router/library/libraryCardRoutes');
const bookLimitRoutes = require('./router/library/bookLimitRoutes');
const digitalLibraryRoutes = require('./router/library/digitalLibraryRoutes');
const libraryAuthRoutes = require('./router/library/libraryAuthRoutes');
const libraryReportsRoutes = require('./router/library/libraryReportsRoutes');

// Teacher Panel Routes
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

// Branch Admin Routes
const admissionRoutes = require('./router/admissionRoutes');
const branchDashboardRoutes = require('./router/branchDashboardRoutes');
const branchReportsRoutes = require('./router/branchReportsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
connectDB();

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/branch', branchRoutes);
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
app.use('/api/route', routeRoutes);
app.use('/api/route-stop', routeStopRoutes);
app.use('/api/route-charge', routeChargeRoutes);
app.use('/api/transport-assignment', transportAssignmentRoutes);
app.use('/api/transport-allocation', transportAllocationRoutes);

// Staff Panel APIs
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
app.use('/api/staff-panel/transport', staffTransportRoutes);
app.use('/api/staff-panel/librarian', staffLibrarianRoutes);
app.use('/api/staff-panel/teacher-management', staffTeacherManagementRoutes);
app.use('/api/staff-panel/salary', staffSalaryRoutes);
app.use('/api/staff-panel/performance-evaluation', staffPerformanceEvaluationRoutes);
app.use('/api/staff-panel/teacher-attendance', staffTeacherAttendanceRoutes);
app.use('/api/staff-panel/documents', staffDocumentRoutes);
app.use('/api/staff-panel/notifications', staffNotificationRoutes);

// Fee Panel APIs
app.use('/api/fee-panel/fee-structure', feeStructureRoutes);
app.use('/api/fee-panel/fee-admin', feeAdminRoutes);
app.use('/api/fee-panel/dashboard', feeDashboardRoutes);
app.use('/api/fee-panel/reports', feeReportsRoutes);
app.use('/api/fee-panel/extras', feeExtrasRoutes);

// Warden Panel APIs
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
app.use('/api/warden-auth', wardenAuthRoutes);

// Library Panel APIs
app.use('/api/library-panel/library-admin', libraryAdminRoutes);
app.use('/api/library-panel/book', bookRoutes);
app.use('/api/library-panel/member', memberRoutes);
app.use('/api/library-panel/book-issue', bookIssueRoutes);
app.use('/api/library-panel/student', libraryStudentRoutes);
app.use('/api/library-panel/book-request', bookRequestRoutes);
app.use('/api/library-panel/book-categorization', bookCategorizationRoutes);
app.use('/api/library-panel/library-card', libraryCardRoutes);
app.use('/api/library-panel/book-limit', bookLimitRoutes);
app.use('/api/library-panel/digital-library', digitalLibraryRoutes);
app.use('/api/library-panel/auth', libraryAuthRoutes);
app.use('/api/library-panel/reports', libraryReportsRoutes);

// Teacher Panel APIs
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

// Branch Admin APIs
app.use('/api/admission', admissionRoutes);
app.use('/api/branch-admin', branchDashboardRoutes);
app.use('/api/branch-admin/reports', branchReportsRoutes);

const approvalRoutes = require('./router/approvalRoutes');
app.use('/api/approval', approvalRoutes);

// Staff Panel - New APIs
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

// Optimized Routes for Admin Panel
const staffOptimizedRoutes = require('./router/staff/staffOptimizedRoutes');
const teacherOptimizedRoutes = require('./router/staff/teacherOptimizedRoutes');
const feeOptimizedRoutes = require('./router/fee/feeOptimizedRoutes');
const libraryOptimizedRoutes = require('./router/library/libraryOptimizedRoutes');
const hostelOptimizedRoutes = require('./router/hostelOptimizedRoutes');
const transportOptimizedRoutes = require('./router/transportOptimizedRoutes');
const studentOptimizedRoutes = require('./router/studentOptimizedRoutes');

app.use('/api/admin-panel/staff', staffOptimizedRoutes);
app.use('/api/admin-panel/teachers', teacherOptimizedRoutes);
app.use('/api/admin-panel/fees', feeOptimizedRoutes);
app.use('/api/admin-panel/library', libraryOptimizedRoutes);
app.use('/api/admin-panel/hostel', hostelOptimizedRoutes);
app.use('/api/admin-panel/transport', transportOptimizedRoutes);
app.use('/api/admin-panel/students', studentOptimizedRoutes);

// Transport Panel APIs
const driverPanelRoutes = require('./router/transport/driverPanelRoutes');
const vehicleChecklistRoutes = require('./router/transport/vehicleChecklistRoutes');
const driverComplaintRoutes = require('./router/transport/driverComplaintRoutes');
const salaryDocumentsRoutes = require('./router/transport/salaryDocumentsRoutes');
app.use('/api/transport-panel/driver', driverPanelRoutes);
app.use('/api/transport-panel/checklist', vehicleChecklistRoutes);
app.use('/api/transport-panel/complaints', driverComplaintRoutes);
app.use('/api/transport-panel/salary-docs', salaryDocumentsRoutes);

// Reports APIs
const reportsRoutes = require('./router/reportsRoutes');
app.use('/api/reports', reportsRoutes);

// Super Admin Reports APIs
const superAdminReportRoutes = require('./router/superAdminReportRoutes');
app.use('/api/super-admin/reports', superAdminReportRoutes);

// Parent/Student Panel APIs
const parentStudentRoutes = require('./router/parentStudentRoutes');
app.use('/api/parent-student', parentStudentRoutes);

// Admin/School Panel APIs
const adminPanelRoutes = require('./router/adminPanelRoutes');
app.use('/api/school-admin', adminPanelRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'ERP Backend Server Running' });
});

// Test Routes (No Auth Required)
const testRoutes = require('./router/testRoutes');
app.use('/api/test', testRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
