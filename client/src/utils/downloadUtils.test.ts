import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  triggerDownload,
  downloadFile,
  getSingleDownloadUrl,
  formatFileSize,
  copyImageUrl,
} from '../utils/downloadUtils';

describe('downloadUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('triggerDownload', () => {
    it('should create a link and trigger download', async () => {
      const url = 'https://example.com/file.jpg';
      const filename = 'test.jpg';

      const createElementSpy = vi.spyOn(document, 'createElement');

      await triggerDownload(url, filename);

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should set download attribute when filename provided', async () => {
      const url = 'https://example.com/file.jpg';
      const filename = 'custom-name.jpg';

      const createElementSpy = vi.spyOn(document, 'createElement');

      await triggerDownload(url, filename);

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should work without filename', async () => {
      const url = 'https://example.com/file.jpg';

      await triggerDownload(url);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should download file successfully', async () => {
      const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        status: 200,
        statusText: 'OK',
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as unknown as Response);

      const url = 'https://example.com/file.jpg';
      const filename = 'test.jpg';

      await downloadFile(url, filename);

      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(mockResponse.blob).toHaveBeenCalled();
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as unknown as Response);

      const url = 'https://example.com/nonexistent.jpg';
      const filename = 'test.jpg';

      await expect(downloadFile(url, filename)).rejects.toThrow('Failed to download file');
    });
  });

  describe('getSingleDownloadUrl', () => {
    it('should return correct download URL for a file ID', () => {
      const fileId = 'abc123xyz';
      const expectedUrl = '/api/download/abc123xyz';

      expect(getSingleDownloadUrl(fileId)).toBe(expectedUrl);
    });

    it('should handle different file ID formats', () => {
      expect(getSingleDownloadUrl('file-001')).toBe('/api/download/file-001');
      expect(getSingleDownloadUrl('复杂 ID')).toBe('/api/download/复杂 ID');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(10240)).toBe('10.0 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
      expect(formatFileSize(10485760)).toBe('10.0 MB');
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1)).toBe('1 B');
    });
  });

  describe('copyImageUrl', () => {
    it('should copy URL to clipboard', async () => {
      const url = 'https://example.com/image.jpg';
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      navigator.clipboard.writeText = mockWriteText;

      await copyImageUrl(url);

      expect(mockWriteText).toHaveBeenCalledWith(url);
    });

    it('should throw error when clipboard access fails', async () => {
      const url = 'https://example.com/image.jpg';
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard access denied'));
      navigator.clipboard.writeText = mockWriteText;

      await expect(copyImageUrl(url)).rejects.toThrow('Failed to copy URL to clipboard');
    });
  });
});
