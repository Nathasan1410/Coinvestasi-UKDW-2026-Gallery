# Google Drive Gallery Backend

Backend API for fetching files from Google Drive folders.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Configure environment variables:
```bash
cp ../.env.example ./.env
```

3. Get your Google API Key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new API key
   - Enable the Google Drive API

4. Get your folder IDs:
   - Open each folder in Google Drive
   - Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Add to `.env`

## Development

```bash
npm run dev
```

## Deployment

Push to Vercel - it will automatically detect the serverless functions.

Configure environment variables in Vercel dashboard:
- `GOOGLE_API_KEY`
- `FOLDER_CANON`
- `FOLDER_DJI`
- `FOLDER_IPONG`
- `FOLDER_SONY`

## API Endpoints

### List files in a folder
```
GET /api/files/:folder?pageSize=100&pageToken=optional
```

Parameters:
- `folder`: canon, dji, ipong, or sony
- `pageSize`: 1-1000 (default: 100)
- `pageToken`: token for next page (from previous response)

Response:
```json
{
  "success": true,
  "data": {
    "items": [...files],
    "nextPageToken": "optional"
  }
}
```

### Get file metadata and download URL
```
GET /api/file/:fileId
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "filename.jpg",
    "mimeType": "image/jpeg",
    "thumbnailLink": "...",
    "webViewLink": "...",
    "size": "12345",
    "downloadUrl": "..."
  }
}
```
