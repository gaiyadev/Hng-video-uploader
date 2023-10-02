# Hng Stage 5 Task Solution repository.

## Installation

```bash
$ git clone https://github.com/gaiyadev/Hng-video-uploader.git
$ cd video-uploader
```

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm start
```

# API Documentation

## Upload a New Video

**Request:**

- **Method:** POST
- **URL:** `https://hngtastfive-video-uploader.onrender.com/api/videos`
- **Request Content-Type:** ` multipart/form-data`
- **Payload:**

```json
{
  "video ":  "multipart"
}
```

Response:

Status Code: 201 Created

```json
{
  "message": "File uploaded successfully",
  "filename": "example-video.mp4"
}

```

## Fetch Video

**Request:**

- **Method:** GET
- **Endpoint:**  `https://hngtastfive-video-uploader.onrender.com/api/videos:filename`

Response:

Status Code: 200 OK
```json
{
  "message": "File uploaded successfully",
  "filename": "example-video.mp4"
}
```


