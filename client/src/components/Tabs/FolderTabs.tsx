/**
 * Available folder options for the gallery
 */
export type FolderType = 'Canon' | 'DJI' | 'ipong' | 'Sony';

/**
 * Props for FolderTabs component
 */
interface FolderTabsProps {
  /** Currently selected folder */
  activeFolder: FolderType;
  /** Callback when folder selection changes */
  onFolderChange: (folder: FolderType) => void;
}

/**
 * List of all available folders
 */
export const FOLDERS: FolderType[] = ['Canon', 'DJI', 'ipong', 'Sony'];

/**
 * Folder tab navigation component
 * Displays 4 tabs for switching between camera folders
 */
export function FolderTabs({ activeFolder, onFolderChange }: FolderTabsProps) {
  return (
    <div className="folder-tabs">
      {FOLDERS.map((folder) => (
        <button
          key={folder}
          className={`folder-tab ${activeFolder === folder ? 'active' : ''}`}
          onClick={() => onFolderChange(folder)}
        >
          {folder}
        </button>
      ))}
    </div>
  );
}
