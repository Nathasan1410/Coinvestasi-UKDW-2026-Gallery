/**
 * Security utilities for Google Drive Gallery
 */

// Google Drive file ID format: typically 20-50 chars, alphanumeric + dash/underscore
export const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{20,50}$/;

// Blocked file extensions for security
export const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.vbs', '.scr', '.msi'];

// Maximum limits
export const MAX_FILE_IDS_PER_REQUEST = 100;
export const MAX_FILE_NAME_LENGTH = 255;

/**
 * Validates a Google Drive file ID format
 */
export function isValidDriveFileId(fileId: string): boolean {
  return DRIVE_FILE_ID_REGEX.test(fileId);
}

/**
 * Sanitizes a filename for safe use in zip archives
 * Prevents zip slip and other path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators (prevent zip slip)
  let safe = fileName.replace(/[\\/]/g, '_');

  // Remove null bytes and control characters
  safe = safe.replace(/[\0\x00-\x1F\x7F]/g, '');

  // Remove leading/trailing dots and spaces (Windows issues)
  safe = safe.replace(/^[.\s]+|[.\s]+$/g, '');

  // Limit length
  if (safe.length > MAX_FILE_NAME_LENGTH) {
    const extIndex = safe.lastIndexOf('.');
    if (extIndex > 0) {
      const ext = safe.substring(extIndex);
      safe = safe.substring(0, MAX_FILE_NAME_LENGTH - ext.length) + ext;
    } else {
      safe = safe.substring(0, MAX_FILE_NAME_LENGTH);
    }
  }

  // Fallback if filename becomes empty or invalid
  if (!safe || safe === '.' || safe === '..') {
    return 'unnamed_file';
  }

  return safe;
}

/**
 * Checks if a file extension is allowed (not blocked)
 */
export function isFileExtensionAllowed(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return !BLOCKED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

/**
 * Validates a URL is from Google Drive (for client-side context menu)
 */
export function isValidGoogleDriveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.includes('drive.google.com') ||
       parsed.hostname.includes('googleusercontent.com') ||
       parsed.hostname.includes('googleapis.com'))
    );
  } catch {
    return false;
  }
}

/**
 * Sets security headers on response
 */
export function setSecurityHeaders(res: { setHeader: (name: string, value: string) => void }): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection (for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy - allow images from Google sources
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https://*.googleapis.com https://*.googleusercontent.com data: blob:; media-src 'self' https://*.googleapis.com https://*.googleusercontent.com blob:;"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Sets CORS headers with optional origin validation
 */
export function setCorsHeaders(
  res: { setHeader: (name: string, value: string) => void },
  origin?: string,
  allowedOrigins?: string[]
): void {
  const defaultOrigins = ['*'];
  const origins = allowedOrigins || defaultOrigins;

  if (origins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

/**
 * Gets user-friendly error message (doesn't leak internal details)
 */
export function getUserFriendlyError(error: unknown): string {
  // Log full error for debugging (server-side only)
  console.error('Internal error:', error);

  // Return generic message to client
  if (error instanceof Error) {
    const knownErrors: Record<string, string> = {
      'File not found': 'The requested file was not found',
      'Invalid file ID': 'Invalid file identifier',
      'Too many files': 'Too many files requested',
      'Failed to': 'An error occurred processing your request',
    };

    for (const [key, message] of Object.entries(knownErrors)) {
      if (error.message.includes(key)) {
        return message;
      }
    }
  }

  return 'An error occurred processing your request';
}
