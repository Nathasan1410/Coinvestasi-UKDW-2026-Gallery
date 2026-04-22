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

// Folder ID mapping
const FOLDER_IDS: Record<string, string> = {
  canon: process.env.FOLDER_CANON || '',
  dji: process.env.FOLDER_DJI || '',
  ipong: process.env.FOLDER_IPONG || '',
  sony: process.env.FOLDER_SONY || '',
};

interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  webContentLink?: string;
  size?: string;
}

// Security utilities
const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{20,50}$/;

function isValidDriveFileId(fileId: string): boolean {
  return DRIVE_FILE_ID_REGEX.test(fileId);
}

function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
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

// Handlers
async function handleFiles(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Extract folder from URL: /api/files/:folder
  const urlParts = req.url?.split('/') || [];
  const folderIndex = urlParts.findIndex(p => p === 'files');
  const folder = folderIndex >= 0 && urlParts.length > folderIndex + 1
    ? urlParts[folderIndex + 1]
    : undefined;

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
}

async function handleDownload(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Extract fileId from URL: /api/download/:fileId
  const urlParts = req.url?.split('/') || [];
  const downloadIndex = urlParts.findIndex(p => p === 'download');
  const fileId = downloadIndex >= 0 && urlParts.length > downloadIndex + 1
    ? urlParts[downloadIndex + 1]
    : undefined;

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
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const url = req.url || '';

  console.log('Request:', req.method, url);

  if (url.includes('/files/')) {
    return handleFiles(req, res);
  }

  if (url.includes('/download/')) {
    return handleDownload(req, res);
  }

  res.status(404).json({ success: false, error: 'Not found' });
}
