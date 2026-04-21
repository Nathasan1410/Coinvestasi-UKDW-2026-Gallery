import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getFileStream,
  createZipStream,
  getFileMetadata,
  validateDownloadRequest,
} from '../services/downloadService.js';
import {
  isValidDriveFileId,
  setSecurityHeaders,
  setCorsHeaders,
  MAX_FILE_IDS_PER_REQUEST,
  getUserFriendlyError,
} from '../utils/security.js';

/**
 * GET /api/download/:fileId
 * Download a single file directly from Google Drive
 * Streams the file to avoid buffering in serverless memory
 */
export async function downloadSingleFileHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set security and CORS headers
  setSecurityHeaders(res);
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Extract fileId from URL path
  const urlParts = req.url?.split('/') || [];
  const downloadIndex = urlParts.findIndex((p) => p === 'download');
  const fileId = downloadIndex >= 0 && urlParts.length > downloadIndex + 1
    ? urlParts[downloadIndex + 1]
    : undefined;

  // Validate file ID format
  if (!fileId || !isValidDriveFileId(fileId)) {
    res.status(400).json({ success: false, error: 'Invalid file ID format' });
    return;
  }

  try {
    // Get file metadata first for proper filename
    const metadataResult = await getFileMetadata(fileId);

    if (!metadataResult.success) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    // Get the file stream
    const streamResult = await getFileStream(fileId);

    if (!streamResult.success) {
      res.status(500).json({ success: false, error: streamResult.error });
      return;
    }

    // Set headers for file download
    res.setHeader('Content-Type', streamResult.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(metadataResult.name || fileId)}"`
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Stream the file directly to the response
    streamResult.stream!.pipe(res);

    // Handle stream errors
    streamResult.stream!.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream file' });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: getUserFriendlyError(error),
    });
  }
}

/**
 * POST /api/download/bulk
 * Download multiple files as a zip archive
 * Request body: { fileIds: string[] }
 * Streams the zip to avoid buffering in serverless memory
 */
export async function downloadBulkHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set security and CORS headers
  setSecurityHeaders(res);
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Validate request body
  const validation = validateDownloadRequest(req.body);

  if (!validation.valid) {
    res.status(400).json({ success: false, error: validation.error });
    return;
  }

  const fileIds = validation.fileIds!;

  // Enforce maximum file IDs per request (rate limiting)
  if (fileIds.length > MAX_FILE_IDS_PER_REQUEST) {
    res.status(400).json({
      success: false,
      error: `Maximum ${MAX_FILE_IDS_PER_REQUEST} files allowed per bulk download`,
    });
    return;
  }

  // Validate each file ID format
  for (const fileId of fileIds) {
    if (!isValidDriveFileId(fileId)) {
      res.status(400).json({ success: false, error: `Invalid file ID format: ${fileId}` });
      return;
    }
  }

  try {
    // Create zip stream
    const zipResult = await createZipStream(fileIds);

    if (!zipResult.success) {
      res.status(500).json({ success: false, error: zipResult.error });
      return;
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `download-${timestamp}.zip`;

    // Set headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.setHeader(
      'X-Zip-File-Count',
      zipResult.fileCount!.toString()
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Zip-File-Count');

    // Stream the zip directly to the response
    zipResult.stream!.pipe(res);

    // Handle stream errors
    zipResult.stream!.on('error', (error) => {
      console.error('Zip stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to create zip archive' });
      }
    });
  } catch (error) {
    console.error('Error creating bulk download:', error);
    res.status(500).json({
      success: false,
      error: getUserFriendlyError(error),
    });
  }
}
