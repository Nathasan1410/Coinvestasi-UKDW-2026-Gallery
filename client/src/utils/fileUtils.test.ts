import { describe, it, expect } from 'vitest';
import {
  isImageFile,
  isVideoFile,
  isImageByExtension,
  isVideoByExtension,
  formatVideoDuration,
  parseIsoDuration,
  getFileExtension,
  getMediaType,
  matchesFilter,
  type FilterType,
} from '../utils/fileUtils';

describe('fileUtils', () => {
  describe('isImageFile', () => {
    it('should return true for image MIME types', () => {
      expect(isImageFile('image/jpeg')).toBe(true);
      expect(isImageFile('image/png')).toBe(true);
      expect(isImageFile('image/gif')).toBe(true);
      expect(isImageFile('image/webp')).toBe(true);
      expect(isImageFile('image/heic')).toBe(true);
    });

    it('should return false for non-image MIME types', () => {
      expect(isImageFile('video/mp4')).toBe(false);
      expect(isImageFile('application/pdf')).toBe(false);
      expect(isImageFile('text/plain')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isImageFile('IMAGE/JPEG')).toBe(true);
      expect(isImageFile('Image/Png')).toBe(true);
    });
  });

  describe('isVideoFile', () => {
    it('should return true for video MIME types', () => {
      expect(isVideoFile('video/mp4')).toBe(true);
      expect(isVideoFile('video/webm')).toBe(true);
      expect(isVideoFile('video/avi')).toBe(true);
      expect(isVideoFile('video/quicktime')).toBe(true);
    });

    it('should return false for non-video MIME types', () => {
      expect(isVideoFile('image/jpeg')).toBe(false);
      expect(isVideoFile('application/pdf')).toBe(false);
      expect(isVideoFile('audio/mp3')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isVideoFile('VIDEO/MP4')).toBe(true);
      expect(isVideoFile('Video/WebM')).toBe(true);
    });
  });

  describe('isImageByExtension', () => {
    it('should return true for image file extensions', () => {
      expect(isImageByExtension('photo.jpg')).toBe(true);
      expect(isImageByExtension('image.jpeg')).toBe(true);
      expect(isImageByExtension('picture.png')).toBe(true);
      expect(isImageByExtension('graphic.gif')).toBe(true);
      expect(isImageByExtension('photo.webp')).toBe(true);
      expect(isImageByExtension('IMG_001.HEIC')).toBe(true);
    });

    it('should return false for non-image extensions', () => {
      expect(isImageByExtension('video.mp4')).toBe(false);
      expect(isImageByExtension('document.pdf')).toBe(false);
      expect(isImageByExtension('file.txt')).toBe(false);
    });

    it('should return false for files without extensions', () => {
      expect(isImageByExtension('noextension')).toBe(false);
    });
  });

  describe('isVideoByExtension', () => {
    it('should return true for video file extensions', () => {
      expect(isVideoByExtension('movie.mp4')).toBe(true);
      expect(isVideoByExtension('clip.mov')).toBe(true);
      expect(isVideoByExtension('video.avi')).toBe(true);
      expect(isVideoByExtension('recording.webm')).toBe(true);
      expect(isVideoByExtension('film.mkv')).toBe(true);
    });

    it('should return false for non-video extensions', () => {
      expect(isVideoByExtension('photo.jpg')).toBe(false);
      expect(isVideoByExtension('document.pdf')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract the extension from a filename', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('image.png')).toBe('png');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should handle uppercase extensions', () => {
      expect(getFileExtension('IMAGE.JPG')).toBe('JPG');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('noextension')).toBe('');
      expect(getFileExtension('')).toBe('');
    });

    it('should handle files ending with dot', () => {
      expect(getFileExtension('file.')).toBe('');
    });
  });

  describe('formatVideoDuration', () => {
    it('should format seconds correctly for short videos', () => {
      expect(formatVideoDuration(30)).toBe('0:30');
      expect(formatVideoDuration(5)).toBe('0:05');
      expect(formatVideoDuration(0)).toBe('0:00');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatVideoDuration(65)).toBe('1:05');
      expect(formatVideoDuration(300)).toBe('5:00');
      expect(formatVideoDuration(330)).toBe('5:30');
    });

    it('should format hours correctly for long videos', () => {
      expect(formatVideoDuration(3600)).toBe('1:00:00');
      expect(formatVideoDuration(3665)).toBe('1:01:05');
      expect(formatVideoDuration(7265)).toBe('2:01:05');
    });

    it('should handle invalid input', () => {
      expect(formatVideoDuration(-1)).toBe('0:00');
      expect(formatVideoDuration(NaN)).toBe('0:00');
      expect(formatVideoDuration(Infinity)).toBe('0:00');
    });
  });

  describe('parseIsoDuration', () => {
    it('should parse ISO 8601 duration strings', () => {
      expect(parseIsoDuration('PT30S')).toBe(30);
      expect(parseIsoDuration('PT1M')).toBe(60);
      expect(parseIsoDuration('PT5M30S')).toBe(330);
      expect(parseIsoDuration('PT1H')).toBe(3600);
      expect(parseIsoDuration('PT1H30M')).toBe(5400);
      expect(parseIsoDuration('PT1H30M30S')).toBe(5430);
    });

    it('should handle partial duration strings', () => {
      expect(parseIsoDuration('PT5M')).toBe(300);
      expect(parseIsoDuration('PT45S')).toBe(45);
      expect(parseIsoDuration('PT2H')).toBe(7200);
    });

    it('should return 0 for invalid formats', () => {
      expect(parseIsoDuration('')).toBe(0);
      expect(parseIsoDuration('invalid')).toBe(0);
      expect(parseIsoDuration('P1D')).toBe(0);
    });
  });

  describe('getMediaType', () => {
    it('should return "image" for image MIME types', () => {
      expect(getMediaType('image/jpeg')).toBe('image');
      expect(getMediaType('image/png')).toBe('image');
    });

    it('should return "video" for video MIME types', () => {
      expect(getMediaType('video/mp4')).toBe('video');
      expect(getMediaType('video/webm')).toBe('video');
    });

    it('should use filename fallback when MIME type is unknown', () => {
      expect(getMediaType('application/octet-stream', 'photo.jpg')).toBe('image');
      expect(getMediaType('unknown', 'video.mp4')).toBe('video');
    });

    it('should return "unknown" for unrecognized types', () => {
      expect(getMediaType('application/pdf')).toBe('unknown');
      expect(getMediaType('text/plain')).toBe('unknown');
      expect(getMediaType('audio/mp3')).toBe('unknown');
    });

    it('should return "unknown" when both MIME type and filename are unrecognized', () => {
      expect(getMediaType('unknown', 'file.xyz')).toBe('unknown');
    });
  });

  describe('matchesFilter', () => {
    it('should return true for "all" filter', () => {
      expect(matchesFilter('image/jpeg', undefined, 'all')).toBe(true);
      expect(matchesFilter('video/mp4', undefined, 'all')).toBe(true);
      expect(matchesFilter('application/pdf', undefined, 'all')).toBe(true);
    });

    it('should match images when filter is "images"', () => {
      expect(matchesFilter('image/jpeg', undefined, 'images')).toBe(true);
      expect(matchesFilter('image/png', undefined, 'images')).toBe(true);
      expect(matchesFilter('video/mp4', undefined, 'images')).toBe(false);
      expect(matchesFilter('application/pdf', undefined, 'images')).toBe(false);
    });

    it('should match videos when filter is "videos"', () => {
      expect(matchesFilter('video/mp4', undefined, 'videos')).toBe(true);
      expect(matchesFilter('video/webm', undefined, 'videos')).toBe(true);
      expect(matchesFilter('image/jpeg', undefined, 'videos')).toBe(false);
      expect(matchesFilter('application/pdf', undefined, 'videos')).toBe(false);
    });

    it('should use filename fallback for filtering', () => {
      expect(matchesFilter('application/octet-stream', 'photo.jpg', 'images')).toBe(true);
      expect(matchesFilter('unknown', 'video.mp4', 'videos')).toBe(true);
    });
  });
});
