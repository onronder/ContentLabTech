/**
 * Performance Monitoring Hooks
 * React hooks for monitoring and optimizing component performance
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";

/**
 * Hook for measuring component render time
 */
export function useRenderTime(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const [renderMetrics, setRenderMetrics] = useState<{
    lastRenderTime: number;
    averageRenderTime: number;
    renderCount: number;
  }>({
    lastRenderTime: 0,
    averageRenderTime: 0,
    renderCount: 0,
  });

  // Mark render start
  renderStartTime.current = performance.now();

  useEffect(() => {
    // Mark render end
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    setRenderMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      const newAverageRenderTime =
        (prev.averageRenderTime * (newRenderCount - 1) + renderTime) /
        newRenderCount;

      // Log slow renders (>16ms for 60fps)
      if (renderTime > 16) {
        console.warn(
          `Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`
        );
      }

      return {
        lastRenderTime: renderTime,
        averageRenderTime: newAverageRenderTime,
        renderCount: newRenderCount,
      };
    });
  });

  return renderMetrics;
}

/**
 * Hook for monitoring memory usage
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ("memory" in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

/**
 * Hook for measuring loading performance
 */
export function useLoadingPerformance() {
  const [metrics, setMetrics] = useState<{
    timeToFirstByte?: number;
    domContentLoaded?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    firstInputDelay?: number;
    cumulativeLayoutShift?: number;
  }>({});

  useEffect(() => {
    // Measure Navigation Timing metrics
    const navigationEntries = performance.getEntriesByType("navigation");
    if (navigationEntries.length > 0) {
      const navigation = navigationEntries[0] as PerformanceNavigationTiming;
      setMetrics(prev => ({
        ...prev,
        timeToFirstByte: navigation.responseStart - navigation.requestStart,
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.requestStart,
      }));
    }

    // Measure Paint Timing metrics
    const paintEntries = performance.getEntriesByType("paint");
    paintEntries.forEach(entry => {
      if (entry.name === "first-contentful-paint") {
        setMetrics(prev => ({
          ...prev,
          firstContentfulPaint: entry.startTime,
        }));
      }
    });

    // Measure LCP using PerformanceObserver
    if ("PerformanceObserver" in window) {
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            setMetrics(prev => ({
              ...prev,
              largestContentfulPaint: lastEntry.startTime,
            }));
          }
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      } catch (e) {
        // LCP not supported
      }

      // Measure FID
      const fidObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const fidEntry = entry as any;
          if (fidEntry.processingStart !== undefined) {
            setMetrics(prev => ({
              ...prev,
              firstInputDelay: fidEntry.processingStart - entry.startTime,
            }));
          }
        });
      });

      try {
        fidObserver.observe({ entryTypes: ["first-input"] });
      } catch (e) {
        // FID not supported
      }

      // Measure CLS
      const clsObserver = new PerformanceObserver(list => {
        let clsValue = 0;
        list.getEntries().forEach(entry => {
          const clsEntry = entry as any;
          if (!clsEntry.hadRecentInput && clsEntry.value !== undefined) {
            clsValue += clsEntry.value;
          }
        });
        setMetrics(prev => ({
          ...prev,
          cumulativeLayoutShift: clsValue,
        }));
      });

      try {
        clsObserver.observe({ entryTypes: ["layout-shift"] });
      } catch (e) {
        // CLS not supported
      }

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
    return undefined;
  }, []);

  return metrics;
}

/**
 * Hook for throttling expensive operations
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(Date.now());

  return useCallback(
    ((...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook for debouncing expensive operations
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook for measuring component lifecycle performance
 */
export function useLifecyclePerformance(componentName: string) {
  const mountTime = useRef<number>(0);
  const [metrics, setMetrics] = useState<{
    mountTime?: number;
    unmountTime?: number;
    totalLifetime?: number;
  }>({});

  useEffect(() => {
    // Component mounted
    mountTime.current = performance.now();
    console.log(
      `${componentName} mounted at ${mountTime.current.toFixed(2)}ms`
    );

    return () => {
      // Component unmounting
      const unmountTime = performance.now();
      const totalLifetime = unmountTime - mountTime.current;

      setMetrics({
        mountTime: mountTime.current,
        unmountTime,
        totalLifetime,
      });

      console.log(
        `${componentName} unmounted after ${totalLifetime.toFixed(2)}ms lifetime`
      );
    };
  }, [componentName]);

  return metrics;
}

/**
 * Hook for optimizing expensive calculations
 */
export function useExpensiveCalculation<T>(
  calculation: () => T,
  dependencies: React.DependencyList,
  threshold = 10 // ms
): T {
  return useMemo(() => {
    const start = performance.now();
    const result = calculation();
    const end = performance.now();
    const duration = end - start;

    if (duration > threshold) {
      console.warn(`Expensive calculation took ${duration.toFixed(2)}ms`);
    }

    return result;
  }, dependencies);
}

/**
 * Hook for monitoring bundle size impact
 */
export function useBundleMetrics() {
  const [bundleInfo, setBundleInfo] = useState<{
    jsSize?: number;
    cssSize?: number;
    totalSize?: number;
    gzippedSize?: number;
  }>({});

  useEffect(() => {
    // Monitor resource timing for script and stylesheet files
    const resources = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];

    let jsSize = 0;
    let cssSize = 0;

    resources.forEach(resource => {
      if (resource.name.endsWith(".js")) {
        jsSize += resource.transferSize || 0;
      } else if (resource.name.endsWith(".css")) {
        cssSize += resource.transferSize || 0;
      }
    });

    setBundleInfo({
      jsSize,
      cssSize,
      totalSize: jsSize + cssSize,
    });
  }, []);

  return bundleInfo;
}

/**
 * Hook for performance budget monitoring
 */
export function usePerformanceBudget(budgets: {
  maxRenderTime?: number;
  maxMemoryUsage?: number;
  maxBundleSize?: number;
}) {
  const [violations, setViolations] = useState<string[]>([]);
  const renderMetrics = useRenderTime("PerformanceBudget");
  const memoryInfo = useMemoryMonitor();
  const bundleInfo = useBundleMetrics();

  useEffect(() => {
    const newViolations: string[] = [];

    if (
      budgets.maxRenderTime &&
      renderMetrics.lastRenderTime > budgets.maxRenderTime
    ) {
      newViolations.push(
        `Render time exceeded: ${renderMetrics.lastRenderTime.toFixed(2)}ms > ${budgets.maxRenderTime}ms`
      );
    }

    if (
      budgets.maxMemoryUsage &&
      memoryInfo &&
      memoryInfo.usedJSHeapSize > budgets.maxMemoryUsage
    ) {
      newViolations.push(
        `Memory usage exceeded: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB > ${(budgets.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`
      );
    }

    if (
      budgets.maxBundleSize &&
      bundleInfo.totalSize &&
      bundleInfo.totalSize > budgets.maxBundleSize
    ) {
      newViolations.push(
        `Bundle size exceeded: ${(bundleInfo.totalSize / 1024).toFixed(2)}KB > ${(budgets.maxBundleSize / 1024).toFixed(2)}KB`
      );
    }

    setViolations(newViolations);

    if (newViolations.length > 0) {
      console.warn("Performance budget violations:", newViolations);
    }
  }, [budgets, renderMetrics, memoryInfo, bundleInfo]);

  return {
    violations,
    isWithinBudget: violations.length === 0,
    metrics: {
      render: renderMetrics,
      memory: memoryInfo,
      bundle: bundleInfo,
    },
  };
}

/**
 * Hook for measuring API response times
 */
export function useApiPerformance() {
  const [apiMetrics, setApiMetrics] = useState<{
    [url: string]: {
      averageResponseTime: number;
      requestCount: number;
      errorRate: number;
    };
  }>({});

  const trackApiCall = useCallback(
    (url: string, responseTime: number, isError = false) => {
      setApiMetrics(prev => {
        const existing = prev[url] || {
          averageResponseTime: 0,
          requestCount: 0,
          errorRate: 0,
        };
        const newRequestCount = existing.requestCount + 1;
        const newAverageResponseTime =
          (existing.averageResponseTime * existing.requestCount +
            responseTime) /
          newRequestCount;
        const newErrorCount =
          existing.errorRate * existing.requestCount + (isError ? 1 : 0);
        const newErrorRate = newErrorCount / newRequestCount;

        return {
          ...prev,
          [url]: {
            averageResponseTime: newAverageResponseTime,
            requestCount: newRequestCount,
            errorRate: newErrorRate,
          },
        };
      });
    },
    []
  );

  return { apiMetrics, trackApiCall };
}
