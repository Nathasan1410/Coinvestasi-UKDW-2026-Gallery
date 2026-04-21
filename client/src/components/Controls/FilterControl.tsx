import { type FilterType } from '../../utils/fileUtils';

/**
 * Props for FilterControl component
 */
interface FilterControlProps {
  /** Current filter selection */
  activeFilter: FilterType;
  /** Callback when filter changes */
  onFilterChange: (filter: FilterType) => void;
}

/**
 * Filter options for media type filtering
 */
export const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
];

/**
 * Media type filter control component
 * Provides dropdown to filter by All/Images/Videos
 */
export function FilterControl({ activeFilter, onFilterChange }: FilterControlProps) {
  return (
    <div className="filter-control">
      <label htmlFor="media-filter" className="filter-label">
        Filter:
      </label>
      <select
        id="media-filter"
        className="filter-select"
        value={activeFilter}
        onChange={(e) => onFilterChange(e.target.value as FilterType)}
      >
        {FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
