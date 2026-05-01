const mongoose = require('mongoose');
require('dotenv').config();
const MarksheetTemplate = require('./model/MarksheetTemplate');

async function fixPaths() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const templates = await MarksheetTemplate.find({ templateFile: { $regex: /^\/uploads\/admin\/[^\/]+$/ } });
    console.log(`Found ${templates.length} templates to fix`);

    for (const template of templates) {
      const oldPath = template.templateFile;
      const newPath = oldPath.replace('/uploads/admin/', '/uploads/admin/templates/');
      template.templateFile = newPath;
      await template.save();
      console.log(`Fixed: ${oldPath} -> ${newPath}`);
    }

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixPaths();
