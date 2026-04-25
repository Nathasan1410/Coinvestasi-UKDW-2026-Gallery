require('dotenv').config({ path: '../.env' });
const { drive } = require('@googleapis/drive');

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;
const driveClient = drive({ version: 'v3', auth: DRIVE_API_KEY });

async function check() {
  const id = process.env.FOLDER_SONY || '1Pw7asbOfqeDEc-Siy_WYt3PVId3pvGiG';
  const response = await driveClient.files.list({
    q: `'${id}' in parents and trashed = false`,
    pageSize: 10,
    fields: 'files(id, name, imageMediaMetadata(width, height, rotation))',
  });
  console.log(JSON.stringify(response.data.files, null, 2));
}

check();