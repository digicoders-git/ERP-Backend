async function testCreateFeeAdmin() {
  const url = 'https://erp-backend-0ab5.onrender.com/api/staff-panel/fee-admin';
  
  // First, we need to log in as a staff to get a token
  const loginUrl = 'https://erp-backend-0ab5.onrender.com/api/staff-panel/auth/login';
  const loginBody = {
    email: 'staff@gmail.com',
    password: '123456'
  };

  console.log('Logging in as staff...');
  try {
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody)
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.error('Staff Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log('Staff Login successful. Token obtained:', token);

    // Now, test create fee admin
    const createBody = {
      name: 'Test Fee Admin',
      email: 'testfee' + Math.floor(Math.random() * 1000) + '@gmail.com',
      mobile: '1234567890',
      password: 'password123',
      employeeId: 'EMP' + Math.floor(Math.random() * 1000)
    };

    console.log('Sending request to create fee admin...');
    const createRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(createBody)
    });

    console.log('HTTP Status:', createRes.status);
    const createData = await createRes.json();
    console.log('Response data:', JSON.stringify(createData, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testCreateFeeAdmin();
