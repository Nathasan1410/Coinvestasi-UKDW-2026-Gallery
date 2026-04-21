import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFilesHandler, getFileHandler } from '../server/src/routes/files.js';
import { downloadSingleFileHandler, downloadBulkHandler } from '../server/src/routes/download.js';

/**
 * Vercel Serverless Function Entry Point
 *
 * Routes:
 * - GET /api/files/:folder - List files in a folder
 * - GET /api/file/:fileId - Get file metadata and download URL
 * - GET /api/download/:fileId - Download a single file (streamed)
 * - POST /api/download/bulk - Download multiple files as zip
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const url = req.url || '';

  // Route: /api/files/:folder
  if (url.includes('/api/files/')) {
    return getFilesHandler(req, res);
  }

  // Route: /api/file/:fileId
  if (url.includes('/api/file/')) {
    return getFileHandler(req, res);
  }

  // Route: /api/download/:fileId (single file download)
  if (url.includes('/api/download/') && !url.includes('/api/download/bulk')) {
    return downloadSingleFileHandler(req, res);
  }

  // Route: /api/download/bulk (bulk download as zip)
  if (url.includes('/api/download/bulk')) {
    return downloadBulkHandler(req, res);
  }

  res.status(404).json({ success: false, error: 'Not found' });
}
