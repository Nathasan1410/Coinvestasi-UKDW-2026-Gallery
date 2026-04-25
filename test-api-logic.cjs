require('dotenv').config();
const { google } = require('googleapis');

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;
if (!DRIVE_API_KEY) throw new Error('GOOGLE_API_KEY environment variable is required');

const driveClient = google.drive({ version: 'v3', auth: DRIVE_API_KEY });

const FOLDER_IDS = {
  canon: process.env.FOLDER_CANON || '',
  dji: process.env.FOLDER_DJI || '',
  ipong: process.env.FOLDER_IPONG || '',
  sony: process.env.FOLDER_SONY || '',
};

async function listFilesFromFolder(folderId, pageSize, pageToken) {
  const response = await driveClient.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize,
    pageToken,
    fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size, imageMediaMetadata(width, height), videoMediaMetadata(width, height, durationMillis), createdTime)',
    orderBy: 'name asc',
  });

  const result = {
    files: (response.data.files || []).filter(f => f.id && f.name && f.mimeType).map(f => ({
      ...f,
      width: f.imageMediaMetadata?.width || f.videoMediaMetadata?.width,
      height: f.imageMediaMetadata?.height || f.videoMediaMetadata?.height,
      duration: f.videoMediaMetadata?.durationMillis,
    })),
    nextPageToken: response.data.nextPageToken || undefined,
  };

  return result;
}

async function test(folderName) {
  try {
    const id = FOLDER_IDS[folderName];
    if (!id) {
      console.error(`Error: Missing ID for ${folderName}`);
      return;
    }
    console.log(`Testing ${folderName} with ID ${id}`);
    const data = await listFilesFromFolder(id, 40);
    console.log(`Success ${folderName}: ${data.files.length} files. Next token: ${!!data.nextPageToken}`);
  } catch (err) {
    console.error(`Error 500 for ${folderName}:`, err.message);
  }
}

async function run() {
  await test('canon');
  await test('dji');
  await test('ipong');
  await test('sony');
}

run();
