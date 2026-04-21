/**
 * Represents a file from Google Drive
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  width?: number;
  height?: number;
}

/**
 * Gallery item with selection state
 */
export interface GalleryItem {
  file: DriveFile;
  isSelected: boolean;
  column?: number;
  position?: number;
}

/**
 * Masonry layout configuration
 */
export interface MasonryConfig {
  columns: number;
  gap: number;
  minColumnWidth: number;
}

/**
 * Context menu state
 */
export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  itemId: string | null;
}

/**
 * Hook return type for useDriveFiles
 */
export interface UseDriveFilesResult {
  files: DriveFile[];
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refresh: () => void;
}
