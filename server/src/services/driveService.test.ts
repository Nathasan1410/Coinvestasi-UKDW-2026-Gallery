import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listFilesFromFolder,
  getFileMetadata,
  getDownloadUrl,
  isImage,
  isVideo,
  type FileMetadata,
} from '../services/driveService';

// Mock the googleapis drive module
vi.mock('@googleapis/drive', () => {
  const mockDriveClient = {
    files: {
      list: vi.fn(),
      get: vi.fn(),
    },
  };

  return {
    drive: vi.fn(() => mockDriveClient),
  };
});

import { drive } from '@googleapis/drive';

describe('driveService', () => {
  const mockDrive = drive({ version: 'v3', auth: 'test-key' });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_API_KEY;
  });

  describe('listFilesFromFolder', () => {
    it('should list files from a folder', async () => {
      const mockFiles = [
        {
          id: 'file1',
          name: 'photo1.jpg',
          mimeType: 'image/jpeg',
          thumbnailLink: 'https://example.com/thumb1.jpg',
          webViewLink: 'https://drive.google.com/file1',
          size: '1024000',
          createdTime: '2024-01-01T00:00:00Z',
          modifiedTime: '2024-01-02T00:00:00Z',
        },
        {
          id: 'file2',
          name: 'photo2.png',
          mimeType: 'image/png',
          thumbnailLink: 'https://example.com/thumb2.jpg',
          webViewLink: 'https://drive.google.com/file2',
          size: '2048000',
          createdTime: '2024-01-03T00:00:00Z',
          modifiedTime: '2024-01-04T00:00:00Z',
        },
      ];

      vi.mocked(mockDrive.files.list).mockResolvedValue({
        data: {
          files: mockFiles,
          nextPageToken: 'token123',
        },
      } as any);

      const result = await listFilesFromFolder('folder123');

      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "'folder123' in parents and trashed = false",
        pageSize: 100,
        pageToken: undefined,
        fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size, createdTime, modifiedTime)',
        orderBy: 'name asc',
      });

      expect(result.files).toHaveLength(2);
      expect(result.files[0].id).toBe('file1');
      expect(result.files[1].id).toBe('file2');
      expect(result.nextPageToken).toBe('token123');
    });

    it('should handle pagination with pageToken', async () => {
      vi.mocked(mockDrive.files.list).mockResolvedValue({
        data: {
          files: [{ id: 'file3', name: 'photo3.jpg', mimeType: 'image/jpeg' }],
          nextPageToken: 'token456',
        },
      } as any);

      const result = await listFilesFromFolder('folder123', 'token123', 50);

      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "'folder123' in parents and trashed = false",
        pageSize: 50,
        pageToken: 'token123',
        fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size, createdTime, modifiedTime)',
        orderBy: 'name asc',
      });

      expect(result.files).toHaveLength(1);
      expect(result.nextPageToken).toBe('token456');
    });

    it('should return empty nextPageToken when not provided by API', async () => {
      vi.mocked(mockDrive.files.list).mockResolvedValue({
        data: {
          files: [],
        },
      } as any);

      const result = await listFilesFromFolder('folder123');

      expect(result.nextPageToken).toBeUndefined();
    });

    it('should filter out invalid file entries', async () => {
      vi.mocked(mockDrive.files.list).mockResolvedValue({
        data: {
          files: [
            { id: 'valid1', name: 'photo.jpg', mimeType: 'image/jpeg' },
            { id: null, name: 'invalid', mimeType: 'image/jpeg' },
            { name: 'no-id', mimeType: 'image/jpeg' },
            { id: 'valid2', mimeType: 'image/png' }, // missing name
          ],
        },
      } as any);

      const result = await listFilesFromFolder('folder123');

      expect(result.files).toHaveLength(1);
      expect(result.files[0].id).toBe('valid1');
    });

    it('should handle optional fields correctly', async () => {
      vi.mocked(mockDrive.files.list).mockResolvedValue({
        data: {
          files: [
            {
              id: 'file1',
              name: 'photo.jpg',
              mimeType: 'image/jpeg',
              // No thumbnailLink, webContentLink, size, etc.
            },
          ],
        },
      } as any);

      const result = await listFilesFromFolder('folder123');

      expect(result.files[0].thumbnailLink).toBeUndefined();
      expect(result.files[0].webContentLink).toBeUndefined();
      expect(result.files[0].size).toBeUndefined();
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata for valid file ID', async () => {
      const mockFile = {
        id: 'file123',
        name: 'document.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'https://drive.google.com/file123',
        size: '512000',
      };

      vi.mocked(mockDrive.files.get).mockResolvedValue({
        data: mockFile,
      } as any);

      const result = await getFileMetadata('file123');

      expect(result).toBeTruthy();
      expect(result!.id).toBe('file123');
      expect(result!.name).toBe('document.pdf');
      expect(result!.mimeType).toBe('application/pdf');
    });

    it('should return null for 404 errors', async () => {
      const error = new Error('File not found') as any;
      error.code = 404;
      vi.mocked(mockDrive.files.get).mockRejectedValue(error);

      const result = await getFileMetadata('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const error = new Error('API rate limit exceeded') as any;
      error.code = 429;
      vi.mocked(mockDrive.files.get).mockRejectedValue(error);

      await expect(getFileMetadata('file123')).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return webViewLink for Google Docs', () => {
      const file: FileMetadata = {
        id: 'doc123',
        name: 'Document',
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: 'https://docs.google.com/document/d/doc123',
      };

      const result = getDownloadUrl(file);

      expect(result).toBe('https://docs.google.com/document/d/doc123');
    });

    it('should return webViewLink for Google Sheets', () => {
      const file: FileMetadata = {
        id: 'sheet123',
        name: 'Spreadsheet',
        mimeType: 'application/vnd.google-apps.spreadsheet',
        webViewLink: 'https://docs.google.com/spreadsheets/d/sheet123',
      };

      const result = getDownloadUrl(file);

      expect(result).toBe('https://docs.google.com/spreadsheets/d/sheet123');
    });

    it('should return webViewLink for Google Slides', () => {
      const file: FileMetadata = {
        id: 'slide123',
        name: 'Presentation',
        mimeType: 'application/vnd.google-apps.presentation',
        webViewLink: 'https://docs.google.com/presentation/d/slide123',
      };

      const result = getDownloadUrl(file);

      expect(result).toBe('https://docs.google.com/presentation/d/slide123');
    });

    it('should return API download URL for regular files', () => {
      const file: FileMetadata = {
        id: 'file123',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        webViewLink: 'https://drive.google.com/file123',
      };

      const result = getDownloadUrl(file);

      expect(result).toContain('https://www.googleapis.com/drive/v3/files/file123?alt=media&key=');
    });

    it('should return null for files without webViewLink (Google Workspace)', () => {
      const file: FileMetadata = {
        id: 'doc123',
        name: 'Document',
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: '',
      };

      const result = getDownloadUrl(file);

      expect(result).toBe('');
    });
  });

  describe('isImage', () => {
    it('should return true for image MIME types', () => {
      expect(isImage('image/jpeg')).toBe(true);
      expect(isImage('image/png')).toBe(true);
      expect(isImage('image/gif')).toBe(true);
      expect(isImage('image/webp')).toBe(true);
    });

    it('should return false for non-image MIME types', () => {
      expect(isImage('video/mp4')).toBe(false);
      expect(isImage('application/pdf')).toBe(false);
      expect(isImage('text/plain')).toBe(false);
    });
  });

  describe('isVideo', () => {
    it('should return true for video MIME types', () => {
      expect(isVideo('video/mp4')).toBe(true);
      expect(isVideo('video/webm')).toBe(true);
      expect(isVideo('video/avi')).toBe(true);
      expect(isVideo('video/quicktime')).toBe(true);
    });

    it('should return false for non-video MIME types', () => {
      expect(isVideo('image/jpeg')).toBe(false);
      expect(isVideo('application/pdf')).toBe(false);
      expect(isVideo('audio/mp3')).toBe(false);
    });
  });
});
