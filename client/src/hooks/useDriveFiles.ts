import { useState, useEffect, useCallback, useRef } from 'react';
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

interface ApiResponse {
  success: boolean;
  data?: {
    items: ApiFile[];
    nextPageToken?: string;
  };
  error?: string;
}

const PAGE_SIZE = 50;

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
    thumbnailLink: file.thumbnailLink,
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
    size: file.size,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    width: file.width,
    height: file.height,
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

  const fetchFiles = useCallback(async (isInitial = true) => {
    if (!folder) {
      setAllFiles([]);
      setLoading(false);
      return;
    }

    try {
      if (isInitial) {
        setLoading(true);
      }
      setError(null);

      const apiFolder = FOLDER_TO_API[folder];
      const url = `/api/files?folder=${apiFolder}&pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${pageToken}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      const filesArray: ApiFile[] = data.data?.items ?? [];
      const nextToken = data.data?.nextPageToken;

      const driveFiles = mapApiFiles(filesArray);

      if (isInitial) {
        setAllFiles(driveFiles);
        setPageToken(undefined);
      } else {
        setAllFiles(prev => [...prev, ...driveFiles]);
      }

      setHasMore(!!nextToken);
      setPageToken(nextToken);
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
  }, [folder, pageToken]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchFiles(false);
  }, [loadingMore, hasMore, fetchFiles]);

  useEffect(() => {
    fetchFiles(true);
  }, [folder]);

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