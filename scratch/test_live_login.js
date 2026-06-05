async function testLogin() {
  const url = 'https://erp-backend-0ab5.onrender.com/api/admin/login';
  const body = {
    email: 'superadmin@gmail.com',
    password: '123456',
    panel: 'superAdmin'
  };

  console.log('Testing login to:', url);
  console.log('Body:', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testLogin();
