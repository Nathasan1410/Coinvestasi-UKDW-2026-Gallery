import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { downloadSingleFileHandler, downloadBulkHandler } from '../routes/download';

// Mock downloadService
vi.mock('../services/downloadService.js', () => ({
  getFileStream: vi.fn(),
  createZipStream: vi.fn(),
  getFileMetadata: vi.fn(),
  validateDownloadRequest: vi.fn(),
}));

import { getFileStream, createZipStream, getFileMetadata, validateDownloadRequest } from '../services/downloadService.js';
import { Readable } from 'stream';

describe('download routes', () => {
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
      headersSent: false,
    };

    vi.clearAllMocks();
  });

  describe('downloadSingleFileHandler', () => {
    it('should enable CORS headers', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/download/file123',
      };

      vi.mocked(getFileMetadata).mockResolvedValue({
        success: true,
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      });

      vi.mocked(getFileStream).mockResolvedValue({
        success: true,
        stream: new Readable(),
        mimeType: 'image/jpeg',
      });

      await downloadSingleFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, OPTIONS');
    });

    it('should handle OPTIONS request', async () => {
      mockReq = {
        method: 'OPTIONS',
        url: '/api/download/file123',
      };

      await downloadSingleFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(endMock).toHaveBeenCalled();
    });

    it('should reject non-GET methods', async () => {
      mockReq = {
        method: 'POST',
        url: '/api/download/file123',
      };

      await downloadSingleFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed',
      });
    });

    it('should reject missing file ID', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/download/',
      };

      await downloadSingleFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'File ID is required',
      });
    });

    it('should return 404 when file not found', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/download/nonexistent',
      };

      vi.mocked(getFileMetadata).mockResolvedValue({
        success: false,
        error: 'File not found',
      });

      await downloadSingleFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'File not found',
      });
    });

    it('should return 500 when file stream fails', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/download/file123',
      };

      vi.mocked(getFileMetadata).mockResolvedValue({
        success: true,
        name: 'photo.jpg',
      });

      vi.mocked(getFileStream).mockResolvedValue({
        success: false,
        error: 'Stream failed',
      });

      await downloadSingleFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Stream failed',
      });
    });

    it('should stream file successfully', async () => {
      const mockStream = new Readable({
        read() {
          this.push(null);
        },
      });

      mockReq = {
        method: 'GET',
        url: '/api/download/file123',
      };

      vi.mocked(getFileMetadata).mockResolvedValue({
        success: true,
        name: 'photo.jpg',
      });

      vi.mocked(getFileStream).mockResolvedValue({
        success: true,
        stream: mockStream,
        mimeType: 'image/jpeg',
      });

      const pipeSpy = vi.spyOn(mockStream, 'pipe').mockReturnValue(mockRes as any);

      await downloadSingleFileHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('photo.jpg')
      );
      expect(pipeSpy).toHaveBeenCalledWith(mockRes);
    });
  });

  describe('downloadBulkHandler', () => {
    it('should enable CORS headers', async () => {
      mockReq = {
        method: 'POST',
        url: '/api/download/bulk',
        body: { fileIds: ['file1', 'file2'] },
      };

      vi.mocked(validateDownloadRequest).mockReturnValue({
        valid: true,
        fileIds: ['file1', 'file2'],
      });

      vi.mocked(createZipStream).mockResolvedValue({
        success: true,
        stream: new Readable(),
        fileCount: 2,
      });

      await downloadBulkHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
    });

    it('should handle OPTIONS request', async () => {
      mockReq = {
        method: 'OPTIONS',
        url: '/api/download/bulk',
      };

      await downloadBulkHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(endMock).toHaveBeenCalled();
    });

    it('should reject non-POST methods', async () => {
      mockReq = {
        method: 'GET',
        url: '/api/download/bulk',
      };

      await downloadBulkHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed',
      });
    });

    it('should reject invalid request body', async () => {
      mockReq = {
        method: 'POST',
        url: '/api/download/bulk',
        body: { invalid: 'body' },
      };

      vi.mocked(validateDownloadRequest).mockReturnValue({
        valid: false,
        error: 'fileIds array is required',
      });

      await downloadBulkHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'fileIds array is required',
      });
    });

    it('should return 500 when zip creation fails', async () => {
      mockReq = {
        method: 'POST',
        url: '/api/download/bulk',
        body: { fileIds: ['file1', 'file2'] },
      };

      vi.mocked(validateDownloadRequest).mockReturnValue({
        valid: true,
        fileIds: ['file1', 'file2'],
      });

      vi.mocked(createZipStream).mockResolvedValue({
        success: false,
        error: 'Zip creation failed',
      });

      await downloadBulkHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Zip creation failed',
      });
    });

    it('should stream zip file successfully', async () => {
      const mockStream = new Readable({
        read() {
          this.push(null);
        },
      });

      mockReq = {
        method: 'POST',
        url: '/api/download/bulk',
        body: { fileIds: ['file1', 'file2'] },
      };

      vi.mocked(validateDownloadRequest).mockReturnValue({
        valid: true,
        fileIds: ['file1', 'file2'],
      });

      vi.mocked(createZipStream).mockResolvedValue({
        success: true,
        stream: mockStream,
        fileCount: 2,
      });

      const pipeSpy = vi.spyOn(mockStream, 'pipe').mockReturnValue(mockRes as any);

      await downloadBulkHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(setHeaderMock).toHaveBeenCalledWith('X-Zip-File-Count', '2');
      expect(pipeSpy).toHaveBeenCalledWith(mockRes);
    });
  });
});
