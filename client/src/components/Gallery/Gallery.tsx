import { useEffect, useState, useRef, useCallback } from 'react';
import { MasonryLayout } from './MasonryLayout';
import { GalleryItem } from './GalleryItem';
import { useDriveFiles } from '../../hooks/useDriveFiles';
import { FolderTabs } from '../Tabs/FolderTabs';
import { FilterControl, SelectAllControl, DownloadButton } from '../Controls';
import { VideoLightbox } from '../VideoPlayer';
import type { DriveFile } from '../../types/gallery';

function GallerySkeleton() {
  return (
    <div className="gallery-skeleton">
      <div className="skeleton-image" />
      <div className="skeleton-text" />
    </div>
  );
}

function GalleryError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="gallery-error">
      <h2>Oops! Something went wrong</h2>
      <p>{error}</p>
      <button onClick={onRetry}>Try Again</button>
    </div>
  );
}

function GalleryEmpty() {
  return (
    <div className="gallery-empty">
      <h2>No images found</h2>
      <p>Upload some images to your Google Drive folder to see them here.</p>
    </div>
  );
}

interface LoadMoreSentinelProps {
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function LoadMoreSentinel({ loadingMore, hasMore, onLoadMore }: LoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div ref={sentinelRef} className="load-more-sentinel">
      {loadingMore && (
        <div className="loading-more-indicator">
          <div className="spinner" />
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
}

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
    loadMore,
    hasMore,
    loadingMore,
  } = useDriveFiles();

  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);

  const videoFiles = files.filter(file => file.mimeType.startsWith('video/'));

  const handleOpenVideoLightbox = (file: DriveFile) => {
    const index = videoFiles.findIndex(f => f.id === file.id);
    setCurrentVideoIndex(index >= 0 ? index : null);
  };

  const handleCloseVideoLightbox = () => {
    setCurrentVideoIndex(null);
  };

  const handleNextVideo = () => {
    if (currentVideoIndex !== null && currentVideoIndex < videoFiles.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handlePrevVideo = () => {
    if (currentVideoIndex !== null && currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.size, clearSelection]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMore();
    }
  }, [loadingMore, hasMore, loadMore]);

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

      <LoadMoreSentinel loadingMore={loadingMore} hasMore={hasMore} onLoadMore={handleLoadMore} />

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