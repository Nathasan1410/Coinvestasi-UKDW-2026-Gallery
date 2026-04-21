import { drive } from '@googleapis/drive';

const DRIVE_API_KEY = process.env.GOOGLE_API_KEY;

if (!DRIVE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

// Create authenticated drive client
const driveClient = drive({
  version: 'v3',
  auth: DRIVE_API_KEY,
});

export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  webContentLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface ListFilesResponse {
  files: FileMetadata[];
  nextPageToken?: string;
}

/**
 * Converts a Drive API file response to our FileMetadata type
 */
function toFileMetadata(file: {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  thumbnailLink?: string | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  size?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
}): FileMetadata | null {
  if (!file.id || !file.name || !file.mimeType) {
    return null;
  }

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    thumbnailLink: file.thumbnailLink ?? undefined,
    webViewLink: file.webViewLink ?? '',
    webContentLink: file.webContentLink ?? undefined,
    size: file.size ?? undefined,
    createdTime: file.createdTime ?? undefined,
    modifiedTime: file.modifiedTime ?? undefined,
  };
}

/**
 * Lists files from a Google Drive folder with pagination support
 */
export async function listFilesFromFolder(
  folderId: string,
  pageToken?: string,
  pageSize: number = 100
): Promise<ListFilesResponse> {
  const response = await driveClient.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize,
    pageToken,
    fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size, createdTime, modifiedTime)',
    orderBy: 'name asc',
  });

  const files: FileMetadata[] = (response.data.files || [])
    .map(toFileMetadata)
    .filter((f): f is FileMetadata => f !== null);

  return {
    files,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * Gets metadata for a single file
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  try {
    const response = await driveClient.files.get({
      fileId,
      fields: 'id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size, createdTime, modifiedTime',
    });

    return toFileMetadata(response.data);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Gets the download URL for a file
 * For Google Docs/Sheets/Slides, returns the export URL
 * For other files, returns the webContentLink or constructs a download URL
 */
export function getDownloadUrl(file: FileMetadata): string | null {
  // For Google Workspace files, use webViewLink (opens in browser)
  if (file.mimeType.startsWith('application/vnd.google-apps')) {
    return file.webViewLink;
  }

  // For regular files, construct direct download URL
  // webContentLink may require additional auth, so we use the export pattern
  return `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${DRIVE_API_KEY}`;
}

/**
 * Determines if a file is an image based on MIME type
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Determines if a file is a video based on MIME type
 */
export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}
