import { useState, useCallback } from 'react';

/**
 * Return type for useSelection hook
 */
export interface UseSelectionResult {
  /** Set of selected file IDs */
  selectedIds: Set<string>;
  /** Number of selected items */
  selectedCount: number;
  /** Toggle selection of a single file ID */
  toggleSelection: (id: string) => void;
  /** Select all file IDs in the provided array */
  selectAll: (fileIds: string[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if a file ID is currently selected */
  isSelected: (id: string) => boolean;
}

/**
 * Custom hook for managing checkbox selection state
 * Uses Set for O(1) performance on add/delete/has operations
 *
 * @param initialIds - Optional array of IDs to pre-select
 * @returns Selection state and control functions
 */
export function useSelection(initialIds: string[] = []): UseSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialIds));

  /**
   * Toggle a file ID in/out of selection
   * Creates new Set to maintain immutability
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Select all visible file IDs
   * Replaces current selection with all provided IDs
   */
  const selectAll = useCallback((fileIds: string[]) => {
    setSelectedIds(new Set(fileIds));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Check if a file ID is currently selected
   * O(1) lookup using Set.has()
   */
  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.has(id);
  }, [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}
