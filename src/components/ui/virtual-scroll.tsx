/**
 * Virtual Scroll Component
 * High-performance virtualized scrolling for large datasets
 */

"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

interface VirtualScrollState {
  scrollTop: number;
  isScrolling: boolean;
  startIndex: number;
  endIndex: number;
  visibleItems: number;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
  getItemKey,
}: VirtualScrollProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<VirtualScrollState>({
    scrollTop: 0,
    isScrolling: false,
    startIndex: 0,
    endIndex: 0,
    visibleItems: 0,
  });

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollState.scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, startIndex + visibleItems + overscan * 2);

    return {
      startIndex,
      endIndex,
      visibleItems,
    };
  }, [scrollState.scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  // Scroll handler with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    
    setScrollState(prev => ({
      ...prev,
      scrollTop,
      isScrolling: true,
    }));

    onScroll?.(scrollTop);
  }, [onScroll]);

  // Clear scrolling state after scrolling stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setScrollState(prev => ({ ...prev, isScrolling: false }));
    }, 150);

    return () => clearTimeout(timer);
  }, [scrollState.scrollTop]);

  // Update visible range when it changes
  useEffect(() => {
    setScrollState(prev => ({
      ...prev,
      ...visibleRange,
    }));
  }, [visibleRange]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return;

    let scrollTop: number;
    switch (align) {
      case 'center':
        scrollTop = index * itemHeight - containerHeight / 2 + itemHeight / 2;
        break;
      case 'end':
        scrollTop = index * itemHeight - containerHeight + itemHeight;
        break;
      default: // start
        scrollTop = index * itemHeight;
    }

    scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - containerHeight));
    scrollElementRef.current.scrollTop = scrollTop;
  }, [itemHeight, containerHeight, totalHeight]);

  // Scroll to specific item
  const scrollToItem = useCallback((item: T, align: 'start' | 'center' | 'end' = 'start') => {
    const index = items.indexOf(item);
    if (index !== -1) {
      scrollToIndex(index, align);
    }
  }, [items, scrollToIndex]);

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, virtualIndex) => {
            const actualIndex = visibleRange.startIndex + virtualIndex;
            const key = getItemKey ? getItemKey(item, actualIndex) : actualIndex;
            
            return (
              <div
                key={key}
                style={{ height: itemHeight }}
                className="flex-shrink-0"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Export helper functions for external use
VirtualScroll.displayName = "VirtualScroll";

export type { VirtualScrollProps, VirtualScrollState };