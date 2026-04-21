import { useEffect, useState } from 'react';
import { MasonryLayout } from './MasonryLayout';
import { GalleryItem } from './GalleryItem';
import { useDriveFiles } from '../../hooks/useDriveFiles';
import { FolderTabs } from '../Tabs/FolderTabs';
import { FilterControl, SelectAllControl, DownloadButton } from '../Controls';
import { VideoLightbox } from '../VideoPlayer';
import type { DriveFile } from '../../types/gallery';

/**
 * Loading skeleton component for gallery items
 */
function GallerySkeleton() {
  return (
    <div className="gallery-skeleton">
      <div className="skeleton-image" />
      <div className="skeleton-text" />
    </div>
  );
}

/**
 * Error state component
 */
function GalleryError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="gallery-error">
      <h2>Oops! Something went wrong</h2>
      <p>{error}</p>
      <button onClick={onRetry}>Try Again</button>
    </div>
  );
}

/**
 * Empty state component
 */
function GalleryEmpty() {
  return (
    <div className="gallery-empty">
      <h2>No images found</h2>
      <p>Upload some images to your Google Drive folder to see them here.</p>
    </div>
  );
}

/**
 * Main Gallery component
 * Fetches files from /api/files and displays them in a masonry layout
 */
export function Gallery() {
  const {
    files,
    loading,
    error,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    refresh,
    folder,
    setFolder,
    filter,
    setFilter,
  } = useDriveFiles();

  // Video lightbox state
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);

  // Get filtered video files
  const videoFiles = files.filter(file => file.mimeType.startsWith('video/'));

  // Open video lightbox
  const handleOpenVideoLightbox = (file: DriveFile) => {
    const index = videoFiles.findIndex(f => f.id === file.id);
    setCurrentVideoIndex(index >= 0 ? index : null);
  };

  // Close video lightbox
  const handleCloseVideoLightbox = () => {
    setCurrentVideoIndex(null);
  };

  // Navigate to next video
  const handleNextVideo = () => {
    if (currentVideoIndex !== null && currentVideoIndex < videoFiles.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  // Navigate to previous video
  const handlePrevVideo = () => {
    if (currentVideoIndex !== null && currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  // Keyboard shortcut: ESC to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.size, clearSelection]);

  // Loading state
  if (loading) {
    return (
      <div className="gallery-container">
        <div className="gallery-header">
          <h1>Drive Gallery</h1>
          <div className="loading-indicator">Loading...</div>
        </div>
        <MasonryLayout columns={5} gap={16}>
          {Array.from({ length: 15 }).map((_, i) => (
            <GallerySkeleton key={i} />
          ))}
        </MasonryLayout>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="gallery-container">
        <div className="gallery-header">
          <h1>Drive Gallery</h1>
        </div>
        <GalleryError error={error} onRetry={refresh} />
      </div>
    );
  }

  // Empty state
  if (files.length === 0) {
    return (
      <div className="gallery-container">
        <div className="gallery-header">
          <h1>Drive Gallery</h1>
        </div>
        <GalleryEmpty />
      </div>
    );
  }

  // Gallery with items
  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <div className="header-top">
          <h1>Drive Gallery</h1>
          <span className="file-count">
            {files.length} {filter === 'videos' ? 'videos' : filter === 'images' ? 'images' : 'items'}
          </span>
        </div>
        <div className="header-controls">
          <FolderTabs activeFolder={folder || 'Canon'} onFolderChange={setFolder} />
          <FilterControl activeFilter={filter} onFilterChange={setFilter} />
        </div>
        <div className="header-actions">
          <SelectAllControl
            allFileIds={files.map(f => f.id)}
            selection={{
              selectedIds,
              selectedCount: selectedIds.size,
              toggleSelection,
              selectAll,
              clearSelection,
              isSelected: (id: string) => selectedIds.has(id),
            }}
          />
          <DownloadButton selectedIds={selectedIds} />
          <button onClick={refresh}>Refresh</button>
        </div>
      </div>

      <MasonryLayout columns={5} gap={16} minColumnWidth={200}>
        {files.map((file) => (
          <GalleryItem
            key={file.id}
            file={file}
            isSelected={selectedIds.has(file.id)}
            onToggleSelect={toggleSelection}
            enableKeyboardToggle
            onOpenLightbox={handleOpenVideoLightbox}
          />
        ))}
      </MasonryLayout>

      {/* Video lightbox modal */}
      {currentVideoIndex !== null && videoFiles[currentVideoIndex] && (
        <VideoLightbox
          file={videoFiles[currentVideoIndex]}
          onClose={handleCloseVideoLightbox}
          onNext={handleNextVideo}
          onPrev={handlePrevVideo}
          hasNext={currentVideoIndex < videoFiles.length - 1}
          hasPrev={currentVideoIndex > 0}
        />
      )}
    </div>
  );
}
