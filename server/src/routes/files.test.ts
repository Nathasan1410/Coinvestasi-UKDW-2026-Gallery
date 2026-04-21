import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFilesHandler, getFileHandler } from '../routes/files';

// Mock driveService
vi.mock('../services/driveService.js', () => ({
  listFilesFromFolder: vi.fn(),
  getFileMetadata: vi.fn(),
  getDownloadUrl: vi.fn(),
}));

import { listFilesFromFolder, getFileMetadata, getDownloadUrl } from '../services/driveService.js';

describe('files routes', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let endMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    endMock = vi.fn();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, end: endMock });
    setHeaderMock = vi.fn().mockReturnValue({ json: jsonMock, status: statusMock });

    mockRes = {
      setHeader: setHeaderMock,
      status: statusMock,
      json: jsonMock,
      end: endMock,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.FOLDER_CANON;
    delete process.env.FOLDER_DJI;
    delete process.env.FOLDER_IPONG;
    delete process.env.FOLDER_SONY;
  });

  describe('getFilesHandler', () => {
    beforeEach(() => {
      // Set up folder environment variables before each test
      process.env.FOLDER_CANON = 'canon-folder-id';
      process.env.FOLDER_DJI = 'dji-folder-id';
      process.env.FOLDER_IPONG = 'ipong-folder-id';
      process.env.FOLDER_SONY = 'sony-folder-id';
    });

    it('should enable CORS headers', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/files/canon',
        query: {},
      };

      vi.mocked(listFilesFromFolder).mockResolvedValue({
        files: [],
        nextPageToken: undefined,
      });

      await getFilesHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, OPTIONS');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
    });

    it('should handle OPTIONS request', async () => {
      mockReq = {
        method: 'OPTIONS',
        url: '/api/files/canon',
        query: {},
      };

      await getFilesHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(endMock).toHaveBeenCalled();
    });

    it('should reject non-GET methods', async () => {
      mockReq = {
        method: 'POST',
        url: '/api/files/canon',
      };

      await getFilesHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed',
      });
    });

    it('should reject invalid folder names', async () => {
      process.env.FOLDER_CANON = 'canon-folder-id';
      mockReq = {
        method: 'GET',
        url: '/api/files/invalid-folder',
      };

      await getFilesHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid folder'),
        })
      );
    });

    it('should list files from valid folder', async () => {
      process.env.FOLDER_CANON = 'canon-folder-id';
      mockReq = {
        method: 'GET',
        url: '/api/files/canon',
        query: {},
      };

      const mockFiles = [
        { id: '1', name: 'photo1.jpg', mimeType: 'image/jpeg' },
        { id: '2', name: 'photo2.jpg', mimeType: 'image/jpeg' },
      ];

      vi.mocked(listFilesFromFolder).mockResolvedValue({
        files: mockFiles,
        nextPageToken: undefined,
      });

      await getFilesHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(listFilesFromFolder).toHaveBeenCalledWith('canon-folder-id', undefined, 100);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          items: mockFiles,
        },
      });
    });

    it('should handle pagination parameters', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/files/canon?pageToken=token123&pageSize=50',
        query: {
          pageToken: 'token123',
          pageSize: '50',
        },
      };

      const mockResult = {
        files: [],
        nextPageToken: 'token456',
      };
      vi.mocked(listFilesFromFolder).mockResolvedValue(mockResult);

      await getFilesHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(listFilesFromFolder).toHaveBeenCalled();
      expect(listFilesFromFolder).toHaveBeenCalledWith('canon-folder-id', 'token123', 50);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors from driveService', async () => {
      process.env.FOLDER_CANON = 'canon-folder-id';
      mockReq = {
        method: 'GET',
        url: '/api/files/canon',
        query: {},
      };

      vi.mocked(listFilesFromFolder).mockRejectedValue(new Error('API Error'));

      await getFilesHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('API Error'),
      });
    });
  });

  describe('getFileHandler', () => {
    it('should enable CORS headers', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/file/file123',
        query: {},
      };

      vi.mocked(getFileMetadata).mockResolvedValue({
        id: 'file123',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        webViewLink: 'https://drive.google.com/file123',
      });

      vi.mocked(getDownloadUrl).mockReturnValue('https://download-url.com');

      await getFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });

    it('should handle OPTIONS request', async () => {
      mockReq = {
        method: 'OPTIONS',
        url: '/api/file/file123',
        query: {},
      };

      await getFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(endMock).toHaveBeenCalled();
    });

    it('should reject non-GET methods', async () => {
      mockReq = {
        method: 'POST',
        url: '/api/file/file123',
      };

      await getFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed',
      });
    });

    it('should reject missing file ID', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/file/',
      };

      await getFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'File ID is required',
      });
    });

    it('should return file metadata with download URL', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/file/file123',
      };

      const mockFile = {
        id: 'file123',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        webViewLink: 'https://drive.google.com/file123',
      };

      vi.mocked(getFileMetadata).mockResolvedValue(mockFile);
      vi.mocked(getDownloadUrl).mockReturnValue('https://download-url.com');

      await getFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(getFileMetadata).toHaveBeenCalledWith('file123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockFile,
          downloadUrl: 'https://download-url.com',
        },
      });
    });

    it('should return 404 when file not found', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/file/nonexistent',
      };

      vi.mocked(getFileMetadata).mockResolvedValue(null);

      await getFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'File not found',
      });
    });

    it('should return 500 on error', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/file/file123',
      };

      vi.mocked(getFileMetadata).mockRejectedValue(new Error('API Error'));

      await getFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'API Error',
      });
    });
  });
});
