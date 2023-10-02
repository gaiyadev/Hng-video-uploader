const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const { Deepgram } = require("@deepgram/sdk");
const amqp = require('amqplib');
const ffmpeg = require('fluent-ffmpeg'); // Added this line for ffmpeg support
require('dotenv').config()

const app = express();
app.use(bodyParser.raw({ limit: '50mb' }));
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const api_key = process.env.Deepgram_API;
const deepgram = new Deepgram(api_key);
const videoChunks = [];

// Modify the /upload endpoint to handle an array of video chunks
app.post('/upload', async (req, res) => {
  const incomingChunks = req.body.chunks; // Assuming the chunks are sent in the request body as an array

  // Check if video chunks are present
  if (!incomingChunks || !Array.isArray(incomingChunks) || incomingChunks.length === 0) {
    return res.status(400).json({ error: 'Invalid video chunks' });
  }

  // Add incoming chunks to the global videoChunks array
  videoChunks.push(...incomingChunks);

  const videoId = uuidv4();
  const compiledVideoPath = `./uploads/${videoId}.webm`;

  // Compile the video and save it to the destination folder
  try {
    await concatenateVideoChunks(videoChunks, compiledVideoPath);

    // Transcribe the video using Deepgram SDK
    const transcription = await transcribeVideo(compiledVideoPath);

    // Return video link and transcription as response
    const videoLink = `/videos/${videoId}.webm`;
    const response = {
      videoLink,
      transcription,
    };

    // Clean up stored chunks for this video
    videoChunks.length = 0;

    res.json(response);
  } catch (error) {
    console.error('Error processing video chunks:', error);
    res.status(500).json({ error: 'Failed to process video chunks' });
  }
});

async function concatenateVideoChunks(chunks, outputFilePath) {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg();
    chunks.forEach(chunk => {
      // Add each chunk as an input stream
      ffmpegCommand.input(chunk);
    });

    // Merge input streams and save the output as a complete video file
    ffmpegCommand
      .on('end', () => {
        console.log('Video concatenation finished.');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error concatenating video chunks:', err);
        reject(err);
      })
      .mergeToFile(outputFilePath, './temp'); // Temporary folder to store intermediate files
  });
}



async function compileVideo(chunks, compiledVideoPath) {
  return new Promise((resolve, reject) => {
    const writableStream = fs.createWriteStream(compiledVideoPath);
    chunks.forEach(chunk => {
      writableStream.write(chunk);
    });
    writableStream.end();
    writableStream.on('finish', () => {
      // Video compilation completed
      resolve();
    });
    writableStream.on('error', err => {
      // Handle error during video compilation
      reject(err);
    });
  });
}

async function transcribeVideo(videoPath) {
  // Use Deepgram SDK to transcribe the video
  return new Promise((resolve, reject) => {
    deepgram.transcription.preRecorded({
      stream: fs.createReadStream(videoPath),
      mimetype: 'video/webm', 
    })
    .then(response => {
      resolve(response.transcript);
    })
    .catch(error => {
      reject(error);
    });
  });
}

async function publishToRabbitMQ(transcription) {
  // const connection = await amqp.connect('amqp://localhost:5672');
  const connection = await amqp.connect('amqp://rabbitmq:5672');
  const channel = await connection.createChannel();
  await channel.assertQueue('transcription-queue');
  channel.sendToQueue('transcription-queue', Buffer.from(transcription));
}


app.get('/videos/:videoId', (req, res) => {
    const videoId = req.params.videoId;
    const videoPath = `uploads/${videoId}.webm`; // Path to your WebM video file

    // Check if the video file exists
    if (fs.existsSync(videoPath)) {
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Handle video streaming based on the range header
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunkSize = end - start + 1;
            const videoStream = fs.createReadStream(videoPath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/webm',
            });
            videoStream.pipe(res);
        } else {
            // Simple response with the whole video file
            const videoStream = fs.createReadStream(videoPath);
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/webm',
            });
            videoStream.pipe(res);
        }
    } else {
        // Video not found
        res.status(404).json({ error: 'Video not found' });
    }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
