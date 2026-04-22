import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drive } from '@googleapis/drive';

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;

if (!DRIVE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

const driveClient = drive({
  version: 'v3',
  auth: DRIVE_API_KEY,
});

const FOLDER_IDS: Record<string, string> = {
  canon: process.env.FOLDER_CANON || '',
  dji: process.env.FOLDER_DJI || '',
  ipong: process.env.FOLDER_IPONG || '',
  sony: process.env.FOLDER_SONY || '',
};

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function listFilesFromFolder(folderId: string, pageSize: number = 100) {
  const response = await driveClient.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize,
    fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size)',
    orderBy: 'name asc',
  });

  return (response.data.files || []).filter(f => f.id && f.name && f.mimeType);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const pathname = req.headers['x-now-route-match'] || req.url || '';
  const pathParts = pathname.split('/').filter(Boolean);

  if (pathParts[0] === 'api' && pathParts[1] === 'files' && pathParts.length >= 3) {
    const folder = pathParts[2];

    if (!folder || !(folder in FOLDER_IDS)) {
      res.status(400).json({
        success: false,
        error: `Invalid folder. Valid folders: ${Object.keys(FOLDER_IDS).join(', ')}`,
      });
      return;
    }

    const folderId = FOLDER_IDS[folder];
    if (!folderId) {
      res.status(500).json({ success: false, error: `Folder ID not configured for: ${folder}` });
      return;
    }

    try {
      const files = await listFilesFromFolder(folderId);
      res.status(200).json({ success: true, data: { items: files } });
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to list files' });
    }
    return;
  }

  res.status(404).json({ success: false, error: 'Not found' });
}