import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listFilesFromFolder, getFileMetadata, getDownloadUrl, type FileMetadata } from '../services/driveService.js';
import { isValidDriveFileId, setSecurityHeaders, setCorsHeaders } from '../utils/security.js';

/**
 * Get folder ID from environment variables
 * This is a function to allow test mocking
 */
function getFolderIds(): Record<string, string> {
  return {
    canon: process.env.FOLDER_CANON || '',
    dji: process.env.FOLDER_DJI || '',
    ipong: process.env.FOLDER_IPONG || '',
    sony: process.env.FOLDER_SONY || '',
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data?: {
    items: T;
    nextPageToken?: string;
  };
  error?: string;
}

/**
 * Lists files from a folder
 */
async function listFolderFiles(
  folder: string,
  pageToken?: string,
  pageSize: number = 100
): Promise<PaginatedResponse<FileMetadata[]>> {
  const folderIds = getFolderIds();
  const folderId = folderIds[folder];
  if (!folderId) {
    return {
      success: false,
      error: `Folder ID not configured for: ${folder}`,
    };
  }

  try {
    const size = Math.min(Math.max(pageSize, 1), 1000);
    const result = await listFilesFromFolder(folderId, pageToken, size);

    return {
      success: true,
      data: {
        items: result.files,
        nextPageToken: result.nextPageToken,
      },
    };
  } catch (error) {
    console.error('Error listing files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files',
    };
  }
}

/**
 * Gets a single file's metadata
 */
async function fetchFile(fileId: string): Promise<ApiResponse<FileMetadata & { downloadUrl?: string }>> {
  try {
    const file = await getFileMetadata(fileId);

    if (!file) {
      return {
        success: false,
        error: 'File not found',
      };
    }

    const downloadUrl = getDownloadUrl(file);

    return {
      success: true,
      data: {
        ...file,
        downloadUrl: downloadUrl || undefined,
      },
    };
  } catch (error) {
    console.error('Error getting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file',
    };
  }
}

/**
 * GET /api/files/:folder
 * List files in a Google Drive folder
 * Query params:
 *   - pageToken: optional pagination token
 *   - pageSize: optional page size (default: 100, max: 1000)
 */
export async function getFilesHandler(
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

  // Extract folder from URL path
  const urlParts = req.url?.split('/') || [];
  const folderIndex = urlParts.findIndex(p => p === 'files');
  const folder = folderIndex >= 0 && urlParts.length > folderIndex + 1
    ? urlParts[folderIndex + 1]
    : undefined;

  if (!folder || !(folder in getFolderIds())) {
    res.status(400).json({
      success: false,
      error: `Invalid folder. Valid folders: ${Object.keys(getFolderIds()).join(', ')}`,
    });
    return;
  }

  const { pageToken, pageSize } = req.query;
  const size = pageSize ? parseInt(pageSize as string, 10) : 100;

  const result = await listFolderFiles(
    folder,
    pageToken as string | undefined,
    size
  );

  if (!result.success) {
    res.status(500).json(result);
    return;
  }

  res.status(200).json(result);
}

/**
 * GET /api/file/:fileId
 * Get file metadata and download URL
 */
export async function getFileHandler(
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
  const fileIndex = urlParts.findIndex(p => p === 'file');
  const fileId = fileIndex >= 0 && urlParts.length > fileIndex + 1
    ? urlParts[fileIndex + 1]
    : undefined;

  // Validate file ID format
  if (!fileId || !isValidDriveFileId(fileId)) {
    res.status(400).json({ success: false, error: 'Invalid file ID format' });
    return;
  }

  const result = await fetchFile(fileId);

  if (!result.success) {
    res.status(result.error === 'File not found' ? 404 : 500).json(result);
    return;
  }

  res.status(200).json(result);
}
