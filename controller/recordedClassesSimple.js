const VideoClass = require('../model/VideoClass');
const ParentStudent = require('../model/ParentStudent');

exports.getRecordedClasses = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await ParentStudent.findById(userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const branch = user.branch?.toString();
    const client = user.client?.toString();

    if (!branch || !client) {
      return res.status(400).json({ message: 'Invalid user branch or client' });
    }

    // Fetch all videos for this branch and client
    const videos = await VideoClass.find({ 
      branch: branch,
      client: client
    })
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formattedVideos = videos.map(v => ({
      id: v._id,
      title: v.title || 'Untitled Video',
      subject: v.subject || 'General',
      duration: v.duration || '0',
      thumbnail: v.thumbnailUrl || '',
      videoUrl: v.videoUrl || '',
      teacher: v.createdBy?.name || 'Academic Dept',
      uploadedAt: new Date(v.createdAt).toLocaleDateString('en-GB'),
      views: v.views || 0,
      class: v.class?.className || 'All Classes',
      section: v.section?.sectionName || 'All Sections'
    }));

    res.status(200).json({ 
      success: true, 
      data: formattedVideos,
      total: formattedVideos.length
    });
  } catch (error) {
    console.error('Recorded Classes Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
