import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drive } from '@googleapis/drive';
import archiver from 'archiver';

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

const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{20,50}$/;

function isValidDriveFileId(fileId: string): boolean {
  return DRIVE_FILE_ID_REGEX.test(fileId);
}

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

async function getFileStream(fileId: string) {
  const response = await driveClient.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return { stream: response.data, mimeType: response.headers['content-type'] || 'application/octet-stream' };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const pathname = req.url?.split('?')[0] || '';
  const pathParts = pathname.split('/').filter(Boolean);

  if (pathParts[0] === 'api' && pathParts[1] === 'files' && pathParts.length >= 3) {
    const folder = pathParts[2];

    if (!folder || !(folder in FOLDER_IDS)) {
      res.status(400).json({ success: false, error: `Invalid folder. Valid folders: ${Object.keys(FOLDER_IDS).join(', ')}` });
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

  if (pathParts[0] === 'api' && pathParts[1] === 'download' && pathParts.length >= 3) {
    if (pathParts[2] === 'bulk') {
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      let fileIds: string[];
      try {
        const body = req.body;
        if (!body || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
          res.status(400).json({ success: false, error: 'fileIds array is required' });
          return;
        }
        fileIds = body.fileIds;
        if (!fileIds.every(isValidDriveFileId)) {
          res.status(400).json({ success: false, error: 'Invalid file ID format' });
          return;
        }
      } catch {
        res.status(400).json({ success: false, error: 'Invalid request body' });
        return;
      }

      try {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="download.zip"');
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);
        for (const fileId of fileIds) {
          try {
            const { stream } = await getFileStream(fileId);
            archive.append(stream, { name: `${fileId}` });
          } catch (error) {
            console.error(`Error adding file ${fileId}:`, error);
          }
        }
        archive.finalize();
      } catch (error) {
        console.error('Error creating bulk download:', error);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create archive' });
        }
      }
      return;
    }

    const fileId = pathParts[2];
    if (!fileId || !isValidDriveFileId(fileId)) {
      res.status(400).json({ success: false, error: 'Invalid file ID format' });
      return;
    }

    try {
      const { stream, mimeType } = await getFileStream(fileId);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
      stream.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to download file' });
    }
    return;
  }

  res.status(404).json({ success: false, error: 'Not found' });
}