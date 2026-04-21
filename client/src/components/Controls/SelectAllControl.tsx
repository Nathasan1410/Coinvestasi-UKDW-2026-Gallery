import type { UseSelectionResult } from '../../hooks/useSelection';

export interface SelectAllControlProps {
  /** All visible file IDs (not just selected ones) */
  allFileIds: string[];
  /** Selection control functions from useSelection hook */
  selection: UseSelectionResult;
  /** Optional custom label for the count display */
  label?: string;
}

/**
 * Control bar for bulk selection actions
 * Shows Select All / Clear buttons and selected count
 */
export function SelectAllControl({
  allFileIds,
  selection,
  label = 'selected',
}: SelectAllControlProps) {
  const { selectedCount, selectAll, clearSelection } = selection;
  const hasSelection = selectedCount > 0;

  return (
    <div className="selection-controls">
      {hasSelection && (
        <span className="selection-count">
          {selectedCount} {label}
        </span>
      )}

      <div className="selection-buttons">
        {hasSelection && (
          <button
            type="button"
            className="btn-clear"
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            Clear
          </button>
        )}

        <button
          type="button"
          className="btn-select-all"
          onClick={() => selectAll(allFileIds)}
          aria-label="Select all visible files"
        >
          Select All
        </button>
      </div>
    </div>
  );
}
