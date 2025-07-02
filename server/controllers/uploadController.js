// server/controllers/uploadController.js
const { uploadToS3 } = require('../services/uploadService');

exports.uploadSingleFile = async (req, res) => {
  try {
    const file = req.file;
    const url = await uploadToS3(file);
    res.json({ url });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
