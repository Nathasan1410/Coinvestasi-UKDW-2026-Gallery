import { useState, useEffect, useCallback, useRef } from 'react';
import type { DriveFile, UseDriveFilesResult } from '../types/gallery';
import { matchesFilter, type FilterType, getOptimizedImageUrl } from '../utils/fileUtils';
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
  duration?: number;
  folder?: string;
}

interface ApiResponse {
  success: boolean;
  data?: {
    items: ApiFile[];
    nextPageToken?: string;
  };
  error?: string;
}

const PAGE_SIZE = 40;

const FOLDER_TO_API: Record<FolderType, string> = {
  'Canon': 'canon',
  'DJI': 'dji',
  'ipong': 'ipong',
  'Sony': 'sony',
};

export interface UseDriveFilesOptions {
  folder?: FolderType;
  filter?: FilterType;
}

export interface UseDriveFilesEnhancedResult extends UseDriveFilesResult {
  setFolder: (folder: FolderType) => void;
  setFilter: (filter: FilterType) => void;
  folder: FolderType | undefined;
  filter: FilterType;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loadingMore: boolean;
}

function mapApiFiles(filesArray: ApiFile[]): DriveFile[] {
  return filesArray.map(file => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    thumbnailLink: getOptimizedImageUrl(file.thumbnailLink),
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
    size: file.size,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    width: file.width,
    height: file.height,
    duration: file.duration,
  }));
}

export function useDriveFiles(_options?: UseDriveFilesOptions): UseDriveFilesEnhancedResult {
  const [allFiles, setAllFiles] = useState<DriveFile[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<FolderType | undefined>('Canon');
  const [filter, setFilter] = useState<FilterType>('all');
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const selection = useSelection();
  const folderRef = useRef(folder);
  const pageTokenRef = useRef<string | undefined>(undefined);

  const fetchFiles = useCallback(async (isInitial = true) => {
    if (!folder) {
      setAllFiles([]);
      setLoading(false);
      return;
    }

    try {
      if (isInitial) {
        setLoading(true);
        pageTokenRef.current = undefined;
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const apiFolder = FOLDER_TO_API[folder];
      const currentToken = pageTokenRef.current;
      const url = `/api/files/${apiFolder}?pageSize=${PAGE_SIZE}${currentToken ? `&pageToken=${currentToken}` : ''}`;

      const response = await fetch(url);
      
      let data: ApiResponse | null = null;
      try {
        data = await response.json();
      } catch (e) {
        // Not JSON
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed to fetch files: ${response.status} ${response.statusText}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'API request failed');
      }

      const filesArray: ApiFile[] = data.data?.items ?? [];
      const nextToken = data.data?.nextPageToken;

      const driveFiles = mapApiFiles(filesArray);

      if (isInitial) {
        setAllFiles(driveFiles);
      } else {
        setAllFiles(prev => {
          const existingIds = new Set(prev.map(f => f.id));
          const newFiles = driveFiles.filter(f => !existingIds.has(f.id));
          return [...prev, ...newFiles];
        });
      }

      setHasMore(!!nextToken);
      setPageToken(nextToken);
      pageTokenRef.current = nextToken;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching files';
      setError(errorMessage);
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [folder]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    await fetchFiles(false);
  }, [loadingMore, hasMore, loading, fetchFiles]);

  useEffect(() => {
    if (folder !== folderRef.current) {
      folderRef.current = folder;
    }
    fetchFiles(true);
  }, [folder, fetchFiles]);

  useEffect(() => {
    let result = allFiles;

    if (filter && filter !== 'all') {
      result = result.filter(file =>
        matchesFilter(file.mimeType, file.name, filter)
      );
    }

    setFiles(result);
  }, [allFiles, filter]);

  return {
    files,
    loading,
    error,
    selectedIds: selection.selectedIds,
    toggleSelection: selection.toggleSelection,
    selectAll: () => selection.selectAll(files.map(f => f.id)),
    clearSelection: selection.clearSelection,
    refresh: () => fetchFiles(true),
    setFolder,
    setFilter,
    folder,
    filter,
    loadMore,
    hasMore,
    loadingMore,
  };
}
