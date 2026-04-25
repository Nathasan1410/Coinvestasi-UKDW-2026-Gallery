import React, { useEffect, useState, useRef } from 'react';

interface MasonryLayoutProps {
  children: React.ReactNode[];
  columns?: number;
  gap?: number;
  minColumnWidth?: number;
  className?: string;
}

/**
 * A robust Masonry layout that balances columns based on actual aspect ratios
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

  // Distribute children into columns using the "Shortest Column First" algorithm
  const columnArrays: React.ReactNode[][] = Array.from({ length: columnCount }, () => []);
  const heights = Array.from({ length: columnCount }, () => 0);

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    // Find the shortest column index
    let shortestIndex = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortestIndex]) {
        shortestIndex = i;
      }
    }

    columnArrays[shortestIndex].push(child);

    // Calculate weight/height for balancing
    // We look for the file prop which contains width/height metadata from our API
    const file = child.props.file;
    if (file && file.width && file.height) {
      const aspectRatio = file.height / file.width;
      // Add relative weight (landscape ~0.6, portrait ~1.5)
      heights[shortestIndex] += aspectRatio * 100 + 20; 
    } else {
      // Fallback: assume a standard landscape ratio if metadata is missing
      // We add a tiny bit of "noise" (index % 3) to break perfect grids if meta is missing
      heights[shortestIndex] += 75 + (heights[shortestIndex] % 3);
    }
  });

  return (
    <div 
      ref={containerRef} 
      className={`masonry-container ${className}`} 
      style={{
        display: 'flex',
        gap: `${gap}px`,
        alignItems: 'flex-start',
        width: '100%'
      }}
    >
      {columnArrays.map((colChildren, colIndex) => (
        <div
          key={colIndex}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: `${gap}px`,
            // Stagger alternating columns to ensure a masonry look 
            // even if all images are the exact same aspect ratio (like in Canon folder)
            marginTop: colIndex % 2 !== 0 ? `${gap * 3}px` : '0',
          }}
        >
          {colChildren}
        </div>
      ))}
    </div>
  );
}
