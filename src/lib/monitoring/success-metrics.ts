/**
 * Success Metrics and Analytics System
 * Comprehensive user engagement and conversion tracking
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface UserAction {
  id: string;
  type:
    | "click"
    | "form_submit"
    | "navigation"
    | "scroll"
    | "hover"
    | "focus"
    | "keypress";
  element?: string;
  component?: string;
  value?: string | number;
  timestamp: number;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ConversionFunnel {
  id: string;
  name: string;
  steps: Array<{
    id: string;
    name: string;
    condition: (action: UserAction) => boolean;
    required: boolean;
  }>;
}

interface EngagementMetrics {
  sessionDuration: number;
  pageViews: number;
  interactions: number;
  scrollDepth: number;
  timeOnPage: number;
  bounceRate: number;
  returnVisitor: boolean;
}

interface PerformanceMetrics {
  loadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface ConversionMetrics {
  funnelCompletions: Record<string, number>;
  conversionRates: Record<string, number>;
  dropoffPoints: Record<string, number>;
  averageTimeToConvert: Record<string, number>;
}

interface SuccessMetricsData {
  engagement: EngagementMetrics;
  performance: PerformanceMetrics;
  conversions: ConversionMetrics;
  userActions: UserAction[];
  heatmapData: Array<{ x: number; y: number; intensity: number }>;
}

class SuccessMetricsTracker {
  private static instance: SuccessMetricsTracker;
  private actions: UserAction[] = [];
  private sessionId: string;
  private sessionStart: number;
  private pageLoadTime: number;
  private funnels: Map<string, ConversionFunnel> = new Map();
  private subscribers: Set<(data: SuccessMetricsData) => void> = new Set();
  private heatmapData: Array<{ x: number; y: number; intensity: number }> = [];
  private observerInstances: IntersectionObserver[] = [];

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.pageLoadTime = performance.now();
    this.setupEventListeners();
    this.setupPerformanceObserver();
    this.setupScrollTracking();
    this.setupHeatmapTracking();
    this.startPeriodicReporting();
  }

  static getInstance(): SuccessMetricsTracker {
    if (!SuccessMetricsTracker.instance) {
      SuccessMetricsTracker.instance = new SuccessMetricsTracker();
    }
    return SuccessMetricsTracker.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners(): void {
    // Track clicks with context
    document.addEventListener("click", event => {
      const target = event.target as HTMLElement;
      this.trackAction({
        type: "click",
        element: this.getElementSelector(target),
        component: this.getComponentName(target),
        metadata: {
          coordinates: { x: event.clientX, y: event.clientY },
          button: event.button,
          modifiers: {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
          },
        },
      });
    });

    // Track form submissions
    document.addEventListener("submit", event => {
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);
      const data: Record<string, string> = {};

      formData.forEach((value, key) => {
        if (typeof value === "string") {
          data[key] = value;
        }
      });

      this.trackAction({
        type: "form_submit",
        element: this.getElementSelector(form),
        component: this.getComponentName(form),
        metadata: {
          formFields: Object.keys(data),
          formId: form.id,
          formMethod: form.method,
        },
      });
    });

    // Track navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.trackAction({
        type: "navigation",
        value: args[2]?.toString(),
        metadata: { type: "pushState" },
      });
      return originalPushState.apply(history, args);
    };

    history.replaceState = (...args) => {
      this.trackAction({
        type: "navigation",
        value: args[2]?.toString(),
        metadata: { type: "replaceState" },
      });
      return originalReplaceState.apply(history, args);
    };

    window.addEventListener("popstate", () => {
      this.trackAction({
        type: "navigation",
        value: window.location.pathname,
        metadata: { type: "popstate" },
      });
    });

    // Track focus events for accessibility metrics
    document.addEventListener(
      "focus",
      event => {
        const target = event.target as HTMLElement;
        this.trackAction({
          type: "focus",
          element: this.getElementSelector(target),
          component: this.getComponentName(target),
          metadata: {
            focusMethod: event.isTrusted ? "user" : "programmatic",
          },
        });
      },
      true
    );

    // Track key interactions
    document.addEventListener("keydown", event => {
      // Only track meaningful keys
      if (["Enter", "Space", "Escape", "Tab"].includes(event.code)) {
        this.trackAction({
          type: "keypress",
          value: event.code,
          element: this.getElementSelector(event.target as HTMLElement),
          metadata: {
            key: event.key,
            code: event.code,
            modifiers: {
              ctrl: event.ctrlKey,
              shift: event.shiftKey,
              alt: event.altKey,
            },
          },
        });
      }
    });
  }

  private setupPerformanceObserver(): void {
    if ("PerformanceObserver" in window) {
      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.trackAction({
            type: "navigation",
            value: "lcp",
            metadata: {
              lcp: lastEntry.startTime,
              element: (lastEntry as any).element?.tagName,
            },
          });
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      } catch (e) {
        // LCP not supported
      }

      // Observe first input delay
      const fidObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          this.trackAction({
            type: "navigation",
            value: "fid",
            metadata: {
              fid: (entry as any).processingStart - entry.startTime,
              inputType: (entry as any).name,
            },
          });
        });
      });

      try {
        fidObserver.observe({ entryTypes: ["first-input"] });
      } catch (e) {
        // FID not supported
      }
    }
  }

  private setupScrollTracking(): void {
    let maxScrollDepth = 0;
    let ticking = false;

    const updateScrollDepth = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      const scrollDepth = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;

        // Track milestone scroll depths
        const milestones = [25, 50, 75, 90, 100];
        for (const milestone of milestones) {
          if (scrollDepth >= milestone && maxScrollDepth >= milestone) {
            this.trackAction({
              type: "scroll",
              value: milestone,
              metadata: {
                scrollDepth,
                documentHeight,
                windowHeight,
              },
            });
            break;
          }
        }
      }

      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDepth);
        ticking = true;
      }
    });
  }

  private setupHeatmapTracking(): void {
    document.addEventListener("mousemove", event => {
      // Throttle mousemove events
      if (Math.random() < 0.1) {
        // Sample 10% of mouse moves
        this.addHeatmapPoint(event.clientX, event.clientY, 1);
      }
    });

    document.addEventListener("click", event => {
      // Clicks have higher intensity
      this.addHeatmapPoint(event.clientX, event.clientY, 5);
    });
  }

  private addHeatmapPoint(x: number, y: number, intensity: number): void {
    // Normalize coordinates to viewport percentage
    const normalizedX = (x / window.innerWidth) * 100;
    const normalizedY = (y / window.innerHeight) * 100;

    // Find existing point within radius or create new one
    const radius = 5; // percentage
    const existingPoint = this.heatmapData.find(
      point =>
        Math.abs(point.x - normalizedX) < radius &&
        Math.abs(point.y - normalizedY) < radius
    );

    if (existingPoint) {
      existingPoint.intensity += intensity;
    } else {
      this.heatmapData.push({
        x: normalizedX,
        y: normalizedY,
        intensity,
      });
    }

    // Limit heatmap data size
    if (this.heatmapData.length > 1000) {
      this.heatmapData = this.heatmapData
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 500);
    }
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(" ").filter(c => c.length > 0);
      if (classes.length > 0) return `.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  private getComponentName(element: HTMLElement): string {
    // Try to find React component name from closest data attribute or class
    let current = element;
    while (current && current !== document.body) {
      if (current.dataset.component) return current.dataset.component;

      // Check for React-like component class names
      const className = current.className;
      if (typeof className === "string") {
        const componentMatch = className.match(/([A-Z][a-zA-Z0-9]*)/);
        if (componentMatch && componentMatch[1]) {
          return componentMatch[1];
        }
      }

      const parent = current.parentElement;
      if (!parent) break;
      current = parent;
    }
    return "unknown";
  }

  private trackAction(
    actionInput: Omit<UserAction, "id" | "timestamp" | "sessionId">
  ): void {
    const action: UserAction = {
      id: this.generateActionId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      ...actionInput,
    };

    this.actions.push(action);

    // Limit action history size
    if (this.actions.length > 1000) {
      this.actions = this.actions.slice(-500);
    }

    // Check funnel progress
    this.checkFunnelProgress(action);

    // Notify subscribers
    this.notifySubscribers();
  }

  private generateActionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    return localStorage.getItem("userId") || undefined;
  }

  private checkFunnelProgress(action: UserAction): void {
    this.funnels.forEach(funnel => {
      const userProgress = this.getUserFunnelProgress(
        this.sessionId,
        funnel.id
      );
      const nextStep = funnel.steps[userProgress.length];

      if (nextStep && nextStep.condition(action)) {
        userProgress.push({
          stepId: nextStep.id,
          timestamp: action.timestamp,
          actionId: action.id,
        });

        this.setUserFunnelProgress(this.sessionId, funnel.id, userProgress);
      }
    });
  }

  private getUserFunnelProgress(
    sessionId: string,
    funnelId: string
  ): Array<{
    stepId: string;
    timestamp: number;
    actionId: string;
  }> {
    const key = `funnel_${funnelId}_${sessionId}`;
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  private setUserFunnelProgress(
    sessionId: string,
    funnelId: string,
    progress: Array<{
      stepId: string;
      timestamp: number;
      actionId: string;
    }>
  ): void {
    const key = `funnel_${funnelId}_${sessionId}`;
    sessionStorage.setItem(key, JSON.stringify(progress));
  }

  // Public API methods
  defineFunnel(funnel: ConversionFunnel): void {
    this.funnels.set(funnel.id, funnel);
  }

  getEngagementMetrics(): EngagementMetrics {
    const now = Date.now();
    const sessionDuration = now - this.sessionStart;
    const interactions = this.actions.filter(a =>
      ["click", "form_submit", "keypress"].includes(a.type)
    ).length;

    const scrollActions = this.actions.filter(a => a.type === "scroll");
    const maxScrollDepth = Math.max(
      ...scrollActions.map(a => Number(a.value) || 0),
      0
    );

    const navigationActions = this.actions.filter(a => a.type === "navigation");
    const pageViews = navigationActions.length + 1; // +1 for initial page load

    return {
      sessionDuration,
      pageViews,
      interactions,
      scrollDepth: maxScrollDepth,
      timeOnPage: sessionDuration,
      bounceRate: interactions === 0 ? 1 : 0,
      returnVisitor: this.isReturnVisitor(),
    };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const navigationEntries = performance.getEntriesByType("navigation");
    const navigation =
      navigationEntries.length > 0
        ? (navigationEntries[0] as PerformanceNavigationTiming)
        : null;
    const paintEntries = performance.getEntriesByType("paint");

    const fcp = paintEntries.find(
      entry => entry.name === "first-contentful-paint"
    );
    const lcpAction = this.actions.find(a => a.value === "lcp");
    const fidAction = this.actions.find(a => a.value === "fid");

    return {
      loadTime: navigation
        ? navigation.loadEventEnd - navigation.requestStart
        : 0,
      timeToInteractive: navigation
        ? navigation.domInteractive - navigation.requestStart
        : 0,
      firstContentfulPaint: fcp ? fcp.startTime : 0,
      largestContentfulPaint: lcpAction
        ? Number(lcpAction.metadata?.lcp) || 0
        : 0,
      cumulativeLayoutShift: 0, // Would need CLS observer
      firstInputDelay: fidAction ? Number(fidAction.metadata?.fid) || 0 : 0,
    };
  }

  getConversionMetrics(): ConversionMetrics {
    const funnelCompletions: Record<string, number> = {};
    const conversionRates: Record<string, number> = {};
    const dropoffPoints: Record<string, number> = {};
    const averageTimeToConvert: Record<string, number> = {};

    this.funnels.forEach((funnel, funnelId) => {
      const progress = this.getUserFunnelProgress(this.sessionId, funnelId);
      const completed = progress.length === funnel.steps.length;

      funnelCompletions[funnelId] = completed ? 1 : 0;
      conversionRates[funnelId] = completed
        ? 100
        : (progress.length / funnel.steps.length) * 100;

      if (!completed && progress.length > 0) {
        dropoffPoints[funnelId] = progress.length;
      }

      if (completed && progress.length > 1) {
        const lastProgress = progress[progress.length - 1];
        const firstProgress = progress[0];
        if (lastProgress && firstProgress) {
          const timeToConvert =
            lastProgress.timestamp - firstProgress.timestamp;
          averageTimeToConvert[funnelId] = timeToConvert;
        }
      }
    });

    return {
      funnelCompletions,
      conversionRates,
      dropoffPoints,
      averageTimeToConvert,
    };
  }

  private isReturnVisitor(): boolean {
    const visitCount = parseInt(localStorage.getItem("visitCount") || "0");
    return visitCount > 1;
  }

  getSuccessMetrics(): SuccessMetricsData {
    return {
      engagement: this.getEngagementMetrics(),
      performance: this.getPerformanceMetrics(),
      conversions: this.getConversionMetrics(),
      userActions: this.actions.slice(-100), // Last 100 actions
      heatmapData: this.heatmapData.slice(-500), // Top 500 heat points
    };
  }

  private startPeriodicReporting(): void {
    // Update visit count
    const visitCount = parseInt(localStorage.getItem("visitCount") || "0") + 1;
    localStorage.setItem("visitCount", visitCount.toString());

    // Send metrics periodically
    setInterval(() => {
      this.reportMetrics();
    }, 30000); // Every 30 seconds

    // Send metrics on page unload
    window.addEventListener("beforeunload", () => {
      this.reportMetrics(true);
    });
  }

  private async reportMetrics(isUnloading = false): Promise<void> {
    const metrics = this.getSuccessMetrics();

    try {
      const method = isUnloading ? "sendBeacon" : "fetch";

      if (method === "sendBeacon" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/monitoring/metrics",
          JSON.stringify(metrics)
        );
      } else {
        await fetch("/api/monitoring/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metrics),
          keepalive: isUnloading,
        });
      }
    } catch (error) {
      console.warn("Failed to report metrics:", error);
    }
  }

  subscribe(callback: (data: SuccessMetricsData) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const data = this.getSuccessMetrics();
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.warn("Error in metrics subscriber:", error);
      }
    });
  }

  // Cleanup method
  destroy(): void {
    this.observerInstances.forEach(observer => observer.disconnect());
    this.subscribers.clear();
  }
}

// React hooks for success metrics
export function useSuccessMetrics() {
  const tracker = SuccessMetricsTracker.getInstance();
  const [metrics, setMetrics] = useState<SuccessMetricsData | null>(null);
  const refreshInterval = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(tracker.getSuccessMetrics());
    };

    updateMetrics();
    const unsubscribe = tracker.subscribe(updateMetrics);

    // Refresh metrics every 5 seconds
    refreshInterval.current = setInterval(updateMetrics, 5000);

    return () => {
      unsubscribe();
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [tracker]);

  const defineFunnel = useCallback(
    (funnel: ConversionFunnel) => {
      tracker.defineFunnel(funnel);
    },
    [tracker]
  );

  return {
    metrics,
    defineFunnel,
  };
}

// Initialize global metrics tracker
export const successMetrics = SuccessMetricsTracker.getInstance();

// Export types
export type {
  UserAction,
  ConversionFunnel,
  EngagementMetrics,
  PerformanceMetrics,
  ConversionMetrics,
  SuccessMetricsData,
};
