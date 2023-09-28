const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const storage = multer.diskStorage({
  destination: './uploads', // Directory where uploaded files will be stored
  filename: function (req, file, callback) {
    callback(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});

// Define file filter function for Multer to validate file types
const fileFilter = function (req, file, callback) {
  const supportedFormats = ['.mp4', '.avi', '.mkv']; // Add more formats if needed
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (supportedFormats.includes(fileExtension)) {
    // Accept the file
    callback(null, true);
  } else {
    // Reject the file with an error message
    callback(
      new Error('Invalid file format. Only video files (MP4, AVI, MKV) are allowed.'),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter, // Apply the file filter function
});

// Middleware to parse JSON requests
app.use(express.json());

app.get('/api/', (req, res) => {
  res.json({ message: 'Hello World' });
});


// Define a route to handle file uploads via API
app.post('/api/videos', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

return res.status(201).json({ message: 'File uploaded successfully', filename: req.file.filename });
});

//  Fetch All
app.get('/api/videos', (req, res) => {
    const videoUploadsDirectory = './uploads';
  fs.readdir(videoUploadsDirectory, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Filter out non-video files (if needed)
    const videoFiles = files.filter((file) => {
      const extname = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mkv'].includes(extname);
    });
  return res.status(200).json({ videos: videoFiles });
  });
});


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
