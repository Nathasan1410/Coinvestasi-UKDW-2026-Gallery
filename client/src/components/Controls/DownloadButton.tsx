import { useDownload } from '../../hooks/useDownload';

export interface DownloadButtonProps {
  /** Array of selected file IDs to download */
  selectedIds: Set<string>;
  /** Optional custom label for the button */
  label?: string;
}

/**
 * Download button for bulk downloading selected files
 * Shows the count of selected files and creates a zip archive on click
 */
export function DownloadButton({ selectedIds, label = 'files' }: DownloadButtonProps) {
  const { downloadBulk } = useDownload();
  const count = selectedIds.size;

  if (count === 0) {
    return null;
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const fileIds = Array.from(selectedIds);
    await downloadBulk(fileIds);
  };

  return (
    <button
      type="button"
      className="btn-download"
      onClick={handleDownload}
      aria-label={`Download ${count} selected ${label}`}
      title={`Download ${count} selected ${label} as zip`}
    >
      <DownloadIcon />
      <span className="btn-text">Download {count}</span>
    </button>
  );
}

/**
 * Simple download icon SVG
 */
function DownloadIcon() {
  return (
    <svg
      className="download-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
