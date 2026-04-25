import { handler } from './api/files/[folder].ts';
import { createServer } from 'http';

// mock req/res
const req = {
  method: 'GET',
  query: { folder: 'dji', pageSize: '40' },
  headers: {}
};

const res = {
  setHeader: (k, v) => console.log(`Set header ${k}=${v}`),
  status: (code) => ({
    json: (data) => console.log(`Status ${code}:`, JSON.stringify(data).slice(0, 100) + '...'),
    end: () => console.log(`Status ${code} ended`)
  })
};

// We can't import handler easily without compiling, let's write a simple node script instead using TS
