import React, { useEffect, useState, useCallback, useRef } from 'react';

interface MasonryLayoutProps {
  children: React.ReactNode[];
  columns?: number;
  gap?: number;
  minColumnWidth?: number;
  className?: string;
}

interface ColumnPosition {
  column: number;
  top: number;
}

/**
 * Pinterest-style masonry layout using CSS Grid with JavaScript fallback
 *
 * Uses CSS Grid masonry when supported, falls back to JS column calculation
 * Images maintain their natural aspect ratio without cropping
 */
export function MasonryLayout({
  children,
  columns = 5,
  gap = 16,
  minColumnWidth = 200,
  className = '',
}: MasonryLayoutProps) {
  const [columnCount, setColumnCount] = useState(columns);
  const [columnPositions, setColumnPositions] = useState<ColumnPosition[]>([]);
  const [imageHeights, setImageHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Calculate responsive column count based on container width
  useEffect(() => {
    const calculateColumns = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const calculatedColumns = Math.max(
        1,
        Math.min(columns, Math.floor(containerWidth / minColumnWidth))
      );

      setColumnCount(calculatedColumns);
    };

    calculateColumns();

    const resizeObserver = new ResizeObserver(calculateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [columns, minColumnWidth]);

  // Calculate column positions for JavaScript-based masonry
  const calculatePositions = useCallback((heights: number[], cols: number): ColumnPosition[] => {
    const positions: ColumnPosition[] = [];
    const columnHeights = new Array(cols).fill(0);

    heights.forEach((height) => {
      // Find the shortest column
      const column = columnHeights.indexOf(Math.min(...columnHeights));
      const top = columnHeights[column];

      positions.push({ column, top });

      // Update column height
      columnHeights[column] += height + gap;
    });

    return positions;
  }, [gap]);

  // Handle image load and calculate heights
  const handleImageLoad = useCallback((index: number, naturalWidth: number, naturalHeight: number) => {
    setImageHeights(prev => {
      const newHeights = [...prev];
      // Calculate height based on column width (accounting for gaps)
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const columnWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;
        const aspectRatio = naturalHeight / naturalWidth;
        newHeights[index] = Math.floor(columnWidth * aspectRatio);
      }
      return newHeights;
    });
  }, [columnCount, gap]);

  // Recalculate positions when heights or columns change
  useEffect(() => {
    const loadedCount = imageHeights.filter(h => h > 0).length;
    if (loadedCount === children.length && children.length > 0) {
      const positions = calculatePositions(imageHeights, columnCount);
      setColumnPositions(positions);
    }
  }, [imageHeights, columnCount, children.length, calculatePositions]);

  // CSS Grid masonry (progressive enhancement)
  const hasCssMasonry = typeof CSS !== 'undefined' &&
    CSS.supports('grid-template-rows', 'masonry');

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
    gridTemplateRows: hasCssMasonry ? 'masonry' : undefined,
    gap: `${gap}px`,
    position: 'relative',
  };

  // If CSS masonry not supported, use absolute positioning
  const useAbsolutePositioning = !hasCssMasonry && columnPositions.length > 0;

  if (useAbsolutePositioning) {
    const maxHeight = Math.max(...columnPositions.map((p, i) => p.top + (imageHeights[i] || 0)), 0);

    return (
      <div
        ref={containerRef}
        className={`masonry-container ${className}`}
        style={{
          position: 'relative',
          height: `${maxHeight}px`,
          width: '100%',
        }}
      >
        {React.Children.map(children, (child, index) => {
          const position = columnPositions[index];
          const height = imageHeights[index] || 0;

          if (!position) return child;

          return (
            <div
              ref={el => { imageRefs.current[index] = el; }}
              className="masonry-item"
              style={{
                position: 'absolute',
                left: `${position.column * (100 / columnCount)}%`,
                top: `${position.top}px`,
                width: `calc(${100 / columnCount}% - ${gap * (columnCount - 1) / columnCount}px)`,
                height: `${height}px`,
              }}
            >
              {React.cloneElement(child as React.ReactElement, {
                onImageLoad: (w: number, h: number) => handleImageLoad(index, w, h),
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // CSS Grid masonry or simple grid fallback
  return (
    <div
      ref={containerRef}
      className={`masonry-container ${className}`}
      style={containerStyle}
    >
      {React.Children.map(children, (child, index) => (
        <div
          ref={el => { imageRefs.current[index] = el; }}
          className="masonry-item"
          style={{
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
          }}
        >
          {React.cloneElement(child as React.ReactElement, {
            onImageLoad: (w: number, h: number) => handleImageLoad(index, w, h),
          })}
        </div>
      ))}
    </div>
  );
}
