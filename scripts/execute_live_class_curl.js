const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configuration
const ADMIN_ID = "69dcee7e8bbcb31b39f85498";
const SECRET = process.env.JWT_SECRET || "SDJF5678DSF@@SDJFNKSKF**&&DSFSD78DHF";
const API_URL = "http://localhost:5002/api/teacher-panel/live-class";

// Data for the Live Class
const classData = {
  title: "Advanced Quantum Mechanics",
  subject: "Physics",
  meetLink: "https://meet.google.com/qwe-rtyu-iop",
  date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  duration: "1.5 Hours",
  description: "Detailed session on Quantum entanglement and wave particles.",
  classId: "69d7817d9c4058285eb24159",
  sectionId: "69d78462381a1592587ae72b"
};

async function executePost() {
  try {
    // 1. Generate Token
    const token = jwt.sign(
      { _id: ADMIN_ID, role: 'teacherAdmin', branch: "69d61d2fa9c89eaa23b68dec" },
      SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated Token for Teacher Admin...');

    // 2. Perform POST request using fetch
    console.log('Performing API Request...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(classData)
    });

    const result = await response.json();

    if (response.ok) {
        console.log('API Success Response:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\nLive Class scheduled successfully via API!');
    } else {
        console.log('API Error Response:');
        console.log(JSON.stringify(result, null, 2));
    }

  } catch (err) {
    console.error('Script Error:', err);
  }
}

executePost();
