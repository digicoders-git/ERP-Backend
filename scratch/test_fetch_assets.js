const fs = require('fs');

async function test() {
  const url = 'https://erp-superadmin-panel-frontend-0tth.onrender.com/assets/index-BuzFFJT8.js';
  try {
    const res = await fetch(url);
    const jsContent = await res.text();

    const terms = ['create({', 'baseURL:', 'VITE_API_BASE_URL'];
    terms.forEach(term => {
      let index = -1;
      while ((index = jsContent.indexOf(term, index + 1)) !== -1) {
        console.log(`Found term "${term}" at index ${index}:`);
        console.log(jsContent.substring(Math.max(0, index - 50), Math.min(jsContent.length, index + 150)));
        console.log('---');
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

test();
