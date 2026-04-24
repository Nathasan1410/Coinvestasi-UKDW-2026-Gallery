/**
 * Image MIME type prefixes
 */
const IMAGE_MIME_PREFIXES = ['image/'];

/**
 * Video MIME type prefixes
 */
const VIDEO_MIME_PREFIXES = ['video/'];

/**
 * Image file extensions for fallback detection
 */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];

/**
 * Video file extensions for fallback detection
 */
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv'];

/**
 * Check if a MIME type represents an image
 * @param mimeType - The MIME type to check (e.g., 'image/jpeg')
 * @returns true if the MIME type is an image
 */
export function isImageFile(mimeType: string): boolean {
  const lowerMimeType = mimeType.toLowerCase();
  return IMAGE_MIME_PREFIXES.some(prefix => lowerMimeType.startsWith(prefix));
}

/**
 * Check if a MIME type represents a video
 * @param mimeType - The MIME type to check (e.g., 'video/mp4')
 * @returns true if the MIME type is a video
 */
export function isVideoFile(mimeType: string): boolean {
  const lowerMimeType = mimeType.toLowerCase();
  return VIDEO_MIME_PREFIXES.some(prefix => lowerMimeType.startsWith(prefix));
}

/**
 * Check if a file name has an image extension
 * @param fileName - The file name to check
 * @returns true if the file has an image extension
 */
export function isImageByExtension(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return IMAGE_EXTENSIONS.includes(extension.toLowerCase());
}

/**
 * Check if a file name has a video extension
 * @param fileName - The file name to check
 * @returns true if the file has a video extension
 */
export function isVideoByExtension(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return VIDEO_EXTENSIONS.includes(extension.toLowerCase());
}

/**
 * Format video duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "5:30" or "1:05:30")
 */
export function formatVideoDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  // Format seconds with leading zero
  const formattedSecs = secs.toString().padStart(2, '0');

  if (hours > 0) {
    // For videos longer than 1 hour: "1:05:30"
    return `${hours}:${minutes.toString().padStart(2, '0')}:${formattedSecs}`;
  }

  // For shorter videos: "5:30"
  return `${minutes}:${formattedSecs}`;
}

/**
 * Parse ISO 8601 duration string to seconds
 * @param isoDuration - ISO 8601 duration string (e.g., "PT5M30S")
 * @returns Duration in seconds
 */
export function parseIsoDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return 0;
  }

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get the file extension from a file name
 * @param fileName - The file name (e.g., 'photo.jpg')
 * @returns The extension without the dot (e.g., 'jpg')
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return '';
  }
  return fileName.slice(lastDotIndex + 1);
}

/**
 * Get the media type category for a file
 * @param mimeType - The MIME type of the file
 * @param fileName - Optional file name for fallback detection
 * @returns 'image' | 'video' | 'unknown'
 */
export function getMediaType(mimeType: string, fileName?: string): 'image' | 'video' | 'unknown' {
  if (isImageFile(mimeType)) {
    return 'image';
  }
  if (isVideoFile(mimeType)) {
    return 'video';
  }
  // Fallback to extension check if MIME type is unknown
  if (fileName) {
    if (isImageByExtension(fileName)) {
      return 'image';
    }
    if (isVideoByExtension(fileName)) {
      return 'video';
    }
  }
  return 'unknown';
}

/**
 * Optimize Google Drive thumbnail URL for better quality and stability
 * @param thumbnailLink - The original thumbnail link from Drive API
 * @param size - The desired size (default 1000)
 * @returns Optimized URL
 */
export function getOptimizedImageUrl(thumbnailLink: string | undefined, size: number = 1000): string {
  if (!thumbnailLink) return '';
  
  // Replace the default size (=s220) with the requested size
  // and ensure it uses high quality scaling (=s1000 or similar)
  return thumbnailLink.replace(/=s\d+$/, `=s${size}`);
}

/**
 * Filter type for media filtering
 */
export type FilterType = 'all' | 'images' | 'videos';

/**
 * Check if a file matches the given filter type
 * @param mimeType - The MIME type of the file
 * @param fileName - Optional file name for fallback detection
 * @param filter - The filter type to apply
 * @returns true if the file matches the filter
 */
export function matchesFilter(
  mimeType: string,
  fileName: string | undefined,
  filter: FilterType
): boolean {
  if (filter === 'all') {
    return true;
  }

  const mediaType = getMediaType(mimeType, fileName);

  if (filter === 'images') {
    return mediaType === 'image';
  }

  if (filter === 'videos') {
    return mediaType === 'video';
  }

  return false;
}
