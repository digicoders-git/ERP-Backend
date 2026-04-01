# 🎯 TEACHER PANEL - COMPLETE API ENDPOINTS

## 📌 Base URLs
```
Authentication: http://localhost:5000/api/teacher
Teacher Panel: http://localhost:5000/api/teacher-panel
```

---

## 🔐 AUTHENTICATION APIs

### 1. Teacher Login
```
POST /api/teacher/login
```
**Request Body:**
```json
{
  "email": "teacher@school.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "teacher": {
    "id": "6789abcd1234efgh5678ijkl",
    "name": "John Doe",
    "email": "teacher@school.com",
    "mobile": "1234567890",
    "profileImage": "/uploads/teacher/image.jpg",
    "subjects": ["Mathematics", "Physics"],
    "qualification": "M.Sc Mathematics",
    "experience": "5 years",
    "branch": {
      "_id": "branch_id",
      "branchName": "Main Branch",
      "branchCode": "MB001"
    },
    "status": true
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 2. Get Teacher Profile
```
GET /api/teacher/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "teacher_id",
    "name": "John Doe",
    "email": "teacher@school.com",
    "mobile": "1234567890",
    "profileImage": "/uploads/teacher/image.jpg",
    "subjects": ["Mathematics"],
    "qualification": "M.Sc",
    "experience": "5 years",
    "branch": {...},
    "status": true
  }
}
```

---

### 3. Update Teacher Profile
```
PUT /api/teacher/profile
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
mobile: "9876543210"
address: "123 Main St"
qualification: "M.Sc Mathematics"
experience: "6 years"
profileImage: [file] (optional)
```

---

### 4. Change Password
```
POST /api/teacher/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 📊 DASHBOARD APIs

### 1. Get Dashboard Statistics
```
GET /api/teacher-panel/dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "teacher": {
      "name": "John Doe",
      "email": "john@school.com",
      "subjects": ["Mathematics"]
    },
    "stats": {
      "totalClasses": 3,
      "totalStudents": 105,
      "totalAssignments": 15,
      "pendingAssignments": 5,
      "todayClassCount": 2,
      "attendanceRate": 92
    },
    "todayAttendance": {
      "total": 100,
      "present": 92,
      "absent": 5,
      "late": 3
    },
    "upcomingClasses": [
      {
        "id": "class_id",
        "time": "09:00-10:00",
        "class": "Class 10",
        "section": "A",
        "subject": "Mathematics",
        "room": "Room 101"
      }
    ],
    "recentNotices": [...]
  }
}
```

---

### 2. Get Teacher's Classes
```
GET /api/teacher-panel/dashboard/classes
Authorization: Bearer <token>
```

---

### 3. Get Students by Class
```
GET /api/teacher-panel/dashboard/students?classId=xxx&sectionId=xxx
Authorization: Bearer <token>
```

---

### 4. Get Recent Activities
```
GET /api/teacher-panel/dashboard/recent-activities?limit=10
Authorization: Bearer <token>
```

---

### 5. Get Upcoming Classes
```
GET /api/teacher-panel/dashboard/upcoming-classes
Authorization: Bearer <token>
```

---

## 📝 ATTENDANCE APIs

### 1. Mark Attendance
```
POST /api/teacher-panel/attendance/mark
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2024-01-15",
  "classId": "6789abcd1234efgh5678ijkl",
  "sectionId": "1234abcd5678efgh9012ijkl",
  "attendanceData": [
    {
      "studentId": "student_id_1",
      "status": "present",
      "remark": ""
    },
    {
      "studentId": "student_id_2",
      "status": "absent",
      "remark": "Sick"
    }
  ]
}
```

---

### 2. Get Attendance by Class
```
GET /api/teacher-panel/attendance/class?classId=xxx&sectionId=xxx&date=2024-01-15
Authorization: Bearer <token>
```

---

### 3. Get Attendance Statistics
```
GET /api/teacher-panel/attendance/stats?classId=xxx&sectionId=xxx
Authorization: Bearer <token>
```

---

### 4. Get Student Attendance History
```
GET /api/teacher-panel/attendance/student/:studentId
Authorization: Bearer <token>
```

---

### 5. Bulk Update Attendance
```
PUT /api/teacher-panel/attendance/bulk
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2024-01-15",
  "classId": "class_id",
  "sectionId": "section_id",
  "status": "present"
}
```

---

### 6. Get Attendance Report
```
GET /api/teacher-panel/attendance/report?classId=xxx&sectionId=xxx&startDate=xxx&endDate=xxx
Authorization: Bearer <token>
```

---

## 📈 REPORTS APIs

### 1. Get Academic Report
```
GET /api/teacher-panel/reports/academic?classId=xxx&sectionId=xxx
Authorization: Bearer <token>
```

---

### 2. Get Attendance Analytics
```
GET /api/teacher-panel/reports/attendance-analytics?classId=xxx&sectionId=xxx&period=monthly
Authorization: Bearer <token>
```

---

### 3. Get Grade Distribution
```
GET /api/teacher-panel/reports/grade-distribution?classId=xxx&sectionId=xxx
Authorization: Bearer <token>
```

---

### 4. Get Student Progress
```
GET /api/teacher-panel/reports/student-progress/:studentId
Authorization: Bearer <token>
```

---

### 5. Export Report
```
GET /api/teacher-panel/reports/export?type=pdf&reportType=academic
Authorization: Bearer <token>
```

---

## 🔔 PARENT ALERTS APIs

### 1. Send SMS Alert
```
POST /api/teacher-panel/parent-alerts/send-sms
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "studentId": "student_id",
  "message": "Your child was absent today",
  "classId": "class_id",
  "sectionId": "section_id"
}
```

---

### 2. Send Email Alert
```
POST /api/teacher-panel/parent-alerts/send-email
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "studentId": "student_id",
  "subject": "Absence Notification",
  "message": "Your child was absent today",
  "classId": "class_id",
  "sectionId": "section_id"
}
```

---

### 3. Send Bulk Alerts
```
POST /api/teacher-panel/parent-alerts/bulk
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "classId": "class_id",
  "sectionId": "section_id",
  "type": "sms",
  "message": "Your child was absent today",
  "subject": "Absence Alert"
}
```

---

### 4. Get Alert History
```
GET /api/teacher-panel/parent-alerts/history?limit=10
Authorization: Bearer <token>
```

---

### 5. Get Alert Templates
```
GET /api/teacher-panel/parent-alerts/templates
Authorization: Bearer <token>
```

---

### 6. Get Absent Students
```
GET /api/teacher-panel/parent-alerts/absent-students?classId=xxx&sectionId=xxx
Authorization: Bearer <token>
```

---

## 📚 ASSIGNMENT APIs

### 1. Create Assignment
```
POST /api/teacher-panel/assignment/create
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Algebra Practice",
  "description": "Solve problems 1-15",
  "classId": "class_id",
  "sectionId": "section_id",
  "subject": "Mathematics",
  "dueDate": "2024-01-20",
  "totalMarks": 100,
  "totalStudents": 35
}
```

---

### 2. Get All Assignments
```
GET /api/teacher-panel/assignment/all
Authorization: Bearer <token>
```

---

### 3. Get Assignment by ID
```
GET /api/teacher-panel/assignment/:id
Authorization: Bearer <token>
```

---

### 4. Update Assignment
```
PUT /api/teacher-panel/assignment/:id
Authorization: Bearer <token>
```

---

### 5. Delete Assignment
```
DELETE /api/teacher-panel/assignment/:id
Authorization: Bearer <token>
```

---

## 📖 E-DIARY APIs

### 1. Add Diary Entry
```
POST /api/teacher-panel/diary/add
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Math Class Progress"
content: "Students showed good understanding"
type: "general"
className: "Class 10A"
priority: "normal"
date: "2024-01-15"
image: [file] (optional)
```

---

### 2. Get All Diary Entries
```
GET /api/teacher-panel/diary/all
Authorization: Bearer <token>
```

---

### 3. Get Diary Entry by ID
```
GET /api/teacher-panel/diary/:id
Authorization: Bearer <token>
```

---

### 4. Update Diary Entry
```
PUT /api/teacher-panel/diary/:id
Authorization: Bearer <token>
```

---

### 5. Delete Diary Entry
```
DELETE /api/teacher-panel/diary/:id
Authorization: Bearer <token>
```

---

## 📢 NOTICE APIs

### 1. Create Notice
```
POST /api/teacher-panel/notice/create
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Mid-Term Exam Schedule"
content: "Exams will be conducted from..."
type: "academic"
targetAudience: "all"
priority: "high"
publishDate: "2024-01-15"
expiryDate: "2024-03-25"
status: "draft"
attachments: [files] (optional)
```

---

### 2. Publish Notice
```
PUT /api/teacher-panel/notice/publish/:id
Authorization: Bearer <token>
```

---

### 3. Get All Notices
```
GET /api/teacher-panel/notice/all
Authorization: Bearer <token>
```

---

### 4. Get Notice by ID
```
GET /api/teacher-panel/notice/:id
Authorization: Bearer <token>
```

---

### 5. Update Notice
```
PUT /api/teacher-panel/notice/:id
Authorization: Bearer <token>
```

---

### 6. Delete Notice
```
DELETE /api/teacher-panel/notice/:id
Authorization: Bearer <token>
```

---

## 🕐 TIMETABLE APIs

### 1. Add Timetable Entry
```
POST /api/teacher-panel/timetable/add
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "day": "Monday",
  "startTime": "09:00",
  "endTime": "10:00",
  "classId": "class_id",
  "sectionId": "section_id",
  "subject": "Mathematics",
  "room": "Room 101"
}
```

---

### 2. Get All Timetables
```
GET /api/teacher-panel/timetable/all
Authorization: Bearer <token>
```

---

### 3. Get Timetable by Day
```
GET /api/teacher-panel/timetable/day/:day
Authorization: Bearer <token>
```

---

### 4. Update Timetable
```
PUT /api/teacher-panel/timetable/:id
Authorization: Bearer <token>
```

---

### 5. Delete Timetable
```
DELETE /api/teacher-panel/timetable/:id
Authorization: Bearer <token>
```

---

## 🎯 QUIZ APIs

### 1. Create Quiz
```
POST /api/teacher-panel/quiz/create
Authorization: Bearer <token>
```

---

### 2. Get All Quizzes
```
GET /api/teacher-panel/quiz/all
Authorization: Bearer <token>
```

---

### 3. Get Quiz by ID
```
GET /api/teacher-panel/quiz/:id
Authorization: Bearer <token>
```

---

### 4. Update Quiz
```
PUT /api/teacher-panel/quiz/:id
Authorization: Bearer <token>
```

---

### 5. Delete Quiz
```
DELETE /api/teacher-panel/quiz/:id
Authorization: Bearer <token>
```

---

## 📁 RESOURCE APIs

### 1. Upload Resource
```
POST /api/teacher-panel/resource/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

### 2. Get All Resources
```
GET /api/teacher-panel/resource/all
Authorization: Bearer <token>
```

---

### 3. Get Resource by ID
```
GET /api/teacher-panel/resource/:id
Authorization: Bearer <token>
```

---

### 4. Update Resource
```
PUT /api/teacher-panel/resource/:id
Authorization: Bearer <token>
```

---

### 5. Delete Resource
```
DELETE /api/teacher-panel/resource/:id
Authorization: Bearer <token>
```

---

## 🎥 LIVE CLASS APIs

### 1. Create Live Class
```
POST /api/teacher-panel/live-class/create
Authorization: Bearer <token>
```

---

### 2. Get All Live Classes
```
GET /api/teacher-panel/live-class/all
Authorization: Bearer <token>
```

---

### 3. Get Live Class by ID
```
GET /api/teacher-panel/live-class/:id
Authorization: Bearer <token>
```

---

### 4. Update Live Class
```
PUT /api/teacher-panel/live-class/:id
Authorization: Bearer <token>
```

---

### 5. Delete Live Class
```
DELETE /api/teacher-panel/live-class/:id
Authorization: Bearer <token>
```

---

## 📹 VIDEO CLASS APIs

### 1. Upload Video Class
```
POST /api/teacher-panel/video-class/upload
Authorization: Bearer <token>
```

---

### 2. Get All Video Classes
```
GET /api/teacher-panel/video-class/all
Authorization: Bearer <token>
```

---

### 3. Get Video Class by ID
```
GET /api/teacher-panel/video-class/:id
Authorization: Bearer <token>
```

---

### 4. Update Video Class
```
PUT /api/teacher-panel/video-class/:id
Authorization: Bearer <token>
```

---

### 5. Delete Video Class
```
DELETE /api/teacher-panel/video-class/:id
Authorization: Bearer <token>
```

---

## 🎯 TOTAL API COUNT: 67 ENDPOINTS ✅

### Breakdown:
- Authentication: 4 APIs
- Dashboard: 5 APIs
- Attendance: 6 APIs
- Reports: 5 APIs
- Parent Alerts: 6 APIs
- Assignments: 5 APIs
- E-Diary: 5 APIs
- Notices: 6 APIs
- Timetable: 5 APIs
- Quiz: 5 APIs
- Resources: 5 APIs
- Live Classes: 5 APIs
- Video Classes: 5 APIs

---

## 🔒 Authentication Flow

1. **Login:** POST `/api/teacher/login` → Get token
2. **Store Token:** Save in localStorage
3. **Use Token:** Add to all requests: `Authorization: Bearer <token>`
4. **Token Expiry:** 7 days

---

## 📝 Frontend Integration Example

```javascript
// Login
const login = async (email, password) => {
  const response = await fetch('http://localhost:5000/api/teacher/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('teacherToken', data.token);
    localStorage.setItem('teacherData', JSON.stringify(data.teacher));
  }
  return data;
};

// Fetch Dashboard
const fetchDashboard = async () => {
  const token = localStorage.getItem('teacherToken');
  const response = await fetch('http://localhost:5000/api/teacher-panel/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};
```

---

**Status:** ✅ 100% COMPLETE
**Last Updated:** January 2024
