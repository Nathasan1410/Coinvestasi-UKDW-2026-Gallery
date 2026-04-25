require('dotenv').config({ path: '../.env' });
const { drive } = require('@googleapis/drive');

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;
const driveClient = drive({ version: 'v3', auth: DRIVE_API_KEY });

const FOLDER_IDS = {
  canon: process.env.FOLDER_CANON || '1RNxCZqU_mxpEPkeG6LWo19HjgvYB5kQv',
  dji: process.env.FOLDER_DJI || '16aeUZDl3tqvGq3umkbCyjxLK3Pmb2ve2',
  ipong: process.env.FOLDER_IPONG || '1feG9ZQ2jiY-AvJ0IvCWzhoHjrKQgfNbK',
  sony: process.env.FOLDER_SONY || '1Pw7asbOfqeDEc-Siy_WYt3PVId3pvGiG',
};

async function check() {
  const rotations = new Set();
  
  for (const folder of Object.values(FOLDER_IDS)) {
    let pageToken;
    do {
      const response = await driveClient.files.list({
        q: `'${folder}' in parents and trashed = false`,
        pageSize: 100,
        pageToken,
        fields: 'nextPageToken, files(imageMediaMetadata(rotation))',
      });
      for (const f of response.data.files) {
        if (f.imageMediaMetadata && f.imageMediaMetadata.rotation !== undefined) {
          rotations.add(f.imageMediaMetadata.rotation);
        }
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);
  }
  
  console.log('Unique rotations:', Array.from(rotations));
}

check();