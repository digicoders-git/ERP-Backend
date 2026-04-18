const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing Teacher Login API\n');
    
    const response = await axios.post('http://localhost:5002/api/teacher-panel/login', {
      email: 'teacher1@gmail.com',
      password: 'teacher123'
    });

    console.log('Login Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✓ Login successful!');
      console.log(`Token: ${response.data.token.substring(0, 30)}...`);
      console.log(`Teacher: ${response.data.teacher.name}`);
    }
  } catch (error) {
    console.error('Login Error:');
    console.error(error.response?.data || error.message);
  }
}

testLogin();
