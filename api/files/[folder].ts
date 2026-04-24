import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drive } from '@googleapis/drive';

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;
if (!DRIVE_API_KEY) throw new Error('GOOGLE_API_KEY environment variable is required');

const driveClient = drive({ version: 'v3', auth: DRIVE_API_KEY });

const FOLDER_IDS: Record<string, string> = {
  canon: process.env.FOLDER_CANON || '',
  dji: process.env.FOLDER_DJI || '',
  ipong: process.env.FOLDER_IPONG || '',
  sony: process.env.FOLDER_SONY || '',
};

// Simple in-memory cache
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function listFilesFromFolder(
  folderId: string,
  pageSize: number,
  pageToken?: string
) {
  const cacheKey = `${folderId}-${pageSize}-${pageToken || 'start'}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  const response = await driveClient.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize,
    pageToken,
    fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size, imageMediaMetadata(width, height), videoMediaMetadata(width, height, durationMillis), createdTime)',
    orderBy: 'name asc',
  });

  const result = {
    files: (response.data.files || []).filter(f => f.id && f.name && f.mimeType).map(f => ({
      ...f,
      // Extract width/height from metadata if available
      width: f.imageMediaMetadata?.width || f.videoMediaMetadata?.width,
      height: f.imageMediaMetadata?.height || f.videoMediaMetadata?.height,
      duration: f.videoMediaMetadata?.durationMillis,
    })),
    nextPageToken: response.data.nextPageToken || undefined,
  };

  cache[cacheKey] = { data: result, timestamp: now };
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { folder, pageSize: pageSizeStr, pageToken } = req.query;

  if (!folder || typeof folder !== 'string' || !(folder in FOLDER_IDS)) {
    res.status(400).json({ success: false, error: `Invalid folder. Valid: ${Object.keys(FOLDER_IDS).join(', ')}` });
    return;
  }

  const folderId = FOLDER_IDS[folder];
  if (!folderId) {
    res.status(500).json({ success: false, error: `Folder ID not configured for: ${folder}` });
    return;
  }

  const pageSize = Math.min(Math.max(parseInt(pageSizeStr as string, 10) || 50, 1), 100);

  try {
    const { files, nextPageToken } = await listFilesFromFolder(folderId, pageSize, pageToken as string | undefined);
    res.status(200).json({ success: true, data: { items: files, nextPageToken } });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to list files' });
  }
}