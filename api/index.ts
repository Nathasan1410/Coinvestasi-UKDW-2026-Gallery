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
  // Vercel rewrites strip /api prefix, so we check the raw URL path
  // req.url in Vercel serverless contains the full path including /api
  const url = req.url || '';

  // Debug log for troubleshooting
  console.log('Request URL:', url);
  console.log('Request method:', req.method);

  // Route: /api/files/:folder or /files/:folder (after rewrite)
  if (url.includes('/files/') || url.includes('/api/files/')) {
    return getFilesHandler(req, res);
  }

  // Route: /api/file/:fileId or /file/:fileId
  if (url.includes('/file/') || url.includes('/api/file/')) {
    return getFileHandler(req, res);
  }

  // Route: /api/download/bulk or /download/bulk (must check before single download)
  if (url.includes('/download/bulk') || url.includes('/api/download/bulk')) {
    return downloadBulkHandler(req, res);
  }

  // Route: /api/download/:fileId or /download/:fileId (single file download)
  if (url.includes('/download/') || url.includes('/api/download/')) {
    return downloadSingleFileHandler(req, res);
  }

  res.status(404).json({ success: false, error: 'Not found' });
}
