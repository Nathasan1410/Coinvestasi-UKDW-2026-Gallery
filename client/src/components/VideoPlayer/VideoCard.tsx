import React, { useState, useRef } from 'react';
import type { DriveFile } from '../../types/gallery';

interface VideoCardProps {
  file: DriveFile;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenLightbox: (file: DriveFile) => void;
  focusRef?: React.RefObject<HTMLDivElement>;
  enableKeyboardToggle?: boolean;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

/**
 * YouTube-style video card component
 * - Displays video thumbnail from Google Drive
 * - Play button overlay (centered, YouTube-style)
 * - Duration badge (if metadata available)
 * - Click to open in lightbox modal
 * - Checkbox for selection
 * - Right-click context menu
 */
export function VideoCard({
  file,
  isSelected,
  onToggleSelect,
  onOpenLightbox,
  focusRef,
  enableKeyboardToggle = false,
}: VideoCardProps) {
  const [hasFocus, setHasFocus] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const localRef = useRef<HTMLDivElement>(null);
  const itemRef = focusRef || localRef;

  // Get video URL - prefer webContentLink for direct access
  const getVideoUrl = (): string => {
    return file.webContentLink || file.webViewLink || '';
  };

  // Get thumbnail URL
  const getThumbnailUrl = (): string => {
    return file.thumbnailLink || file.webViewLink || '';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Close context menu on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseContextMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle keyboard toggle (Space key) when focused
  React.useEffect(() => {
    if (!enableKeyboardToggle || !itemRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && hasFocus) {
        e.preventDefault();
        onToggleSelect(file.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardToggle, hasFocus, file.id, onToggleSelect, itemRef]);

  // Track focus state
  React.useEffect(() => {
    if (!itemRef.current) return;

    const handleFocusIn = () => setHasFocus(true);
    const handleFocusOut = () => setHasFocus(false);

    const element = itemRef.current;
    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, [itemRef]);

  // Close context menu on global click
  React.useEffect(() => {
    const handleClick = () => handleCloseContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleCloseContextMenu]);

  const thumbnailUrl = getThumbnailUrl();
  const videoUrl = getVideoUrl();

  return (
    <>
      <div
        ref={itemRef}
        className={`gallery-item video-card ${isSelected ? 'selected' : ''} ${hasFocus ? 'focused' : ''}`}
        tabIndex={0}
        onContextMenu={handleContextMenu}
        onClick={() => onOpenLightbox(file)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Selection checkbox */}
        <div className="checkbox-container">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(file.id);
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Select ${file.name}`}
            aria-checked={isSelected}
          />
        </div>

        {/* Video thumbnail with play button overlay */}
        <div className="video-thumbnail-container">
          {!imageLoaded && <div className="skeleton-loader" />}
          <img
            src={thumbnailUrl}
            alt={file.name}
            loading="lazy"
            onLoad={handleImageLoad}
            className={`thumbnail ${imageLoaded ? 'loaded' : ''}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />

          {/* Play button overlay (YouTube-style) */}
          <div className={`play-button-overlay ${isHovering ? 'visible' : ''}`}>
            <div className="play-button">
              <PlayIcon />
            </div>
          </div>

          {/* Duration badge (if available) */}
          {file.size && (
            <div className="duration-badge">
              {formatFileSize(file.size)}
            </div>
          )}
        </div>

        {/* File name overlay */}
        <div className="file-name">{file.name}</div>

        {/* Context menu */}
        {showContextMenu.isOpen && (
          <div
            className="context-menu"
            style={{
              top: showContextMenu.y,
              left: showContextMenu.x,
            }}
          >
            <button onClick={() => copyToClipboard(videoUrl)}>Copy Video URL</button>
            <button onClick={() => window.open(file.webViewLink, '_blank')}>
              Open in Drive
            </button>
          </div>
        )}
      </div>
    </>
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
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

/**
 * Play icon SVG component (YouTube-style triangle)
 */
function PlayIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
