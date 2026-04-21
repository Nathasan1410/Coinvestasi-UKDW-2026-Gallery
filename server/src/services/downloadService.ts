import { drive } from '@googleapis/drive';
import JSZip from 'jszip';
import { sanitizeFileName, isFileExtensionAllowed } from '../utils/security.js';

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;

if (!DRIVE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

const driveClient = drive({
  version: 'v3',
  auth: DRIVE_API_KEY,
});

export interface DownloadResponse {
  success: boolean;
  error?: string;
}

/**
 * Gets a file from Google Drive and returns it as a stream
 * Used for single file downloads with streaming to avoid buffering
 */
export async function getFileStream(fileId: string) {
  try {
    const response = await driveClient.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
      }
    );

    return {
      success: true,
      stream: response.data as NodeJS.ReadableStream,
      mimeType: response.headers['content-type'] || 'application/octet-stream',
      fileName: response.headers['content-disposition']
        ? extractFileNameFromDisposition(response.headers['content-disposition'])
        : fileId,
    };
  } catch (error) {
    console.error('Error getting file stream:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download file',
    };
  }
}

/**
 * Gets file metadata for naming purposes
 */
export async function getFileMetadata(fileId: string): Promise<{
  success: boolean;
  name?: string;
  mimeType?: string;
  error?: string;
}> {
  try {
    const response = await driveClient.files.get({
      fileId,
      fields: 'name, mimeType',
    });

    return {
      success: true,
      name: response.data.name || fileId,
      mimeType: response.data.mimeType || 'application/octet-stream',
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file metadata',
    };
  }
}

/**
 * Downloads multiple files and creates a zip archive
 * Streams the zip directly to the response without buffering
 */
export async function createZipStream(fileIds: string[]) {
  const zip = new JSZip();

  try {
    // Fetch all files in parallel and add to zip
    const filePromises = fileIds.map(async (fileId) => {
      try {
        const response = await driveClient.files.get(
          {
            fileId,
            alt: 'media',
          },
          {
            responseType: 'arraybuffer',
          }
        );

        const metadata = await getFileMetadata(fileId);
        const fileName = metadata.success && metadata.name ? metadata.name : fileId;

        // Sanitize filename to prevent zip slip and path traversal
        const safeFileName = sanitizeFileName(fileName);

        // Skip blocked file extensions
        if (!isFileExtensionAllowed(safeFileName)) {
          console.warn(`Skipping blocked file extension: ${safeFileName}`);
          return;
        }

        zip.file(safeFileName, response.data as ArrayBuffer);
      } catch (error) {
        console.error(`Error downloading file ${fileId}:`, error);
        // Skip this file and continue
      }
    });

    await Promise.all(filePromises);

    // Check if any files were added
    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      return {
        success: false,
        error: 'No files could be downloaded',
      };
    }

    // Generate the zip as a stream
    const zipStream = await zip.generateNodeStream({
      streamFiles: true,
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

    return {
      success: true,
      stream: zipStream,
      fileCount,
    };
  } catch (error) {
    console.error('Error creating zip:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create zip archive',
    };
  }
}

/**
 * Extracts filename from Content-Disposition header
 */
function extractFileNameFromDisposition(disposition: string): string {
  const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
  const matches = filenameRegex.exec(disposition);
  if (matches && matches[1]) {
    return matches[1].replace(/['"]/g, '');
  }
  return 'download';
}

/**
 * Validates that file IDs are provided and is an array
 */
export function validateDownloadRequest(body: unknown): {
  valid: boolean;
  fileIds?: string[];
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const { fileIds } = body as Record<string, unknown>;

  if (!fileIds || !Array.isArray(fileIds)) {
    return { valid: false, error: 'fileIds array is required' };
  }

  if (fileIds.length === 0) {
    return { valid: false, error: 'fileIds array cannot be empty' };
  }

  if (!fileIds.every((id) => typeof id === 'string' && id.trim() !== '')) {
    return { valid: false, error: 'All file IDs must be non-empty strings' };
  }

  return { valid: true, fileIds: fileIds as string[] };
}
