const mongoose = require('mongoose');
const ClientSettings = require('../model/ClientSettings');

const html = `
<div style="width: 350px; height: 500px; background-image: url('https://res.cloudinary.com/dy7p8f0qd/image/upload/v1777295333/erp/client-settings/branding/x7cder6lfk93l4vc6xyn.png'); background-size: 100% 100%; position: relative; font-family: 'Segoe UI', Arial, sans-serif; overflow: hidden; color: #1a237e;">
  
  <!-- Student Photo Box -->
  <div style="position: absolute; top: 95px; left: 118px; width: 115px; height: 115px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    {{student_photo}}
  </div>

  <!-- Data Values (Precisely aligned to the right of colons on the image) -->
  <div style="position: absolute; top: 231px; left: 152px; font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase;">{{student_name}}</div>
  <div style="position: absolute; top: 256px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{class}} / {{section}}</div>
  <div style="position: absolute; top: 281px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{roll_no}}</div>
  <div style="position: absolute; top: 306px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{admission_no}}</div>
  <div style="position: absolute; top: 331px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{dob}}</div>
  <div style="position: absolute; top: 356px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{blood_group}}</div>
  <div style="position: absolute; top: 381px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{phone}}</div>
  <div style="position: absolute; top: 406px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{guardian_phone}}</div>
  <div style="position: absolute; top: 431px; left: 152px; font-size: 10px; font-weight: 700; color: #334155;">{{emergency_phone}}</div>
  <div style="position: absolute; top: 456px; left: 152px; font-size: 9px; font-weight: 700; color: #334155; width: 175px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">{{email}}</div>
  
  <!-- Address -->
  <div style="position: absolute; top: 479px; left: 152px; font-size: 8px; font-weight: 700; color: #475569; width: 175px; height: 20px; line-height: 1.1; overflow: hidden;">{{address}}</div>

  <!-- ID Card Number at bottom -->
  <div style="position: absolute; bottom: 35px; left: 45%; transform: translateX(-50%); font-size: 10px; font-weight: 900; color: #fff; letter-spacing: 1px;">
    {{id_card_number}}
  </div>

</div>`;

mongoose.connect('mongodb://localhost:27017/ERP')
  .then(async () => {
    await ClientSettings.updateMany({}, { 
      $set: { 'idCard.htmlContent': html } 
    });
    console.log('Final refined layout update');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
