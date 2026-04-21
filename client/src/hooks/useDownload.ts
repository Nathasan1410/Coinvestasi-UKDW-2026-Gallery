import { useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  downloadBulkAsZip,
  getSingleDownloadUrl,
  copyImageUrl,
} from '../utils/downloadUtils';

export interface UseDownloadResult {
  /**
   * Download a single file by ID
   */
  downloadSingle: (fileId: string, filename?: string) => Promise<void>;
  /**
   * Download multiple files as a zip archive
   */
  downloadBulk: (fileIds: string[]) => Promise<void>;
  /**
   * Copy image URL to clipboard
   */
  copyImageUrlToClipboard: (url: string) => Promise<void>;
  /**
   * Get direct download link for a file (opens in new tab)
   */
  getDirectDownloadLink: (fileId: string) => string;
}

/**
 * Custom hook for download functionality
 * Provides single file download, bulk download, and clipboard utilities
 */
export function useDownload(): UseDownloadResult {
  const downloadSingle = useCallback(async (fileId: string, filename?: string) => {
    const toastId = toast.loading('Preparing download...');

    try {
      // For single file download, we can use a direct link approach
      // since the backend streams the file
      const downloadUrl = getSingleDownloadUrl(fileId);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      if (filename) {
        link.download = filename;
      }
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started!', { id: toastId });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed. Please try again.', { id: toastId });
      throw error;
    }
  }, []);

  const downloadBulk = useCallback(async (fileIds: string[]) => {
    if (fileIds.length === 0) {
      toast.error('No files selected');
      return;
    }

    const toastId = toast.loading(`Preparing ${fileIds.length} file(s) for download...`);

    try {
      await downloadBulkAsZip(fileIds);
      toast.success(`Downloaded ${fileIds.length} file(s) as zip!`, { id: toastId });
    } catch (error) {
      console.error('Bulk download failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to download files',
        { id: toastId }
      );
      throw error;
    }
  }, []);

  const copyImageUrlToClipboard = useCallback(async (url: string) => {
    try {
      await copyImageUrl(url);
      toast.success('Image URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error('Failed to copy URL to clipboard');
      throw error;
    }
  }, []);

  const getDirectDownloadLink = useCallback((fileId: string) => {
    return getSingleDownloadUrl(fileId);
  }, []);

  return {
    downloadSingle,
    downloadBulk,
    copyImageUrlToClipboard,
    getDirectDownloadLink,
  };
}
