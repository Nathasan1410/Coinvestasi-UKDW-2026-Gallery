const https = require('https');

const API_KEY = 'AIzaSyC-XWpJfq_XS8tJhOGRIpOJavMiGJKHy-w';
const FOLDERS = {
  canon: '1RNxCZqU_mxpEPkeG6LWo19HjgvYB5kQv',
  dji: '16aeUZDl3tqvGq3umkbCyjxLK3Pmb2ve2',
  ipong: '1feG9ZQ2jiY-AvJ0IvCWzhoHjrKQgfNbK',
  sony: '1Pw7asbOfqeDEc-Siy_WYt3PVId3pvGiG'
};

function testFolder(name, id) {
  const query = encodeURIComponent(`'${id}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${API_KEY}&fields=files(id,name)`;

  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`--- ${name} ---`);
      console.log(`Status: ${res.statusCode}`);
      if (res.statusCode !== 200) {
        console.log(data);
      } else {
        const parsed = JSON.parse(data);
        console.log(`Files found: ${parsed.files ? parsed.files.length : 0}`);
      }
    });
  }).on('error', err => {
    console.error(`Error for ${name}:`, err.message);
  });
}

for (const [name, id] of Object.entries(FOLDERS)) {
  testFolder(name, id);
}
