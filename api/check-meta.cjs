require('dotenv').config({ path: '../.env' });
const { drive } = require('@googleapis/drive');

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;
const driveClient = drive({ version: 'v3', auth: DRIVE_API_KEY });

async function check() {
  const id = process.env.FOLDER_CANON || '1RNxCZqU_mxpEPkeG6LWo19HjgvYB5kQv';
  const response = await driveClient.files.list({
    q: `'${id}' in parents and name = 'IMG_1198.JPG' and trashed = false`,
    fields: 'files(id, name, imageMediaMetadata)',
  });
  console.log(JSON.stringify(response.data.files, null, 2));
}

check();