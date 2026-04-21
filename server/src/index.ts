import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFilesHandler, getFileHandler } from './routes/files.js';
import { downloadSingleFileHandler, downloadBulkHandler } from './routes/download.js';

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
  const { pathname } = new URL(req.url || '', 'http://localhost');

  // Route: /api/files/:folder
  if (pathname?.startsWith('/api/files/')) {
    return getFilesHandler(req, res);
  }

  // Route: /api/file/:fileId
  if (pathname?.startsWith('/api/file/')) {
    return getFileHandler(req, res);
  }

  // Route: /api/download/:fileId (single file download)
  if (pathname?.startsWith('/api/download/') && !pathname?.startsWith('/api/download/bulk')) {
    return downloadSingleFileHandler(req, res);
  }

  // Route: /api/download/bulk (bulk download as zip)
  if (pathname?.startsWith('/api/download/bulk')) {
    return downloadBulkHandler(req, res);
  }

  res.status(404).json({ success: false, error: 'Not found' });
}
