import { useState, useEffect, useCallback } from 'react';
import type { DriveFile, UseDriveFilesResult } from '../types/gallery';
import { matchesFilter, type FilterType } from '../utils/fileUtils';
import type { FolderType } from '../components/Tabs/FolderTabs';
import { useSelection } from './useSelection';

interface ApiFile {
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
  folder?: string;
}

/**
 * Custom hook to fetch and manage Drive files
 */
export interface UseDriveFilesOptions {
  /** Selected folder to filter by */
  folder?: FolderType;
  /** Media type filter */
  filter?: FilterType;
}

export interface UseDriveFilesEnhancedResult extends UseDriveFilesResult {
  /** Set the selected folder */
  setFolder: (folder: FolderType) => void;
  /** Set the media filter */
  setFilter: (filter: FilterType) => void;
  /** Current selected folder */
  folder: FolderType | undefined;
  /** Current media filter */
  filter: FilterType;
}

export function useDriveFiles(_options?: UseDriveFilesOptions): UseDriveFilesEnhancedResult {
  const [allFiles, setAllFiles] = useState<DriveFile[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<FolderType | undefined>(undefined);
  const [filter, setFilter] = useState<FilterType>('all');

  // Use selection hook for centralized selection logic
  const selection = useSelection();

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both { success: true, data: [...] } and direct array responses
      const filesArray: ApiFile[] = Array.isArray(data)
        ? data
        : data.data ?? data.files ?? [];

      // Transform to DriveFile (keep all media types now)
      const driveFiles: DriveFile[] = filesArray.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        thumbnailLink: file.thumbnailLink,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        size: file.size,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        width: file.width,
        height: file.height,
      }));

      setAllFiles(driveFiles);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching files';
      setError(errorMessage);
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Apply folder and filter changes to update displayed files
  useEffect(() => {
    let result = allFiles;

    // Filter by folder if selected
    if (folder) {
      result = result.filter(file =>
        file.name.toLowerCase().includes(folder.toLowerCase())
      );
    }

    // Filter by media type
    if (filter && filter !== 'all') {
      result = result.filter(file =>
        matchesFilter(file.mimeType, file.name, filter)
      );
    }

    setFiles(result);
  }, [allFiles, folder, filter]);

  // Sync selection when files change (e.g., filter/folder change)
  useEffect(() => {
    // Optional: clear selection when filtered files change
    // Uncomment if you want to clear selection on filter change
    // selection.clearSelection();
  }, [files.length]);

  return {
    files,
    loading,
    error,
    selectedIds: selection.selectedIds,
    toggleSelection: selection.toggleSelection,
    selectAll: () => selection.selectAll(files.map(f => f.id)),
    clearSelection: selection.clearSelection,
    refresh: fetchFiles,
    setFolder,
    setFilter,
    folder,
    filter,
  };
}
