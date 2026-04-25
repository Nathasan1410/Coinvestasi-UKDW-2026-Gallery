require('dotenv').config({ path: '.env' });
const { google } = require('googleapis');

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;
const driveClient = google.drive({ version: 'v3', auth: DRIVE_API_KEY });

async function check() {
  const id = process.env.FOLDER_CANON || '1RNxCZqU_mxpEPkeG6LWo19HjgvYB5kQv';
  const response = await driveClient.files.list({
    q: `'${id}' in parents and trashed = false`,
    pageSize: 5,
    fields: 'files(id, name, thumbnailLink)',
  });
  console.log(JSON.stringify(response.data.files, null, 2));
}

check();