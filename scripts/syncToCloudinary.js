const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinaryConfig');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const panelMapping = {
    'students': 'students',
    'staff': 'staff',
    'teacher': 'teacher',
    'warden': 'warden',
    'notices': 'admin/notices',
    'resources': 'teacher/resources',
    'diary': 'teacher/diary',
    'assignments': 'teacher/assignments',
    'digital-library': 'library/digital',
    'documents': 'general/documents'
};

async function uploadFile(filePath, panel, category) {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `erp/${panel}/${category}`,
            resource_type: "auto"
        });
        console.log(`Uploaded: ${filePath} -> ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error(`Error uploading ${filePath}:`, error.message);
        return null;
    }
}

async function processDirectory(dir, panel, category) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // For subdirectories, we might want to adjust category
            await processDirectory(fullPath, panel, entry.name);
        } else if (entry.isFile() && entry.name !== '.gitkeep') {
            await uploadFile(fullPath, panel, category);
            
            // Re-organize locally
            const newDir = path.join(UPLOADS_DIR, panel, category);
            if (!fs.existsSync(newDir)) {
                fs.mkdirSync(newDir, { recursive: true });
            }
            const newPath = path.join(newDir, entry.name);
            
            if (fullPath !== newPath) {
                fs.copyFileSync(fullPath, newPath);
                console.log(`Moved locally: ${fullPath} -> ${newPath}`);
                // Note: We don't delete the old file yet to be safe
            }
        }
    }
}

async function runMigration() {
    console.log("Starting migration to Cloudinary and organizing local folders...");
    
    for (const [dirName, panelPath] of Object.entries(panelMapping)) {
        const sourceDir = path.join(UPLOADS_DIR, dirName);
        console.log(`Processing directory: ${dirName} for panel: ${panelPath}`);
        
        // Split panelPath to get panel and category if needed
        const parts = panelPath.split('/');
        const panel = parts[0];
        const defaultCategory = parts[1] || 'misc';
        
        await processDirectory(sourceDir, panel, defaultCategory);
    }
    
    console.log("Migration complete!");
}

runMigration().catch(err => console.error("Migration failed:", err));
