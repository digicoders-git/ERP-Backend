async function testStaffLogin() {
  const url = 'https://erp-backend-0ab5.onrender.com/api/staff-panel/auth/login';
  const body = {
    email: 'staff@example.com', // Replace with your staff email
    password: 'your-password'    // Replace with your staff password
  };

  console.log('Testing live staff login to:', url);
  console.log('Body:', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('HTTP Status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testStaffLogin();
