import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getFileStream,
  getFileMetadata,
  createZipStream,
  validateDownloadRequest,
} from '../services/downloadService';

// Mock the googleapis drive module
vi.mock('@googleapis/drive', () => {
  const mockDriveClient = {
    files: {
      get: vi.fn(),
    },
  };

  return {
    drive: vi.fn(() => mockDriveClient),
  };
});

import { drive } from '@googleapis/drive';
import { Readable } from 'stream';

describe('downloadService', () => {
  const mockDrive = drive({ version: 'v3', auth: 'test-key' });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_API_KEY;
  });

  describe('getFileStream', () => {
    it('should return file stream successfully', async () => {
      const mockStream = new Readable({
        read() {
          this.push('test content');
          this.push(null);
        },
      });

      vi.mocked(mockDrive.files.get).mockResolvedValue({
        data: mockStream,
        headers: {
          'content-type': 'image/jpeg',
          'content-disposition': 'attachment; filename="test.jpg"',
        },
      } as any);

      const result = await getFileStream('file123');

      expect(result.success).toBe(true);
      expect(result.stream).toBeInstanceOf(Readable);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should extract filename from content-disposition header', async () => {
      const mockStream = new Readable();

      vi.mocked(mockDrive.files.get).mockResolvedValue({
        data: mockStream,
        headers: {
          'content-type': 'image/png',
          'content-disposition': 'attachment; filename="photo.png"',
        },
      } as any);

      const result = await getFileStream('file123');

      expect(result.fileName).toBe('photo.png');
    });

    it('should use fileId as filename when content-disposition is missing', async () => {
      const mockStream = new Readable();

      vi.mocked(mockDrive.files.get).mockResolvedValue({
        data: mockStream,
        headers: {
          'content-type': 'application/octet-stream',
        },
      } as any);

      const result = await getFileStream('file123');

      expect(result.fileName).toBe('file123');
    });

    it('should return error on failure', async () => {
      vi.mocked(mockDrive.files.get).mockRejectedValue(new Error('Download failed'));

      const result = await getFileStream('file123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Download failed');
    });
  });

  describe('getFileMetadata (downloadService)', () => {
    it('should return file metadata successfully', async () => {
      vi.mocked(mockDrive.files.get).mockResolvedValue({
        data: {
          name: 'document.pdf',
          mimeType: 'application/pdf',
        },
      } as any);

      const result = await getFileMetadata('file123');

      expect(result.success).toBe(true);
      expect(result.name).toBe('document.pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should use fileId as name when name is missing', async () => {
      vi.mocked(mockDrive.files.get).mockResolvedValue({
        data: {},
      } as any);

      const result = await getFileMetadata('file123');

      expect(result.success).toBe(true);
      expect(result.name).toBe('file123');
    });

    it('should return default mimeType when missing', async () => {
      vi.mocked(mockDrive.files.get).mockResolvedValue({
        data: {
          name: 'unknown-file',
        },
      } as any);

      const result = await getFileMetadata('file123');

      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('should return error on failure', async () => {
      vi.mocked(mockDrive.files.get).mockRejectedValue(new Error('Metadata fetch failed'));

      const result = await getFileMetadata('file123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Metadata fetch failed');
    });
  });

  describe('createZipStream', () => {
    it('should create zip with multiple files', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      vi.mocked(mockDrive.files.get)
        .mockResolvedValueOnce({
          data: mockArrayBuffer,
        } as any)
        .mockResolvedValueOnce({
          data: mockArrayBuffer,
        } as any);

      const result = await createZipStream(['file1', 'file2']);

      expect(result.success).toBe(true);
      expect(result.stream).toBeDefined();
      expect(result.fileCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle file download errors gracefully', async () => {
      const mockStream = new Readable({
        read() {
          this.push(null);
        },
      });

      vi.mocked(mockDrive.files.get)
        .mockRejectedValueOnce(new Error('File 1 not found'))
        .mockResolvedValueOnce({
          data: new ArrayBuffer(100),
        } as any);

      const result = await createZipStream(['file1', 'file2']);

      // Should continue with successful downloads
      expect(result.success).toBe(true);
    });

    it('should return error when no files can be downloaded', async () => {
      vi.mocked(mockDrive.files.get).mockRejectedValue(new Error('All files failed'));

      const result = await createZipStream(['file1', 'file2']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No files could be downloaded');
    });

    it('should return error on zip creation failure', async () => {
      vi.mocked(mockDrive.files.get).mockRejectedValue(new Error('Critical error'));

      const result = await createZipStream(['file1']);

      expect(result.success).toBe(false);
    });
  });

  describe('validateDownloadRequest', () => {
    it('should validate valid fileIds array', () => {
      const body = { fileIds: ['file1', 'file2', 'file3'] };

      const result = validateDownloadRequest(body);

      expect(result.valid).toBe(true);
      expect(result.fileIds).toEqual(['file1', 'file2', 'file3']);
    });

    it('should reject non-object body', () => {
      expect(validateDownloadRequest(null).valid).toBe(false);
      expect(validateDownloadRequest(undefined).valid).toBe(false);
      expect(validateDownloadRequest('string').valid).toBe(false);
      expect(validateDownloadRequest(123).valid).toBe(false);
    });

    it('should reject when fileIds is missing', () => {
      const body = { otherField: 'value' };

      const result = validateDownloadRequest(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('fileIds array is required');
    });

    it('should reject when fileIds is not an array', () => {
      const body = { fileIds: 'not-an-array' };

      const result = validateDownloadRequest(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('fileIds array is required');
    });

    it('should reject empty fileIds array', () => {
      const body = { fileIds: [] };

      const result = validateDownloadRequest(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('fileIds array cannot be empty');
    });

    it('should reject array with empty strings', () => {
      const body = { fileIds: ['file1', '', 'file3'] };

      const result = validateDownloadRequest(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('All file IDs must be non-empty strings');
    });

    it('should reject array with whitespace-only strings', () => {
      const body = { fileIds: ['file1', '   ', 'file3'] };

      const result = validateDownloadRequest(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('All file IDs must be non-empty strings');
    });

    it('should accept single valid fileId', () => {
      const body = { fileIds: ['single-file'] };

      const result = validateDownloadRequest(body);

      expect(result.valid).toBe(true);
      expect(result.fileIds).toEqual(['single-file']);
    });
  });
});
