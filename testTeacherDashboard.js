const axios = require('axios');

// Test teacher dashboard API
async function testDashboardAPI() {
  try {
    console.log('Testing Teacher Dashboard API...\n');
    
    // Replace with actual teacher token
    const token = 'YOUR_TEACHER_TOKEN_HERE';
    
    const response = await axios.get('http://localhost:5002/api/teacher-panel/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ Success:', response.data.success);
    console.log('\n📊 Dashboard Data:');
    console.log(JSON.stringify(response.data.data, null, 2));
    
    if (response.data.data.stats) {
      console.log('\n📈 Stats Summary:');
      console.log('- Total Classes:', response.data.data.stats.totalClasses);
      console.log('- Today Classes:', response.data.data.stats.todayClassCount);
      console.log('- Total Students:', response.data.data.stats.totalStudents);
      console.log('- Pending Assignments:', response.data.data.stats.pendingAssignments);
      console.log('- Attendance Rate:', response.data.data.stats.attendanceRate + '%');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDashboardAPI();
