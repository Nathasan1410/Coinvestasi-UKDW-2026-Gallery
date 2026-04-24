import { useState, useCallback, useRef, useEffect } from 'react';
import type { DriveFile } from '../../types/gallery';
import { useDownload } from '../../hooks/useDownload';
import { getMediaType } from '../../utils/fileUtils';
import { VideoCard } from '../VideoPlayer';

interface GalleryItemProps {
  file: DriveFile;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onImageLoad?: (width: number, height: number) => void;
  /** Ref for keyboard focus management */
  focusRef?: React.RefObject<HTMLDivElement>;
  /** Enable keyboard toggle on Space key */
  enableKeyboardToggle?: boolean;
  /** Callback to open video lightbox */
  onOpenLightbox?: (file: DriveFile) => void;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

/**
 * Individual gallery item component
 * - Displays image thumbnail without cropping OR video with play button overlay
 * - Checkbox for selection
 * - Right-click context menu
 * - Click to view full size (images) or play in lightbox (videos)
 * - Hover download button for one-click download
 */
export function GalleryItem({
  file,
  isSelected,
  onToggleSelect,
  onImageLoad,
  focusRef,
  enableKeyboardToggle = false,
  onOpenLightbox,
}: GalleryItemProps) {
  // Detect media type
  const mediaType = getMediaType(file.mimeType, file.name);
  const isVideo = mediaType === 'video';

  // Render VideoCard for video files
  if (isVideo && onOpenLightbox) {
    return (
      <VideoCard
        file={file}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onOpenLightbox={onOpenLightbox}
        focusRef={focusRef}
        enableKeyboardToggle={enableKeyboardToggle}
      />
    );
  }

  // Render image gallery item for non-video files
  const { downloadSingle, copyImageUrlToClipboard } = useDownload();
  const [showContextMenu, setShowContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });
  const [isViewingFullSize, setIsViewingFullSize] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const itemRef = focusRef || localRef;

  // Get image URL - prefer thumbnailLink for gallery display, then webContentLink
  const [currentUrl, setCurrentUrl] = useState<string>(file.thumbnailLink || file.webContentLink || '');
  const [retryCount, setRetryCount] = useState(0);

  const handleImageError = useCallback(() => {
    if (retryCount === 0 && file.webContentLink && currentUrl !== file.webContentLink) {
      // Fallback to webContentLink on first error
      console.log(`Image error for ${file.name}, falling back to webContentLink`);
      setCurrentUrl(file.webContentLink);
      setRetryCount(1);
    } else if (retryCount < 3) {
      // Retry a few times with a delay
      setTimeout(() => {
        console.log(`Retrying image load for ${file.name} (attempt ${retryCount + 1})`);
        const url = currentUrl;
        setCurrentUrl(''); // Force re-render
        setTimeout(() => setCurrentUrl(url), 10);
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1));
    }
  }, [file.name, file.webContentLink, currentUrl, retryCount]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      await downloadSingle(file.id, file.name);
    } catch (error) {
      // Error already handled by hook with toast
    }
  }, [file.id, file.name, downloadSingle]);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current && onImageLoad) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      onImageLoad(naturalWidth, naturalHeight);
    }
    setImageLoaded(true);
  }, [onImageLoad]);

  // Close context menu and full size view on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseContextMenu();
        setIsViewingFullSize(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseContextMenu]);

  // Handle keyboard toggle (Space key) when focused
  useEffect(() => {
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
  useEffect(() => {
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
  useEffect(() => {
    const handleClick = () => handleCloseContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleCloseContextMenu]);

  const imageUrl = getImageUrl();

  return (
    <>
      <div
        ref={itemRef}
        className={`gallery-item ${isSelected ? 'selected' : ''} ${hasFocus ? 'focused' : ''}`}
        tabIndex={0}
        onContextMenu={handleContextMenu}
        onClick={() => setIsViewingFullSize(true)}
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

        {/* Image with skeleton loader */}
        <div 
          className="image-container" 
          style={{ 
            position: 'relative',
            aspectRatio: file.width && file.height ? `${file.width} / ${file.height}` : 'auto',
            minHeight: !imageLoaded && !file.width ? '200px' : 'auto',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          {!imageLoaded && <div className="skeleton-loader" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
          <img
            ref={imageRef}
            src={currentUrl}
            alt={file.name}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`thumbnail ${imageLoaded ? 'loaded' : ''}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              transition: 'opacity 0.3s ease-in-out',
              opacity: imageLoaded ? 1 : 0
            }}
          />
        </div>

        {/* File name overlay */}
        <div className="file-name">{file.name}</div>

        {/* One-click download button (shown on hover) */}
        <div className={`download-overlay ${isHovering ? 'visible' : ''}`}>
          <button
            type="button"
            className="download-button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            aria-label={`Download ${file.name}`}
            title="Download"
          >
            <DownloadIcon />
          </button>
        </div>

        {/* Context menu */}
        {showContextMenu.isOpen && (
          <div
            className="context-menu"
            style={{
              top: showContextMenu.y,
              left: showContextMenu.x,
            }}
          >
            <button onClick={() => copyImageUrlToClipboard(currentUrl)}>Copy Image URL</button>
            <button onClick={handleDownload}>Download</button>
            <button onClick={() => window.open(file.webViewLink, '_blank')}>
              Open in Drive
            </button>
          </div>
        )}
      </div>

      {/* Full size image modal */}
      {isViewingFullSize && (
        <div className="modal-overlay" onClick={() => setIsViewingFullSize(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsViewingFullSize(false)}>
              &times;
            </button>
            <img
              src={currentUrl}
              alt={file.name}
              className="full-size-image"
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
            />
            <div className="modal-info">
              <span className="modal-filename">{file.name}</span>
              {file.size && (
                <span className="modal-size">{formatFileSize(file.size)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Download icon SVG component
 */
function DownloadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
