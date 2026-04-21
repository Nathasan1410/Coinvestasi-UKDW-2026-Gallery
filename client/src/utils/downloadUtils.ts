/**
 * Download utility functions
 */

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Triggers a download of a file from a URL
 * Returns a promise that resolves when the download starts
 */
export async function triggerDownload(url: string, filename?: string): Promise<void> {
  const link = document.createElement('a');
  link.href = url;

  if (filename) {
    link.download = filename;
  }

  // Required for Firefox to trigger download
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a file by fetching it first (for cross-origin URLs)
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Downloads multiple files as a zip archive
 * Returns the blob for further processing if needed
 */
export async function downloadBulkAsZip(fileIds: string[]): Promise<Blob> {
  const response = await fetch('/api/download/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to download files' }));
    throw new Error(errorData.error || 'Failed to download files');
  }

  const blob = await response.blob();

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `download-${timestamp}.zip`;

  // Trigger the download
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  window.URL.revokeObjectURL(blobUrl);

  return blob;
}

/**
 * Gets the direct download URL for a single file
 */
export function getSingleDownloadUrl(fileId: string): string {
  return `/api/download/${fileId}`;
}

/**
 * Copies an image URL to the clipboard
 */
export async function copyImageUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    console.error('Failed to copy URL:', error);
    throw new Error('Failed to copy URL to clipboard');
  }
}

/**
 * Copies an image to the clipboard (if CORS allows)
 */
export async function copyImageToClipboard(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
  } catch (error) {
    console.error('Failed to copy image:', error);
    throw new Error('Failed to copy image to clipboard');
  }
}

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
