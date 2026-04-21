# Google Drive Gallery

A Pinterest-style gallery for browsing and downloading media from Google Drive folders.

## Features

- **4 Folder Tabs**: Switch between Canon, DJI, ipong, and Sony folders
- **Pinterest-Style Masonry Layout**: Images displayed without cropping
- **Image/Video Filter**: Filter by All, Images, or Videos
- **One-Click Download**: Download single files with a click
- **Bulk Download**: Select multiple files and download as ZIP
- **Right-Click Copy**: Copy image URLs to clipboard
- **YouTube-Style Video**: Videos don't autoplay - click to play in lightbox
- **Keyboard Shortcuts**: Space to select, ESC to clear selection

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + TypeScript + Express (Vercel serverless)
- **Google API**: @googleapis/drive v3
- **Styling**: CSS Grid with Masonry layout
- **Deployment**: Vercel

## Project Structure

```
google-drive-gallery/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Gallery/
│   │   │   ├── Controls/
│   │   │   ├── Tabs/
│   │   │   └── VideoPlayer/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   └── package.json
├── server/          # Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── .env.example     # Environment variable template
└── vercel.json      # Vercel deployment config
```

## Prerequisites

1. Node.js 18+ 
2. Google Cloud Project with Drive API enabled
3. Google API Key

## Setup

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Go to Credentials → Create Credentials → API Key
5. Copy your API key

### 2. Get Folder IDs

From your Google Drive folder URLs, extract the folder ID:
- URL format: `https://drive.google.com/drive/folders/FOLDER_ID`
- Copy the FOLDER_ID for each of the 4 folders (Canon, DJI, ipong, Sony)

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Google API Key from Google Cloud Console
GOOGLE_API_KEY=your_api_key_here

# Google Drive Folder IDs (extracted from folder URLs)
FOLDER_CANON=canon_folder_id
FOLDER_DJI=dji_folder_id
FOLDER_IPONG=ipong_folder_id
FOLDER_SONY=sony_folder_id

# Optional: Allowed origins for CORS (default: *)
ALLOWED_ORIGINS=*
```

### 4. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 5. Run Locally

```bash
# Terminal 1: Start backend (port 8080)
cd server
npm run dev

# Terminal 2: Start frontend (port 5173)
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## Deployment (Vercel)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy to Vercel

```bash
cd server
vercel
```

Follow the prompts to deploy. After first deploy, configure environment variables:

```bash
vercel env add GOOGLE_API_KEY
vercel env add FOLDER_CANON
vercel env add FOLDER_DJI
vercel env add FOLDER_IPONG
vercel env add FOLDER_SONY
```

### 3. Deploy Frontend

Update `client/vite.config.ts` to point to your Vercel backend URL, then:

```bash
cd client
npm run build
vercel --prod
```

## API Endpoints

### GET /api/files/:folder

List files in a folder.

**Parameters:**
- `folder`: canon | dji | ipong | sony
- `pageToken` (optional): Pagination token
- `pageSize` (optional): Number of files (default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...files],
    "nextPageToken": "token"
  }
}
```

### GET /api/file/:fileId

Get file metadata.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file_id",
    "name": "filename.jpg",
    "mimeType": "image/jpeg",
    "thumbnailLink": "...",
    "webViewLink": "...",
    "downloadUrl": "..."
  }
}
```

### GET /api/download/:fileId

Download a single file (streamed).

### POST /api/download/bulk

Download multiple files as ZIP.

**Request Body:**
```json
{
  "fileIds": ["id1", "id2", "id3"]
}
```

**Limit:** Maximum 100 files per bulk download.

## Security Features

- **File ID Validation**: Google Drive file ID format validation
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP
- **Filename Sanitization**: Prevents zip slip attacks
- **Error Handling**: User-friendly errors without leaking internals
- **CORS Configurable**: Restrict allowed origins

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle selection on focused item |
| ESC | Clear selection / Close modal |
| D | Download selected files |
| Arrow Keys | Navigate gallery items |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires CSS Grid with `grid-template-rows: masonry` support or JavaScript fallback.

## Troubleshooting

### "GOOGLE_API_KEY not configured"
Ensure `.env` file exists with valid API key.

### "Invalid folder" error
Check that folder names match: canon, dji, ipong, sony

### Files not loading
Verify folder is publicly accessible or API key has correct permissions.

### Download fails
Check file exists and isn't a Google Workspace file (Docs/Sheets).

## License

MIT

## Credits

Built with:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Google Drive API](https://developers.google.com/drive)
- [JSZip](https://stuk.github.io/jszip/)
