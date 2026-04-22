import React, { useEffect, useState, useRef, useCallback } from 'react';

interface MasonryLayoutProps {
  children: React.ReactNode[];
  columns?: number;
  gap?: number;
  minColumnWidth?: number;
  className?: string;
}

/**
 * Simple masonry layout using CSS columns
 * Each column is a flex column where items flow naturally
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

  const childArray = React.Children.toArray(children);

  const columnArrays: React.ReactNode[][] = [];
  for (let i = 0; i < columnCount; i++) {
    columnArrays.push([]);
  }

  childArray.forEach((child, index) => {
    columnArrays[index % columnCount].push(child);
  });

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: `${gap}px`,
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