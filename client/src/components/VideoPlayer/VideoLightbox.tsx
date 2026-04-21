import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { DriveFile } from '../../types/gallery';

interface VideoLightboxProps {
  file: DriveFile;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/**
 * Video lightbox modal component for fullscreen video viewing
 * - Modal overlay for fullscreen viewing
 * - HTML5 video player with controls
 * - Play/pause, volume, fullscreen
 * - Close button (X) and ESC to close
 * - Next/Prev navigation if multiple videos
 */
export function VideoLightbox({
  file,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
}: VideoLightboxProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get video URL - prefer webContentLink for direct access
  const getVideoUrl = (): string => {
    return file.webContentLink || '';
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === ' ' || e.key === 'k') {
        // Space or K to toggle play/pause
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      } else if (e.key === 'f') {
        // F to toggle fullscreen
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        // M to toggle mute
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Auto-play video when lightbox opens (muted to avoid autoplay restrictions)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      setIsLoading(true);
      setError(null);
      video.muted = true; // Start muted for autoplay
      video.play().catch(err => {
        console.warn('Autoplay was prevented:', err);
        // Autoplay prevented - user will need to click play
      });
    }
  }, [file.id]);

  const handleVideoLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load video. The video file may not be accessible.');
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = document.getElementById('video-lightbox-container');
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Close only if clicking the backdrop, not the video
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const videoUrl = getVideoUrl();

  return (
    <div
      id="video-lightbox-container"
      className="video-lightbox-overlay"
      onClick={handleBackdropClick}
    >
      <div className="video-lightbox-content">
        {/* Close button */}
        <button className="video-lightbox-close" onClick={onClose} aria-label="Close video">
          <CloseIcon />
        </button>

        {/* Navigation buttons */}
        {hasPrev && onPrev && (
          <button
            className="video-lightbox-nav video-lightbox-nav-prev"
            onClick={onPrev}
            aria-label="Previous video"
          >
            <ChevronLeftIcon />
          </button>
        )}

        {hasNext && onNext && (
          <button
            className="video-lightbox-nav video-lightbox-nav-next"
            onClick={onNext}
            aria-label="Next video"
          >
            <ChevronRightIcon />
          </button>
        )}

        {/* Video player */}
        <div className="video-player-wrapper">
          {isLoading && (
            <div className="video-loading">
              <div className="video-loading-spinner" />
              <span>Loading video...</span>
            </div>
          )}

          {error && (
            <div className="video-error">
              <ErrorIcon />
              <span>{error}</span>
            </div>
          )}

          <video
            ref={videoRef}
            src={videoUrl}
            className={`video-player ${isLoading || error ? 'hidden' : ''}`}
            controls
            autoPlay
            playsInline
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Video info */}
        <div className="video-lightbox-info">
          <span className="video-lightbox-filename">{file.name}</span>
          {file.size && (
            <span className="video-lightbox-size">{formatFileSize(file.size)}</span>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="video-lightbox-shortcuts">
          <kbd>ESC</kbd> Close
          <kbd>Space</kbd> Play/Pause
          <kbd>F</kbd> Fullscreen
          <kbd>M</kbd> Mute
          <kbd>←</kbd> Previous
          <kbd>→</kbd> Next
        </div>
      </div>
    </div>
  );
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Close icon (X)
 */
function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Chevron left icon
 */
function ChevronLeftIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/**
 * Chevron right icon
 */
function ChevronRightIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Error icon
 */
function ErrorIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
