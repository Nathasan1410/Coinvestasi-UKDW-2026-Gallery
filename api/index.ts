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

interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  webContentLink?: string;
  size?: string;
}

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

interface RouteHandler {
  pattern: RegExp;
  paramNames: string[];
  handler: (req: VercelRequest, res: VercelResponse, params: Record<string, string>) => Promise<void>;
}

function matchRoute(url: string, routes: RouteHandler[]): { params: Record<string, string>; handler: RouteHandler['handler'] } | null {
  for (const route of routes) {
    const match = route.pattern.exec(url);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { params, handler: route.handler };
    }
  }
  return null;
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

async function handleFiles(req: VercelRequest, res: VercelResponse, { folder }: Record<string, string>) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

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

async function handleDownload(req: VercelRequest, res: VercelResponse, { fileId }: Record<string, string>) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

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

async function handleBulkDownload(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
        archive.append(stream, { name: `${fileId}`, mode: 0o400 });
      } catch (error) {
        console.error(`Error adding file ${fileId} to archive:`, error);
      }
    }

    archive.finalize();
  } catch (error) {
    console.error('Error creating bulk download archive:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create archive' });
    }
  }
}

const ROUTES: RouteHandler[] = [
  { pattern: /^\/api\/files\/([a-zA-Z0-9_-]+)\/?$/, paramNames: ['folder'], handler: handleFiles },
  { pattern: /^\/api\/download\/([a-zA-Z0-9_-]{20,50})\/?$/, paramNames: ['fileId'], handler: handleDownload },
  { pattern: /^\/api\/download\/bulk\/?$/, paramNames: [], handler: handleBulkDownload as RouteHandler['handler'] },
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const url = req.url || '';

  console.log('Request:', req.method, url);

  setSecurityHeaders(res);

  const routeMatch = matchRoute(url, ROUTES);
  if (routeMatch) {
    await routeMatch.handler(req, res, routeMatch.params);
    return;
  }

  res.status(404).json({ success: false, error: 'Not found' });
}
