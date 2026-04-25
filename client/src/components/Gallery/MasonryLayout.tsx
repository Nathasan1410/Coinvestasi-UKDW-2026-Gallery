import React, { useEffect, useState, useRef, useCallback } from 'react';

interface MasonryLayoutProps {
  children: React.ReactNode[];
  columns?: number;
  gap?: number;
  minColumnWidth?: number;
  className?: string;
}

/**
 * A more robust Masonry layout that balances columns based on item height
 */
export function MasonryLayout({
  children,
  columns = 5,
  gap = 16,
  minColumnWidth = 200,
  className = '',
}: MasonryLayoutProps) {
  const [columnCount, setColumnCount] = useState(columns);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track heights of columns to balance them
  const [columnHeights, setColumnHeights] = useState<number[]>([]);

  useEffect(() => {
    const calculateColumns = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const calculated = Math.max(1, Math.min(columns, Math.floor(containerWidth / minColumnWidth)));
      setColumnCount(calculated);
    };

    calculateColumns();
    const observer = new ResizeObserver(calculateColumns);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [columns, minColumnWidth]);

  // Distribute children into columns
  // We use a simple but effective approach: track the estimated height of each column
  // and put the next item into the shortest column.
  const columnArrays: React.ReactNode[][] = Array.from({ length: columnCount }, () => []);
  const heights = Array.from({ length: columnCount }, () => 0);

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    // Find the shortest column index
    let shortestColumnIndex = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortestColumnIndex]) {
        shortestColumnIndex = i;
      }
    }

    columnArrays[shortestColumnIndex].push(child);

    // Estimate height
    // If the child has a width/height prop from metadata, we use it
    // Otherwise we use a default estimate
    const file = child.props.file;
    if (file && file.width && file.height) {
      // ratio = height / width
      const ratio = file.height / file.width;
      heights[shortestColumnIndex] += ratio * 300 + 40; // 300 is approx width, 40 for text/padding
    } else {
      heights[shortestColumnIndex] += 300; // Default estimate
    }
  });

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: `${gap}px`,
    alignItems: 'flex-start',
    width: '100%',
  };

  return (
    <div ref={containerRef} className={`masonry-container ${className}`} style={containerStyle}>
      {columnArrays.map((colChildren, colIndex) => (
        <div
          key={colIndex}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: `${gap}px`,
          }}
        >
          {colChildren}
        </div>
      ))}
    </div>
  );
}
