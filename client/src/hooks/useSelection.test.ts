import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../hooks/useSelection';

describe('useSelection', () => {
  it('should initialize with empty selection by default', () => {
    const { result } = renderHook(() => useSelection());

    expect(result.current.selectedIds).toEqual(new Set());
    expect(result.current.selectedCount).toBe(0);
  });

  it('should initialize with provided initial IDs', () => {
    const initialIds = ['file1', 'file2'];
    const { result } = renderHook(() => useSelection(initialIds));

    expect(result.current.selectedIds).toEqual(new Set(initialIds));
    expect(result.current.selectedCount).toBe(2);
  });

  describe('toggleSelection', () => {
    it('should add a file ID to selection', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelection('file1');
      });

      expect(result.current.selectedIds).toEqual(new Set(['file1']));
      expect(result.current.selectedCount).toBe(1);
    });

    it('should remove a file ID from selection', () => {
      const { result } = renderHook(() => useSelection(['file1', 'file2']));

      act(() => {
        result.current.toggleSelection('file1');
      });

      expect(result.current.selectedIds).toEqual(new Set(['file2']));
      expect(result.current.selectedCount).toBe(1);
    });

    it('should toggle the same file ID multiple times', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelection('file1');
      });
      expect(result.current.selectedIds).toEqual(new Set(['file1']));

      act(() => {
        result.current.toggleSelection('file1');
      });
      expect(result.current.selectedIds).toEqual(new Set());

      act(() => {
        result.current.toggleSelection('file1');
      });
      expect(result.current.selectedIds).toEqual(new Set(['file1']));
    });
  });

  describe('selectAll', () => {
    it('should select all provided file IDs', () => {
      const { result } = renderHook(() => useSelection());
      const fileIds = ['file1', 'file2', 'file3'];

      act(() => {
        result.current.selectAll(fileIds);
      });

      expect(result.current.selectedIds).toEqual(new Set(fileIds));
      expect(result.current.selectedCount).toBe(3);
    });

    it('should replace existing selection', () => {
      const { result } = renderHook(() => useSelection(['existing1', 'existing2']));
      const newFileIds = ['new1', 'new2'];

      act(() => {
        result.current.selectAll(newFileIds);
      });

      expect(result.current.selectedIds).toEqual(new Set(newFileIds));
      expect(result.current.selectedCount).toBe(2);
    });

    it('should clear selection when given empty array', () => {
      const { result } = renderHook(() => useSelection(['file1', 'file2']));

      act(() => {
        result.current.selectAll([]);
      });

      expect(result.current.selectedIds).toEqual(new Set());
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useSelection(['file1', 'file2', 'file3']));

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual(new Set());
      expect(result.current.selectedCount).toBe(0);
    });

    it('should work when selection is already empty', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual(new Set());
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('isSelected', () => {
    it('should return true for selected file IDs', () => {
      const { result } = renderHook(() => useSelection(['file1', 'file2']));

      expect(result.current.isSelected('file1')).toBe(true);
      expect(result.current.isSelected('file2')).toBe(true);
    });

    it('should return false for non-selected file IDs', () => {
      const { result } = renderHook(() => useSelection(['file1']));

      expect(result.current.isSelected('file2')).toBe(false);
      expect(result.current.isSelected('file3')).toBe(false);
    });

    it('should return false when selection is empty', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.isSelected('any-file')).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should create new Set instances on toggle', () => {
      const { result } = renderHook(() => useSelection(['file1']));

      const previousSet = result.current.selectedIds;

      act(() => {
        result.current.toggleSelection('file2');
      });

      expect(result.current.selectedIds).not.toBe(previousSet);
    });

    it('should create new Set instances on selectAll', () => {
      const { result } = renderHook(() => useSelection(['file1']));

      const previousSet = result.current.selectedIds;

      act(() => {
        result.current.selectAll(['file2']);
      });

      expect(result.current.selectedIds).not.toBe(previousSet);
    });
  });
});
