/**
 * Lazy Loading Form Components
 * Dynamic imports with loading states and error boundaries
 */

import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Loading component for lazy imports
const ComponentLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("flex items-center justify-center p-4", className)}>
    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    <span className="text-muted-foreground ml-2 text-sm">
      Loading component...
    </span>
  </div>
);

// Error boundary component
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Lazy component loading error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="text-destructive p-4 text-center text-sm">
            Failed to load component. Please try again.
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading with error boundary
function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);

  return React.forwardRef<any, P>((props, ref) => (
    <LazyComponentErrorBoundary fallback={fallback}>
      <Suspense fallback={<ComponentLoader />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyComponentErrorBoundary>
  ));
}

// Lazy-loaded form components with code splitting
export const LazyEnhancedInput = withLazyLoading((() =>
  import("./enhanced-form-controls").then(m => ({
    default: m.EnhancedInput as any,
  }))) as any) as any;

export const LazyEnhancedTextarea = withLazyLoading(() =>
  import("./enhanced-form-controls").then(m => ({
    default: m.EnhancedTextarea as any,
  }))
) as any;

export const LazyPasswordInput = withLazyLoading(() =>
  import("./enhanced-form-controls").then(m => ({
    default: m.PasswordInput as any,
  }))
) as any;

export const LazySearchInput = withLazyLoading(() =>
  import("./enhanced-form-controls").then(m => ({
    default: m.SearchInput as any,
  }))
) as any;

export const LazyTagInput = withLazyLoading(() =>
  import("./enhanced-form-controls").then(m => ({ default: m.TagInput as any }))
) as any;

export const LazyEnhancedCombobox = withLazyLoading(() =>
  import("./enhanced-form-controls").then(m => ({
    default: m.EnhancedCombobox as any,
  }))
) as any;

export const LazySmartFormWizard = withLazyLoading(() =>
  import("./smart-form-wizard").then(m => ({
    default: m.SmartFormWizard as any,
  }))
) as any;

export const LazyEnhancedDialog = withLazyLoading(() =>
  import("./enhanced-dialog").then(m => ({ default: m.EnhancedDialog as any }))
) as any;

export const LazyEnhancedDialogContent = withLazyLoading(() =>
  import("./enhanced-dialog").then(m => ({
    default: m.EnhancedDialogContent as any,
  }))
) as any;

// Bundle-aware lazy loading with preloading
export class LazyFormComponentManager {
  private static preloadedComponents = new Set<string>();

  static preloadComponent(componentName: string) {
    if (this.preloadedComponents.has(componentName)) return;

    this.preloadedComponents.add(componentName);

    // Preload component based on name
    switch (componentName) {
      case "EnhancedInput":
        import("./enhanced-form-controls");
        break;
      case "SmartFormWizard":
        import("./smart-form-wizard");
        break;
      case "EnhancedDialog":
        import("./enhanced-dialog");
        break;
      // Add more components as needed
    }
  }

  static preloadOnInteraction(
    componentName: string,
    triggerElement?: HTMLElement
  ) {
    if (!triggerElement) return;

    const preload = () => this.preloadComponent(componentName);

    // Preload on hover/focus for better UX
    triggerElement.addEventListener("mouseenter", preload, { once: true });
    triggerElement.addEventListener("focus", preload, { once: true });

    // Cleanup function
    return () => {
      triggerElement.removeEventListener("mouseenter", preload);
      triggerElement.removeEventListener("focus", preload);
    };
  }

  static preloadCriticalComponents() {
    // Preload components that are likely to be used immediately
    const criticalComponents = [
      "EnhancedInput",
      "EnhancedTextarea",
      "PasswordInput",
    ];

    // Use requestIdleCallback for non-blocking preloading
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => {
        criticalComponents.forEach(component =>
          this.preloadComponent(component)
        );
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        criticalComponents.forEach(component =>
          this.preloadComponent(component)
        );
      }, 100);
    }
  }
}

// Hook for intelligent preloading
export function useIntelligentPreloading() {
  React.useEffect(() => {
    // Preload critical components after initial render
    LazyFormComponentManager.preloadCriticalComponents();

    // Preload additional components based on user behavior
    const handleMouseMove = () => {
      // User is actively interacting, preload more components
      LazyFormComponentManager.preloadComponent("SmartFormWizard");
      LazyFormComponentManager.preloadComponent("EnhancedDialog");

      // Remove listener after first interaction
      document.removeEventListener("mousemove", handleMouseMove);
    };

    document.addEventListener("mousemove", handleMouseMove, { once: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
}

// Conditional loading component
interface ConditionalLoadProps {
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export const ConditionalLoad: React.FC<ConditionalLoadProps> = ({
  condition,
  children,
  fallback,
  loadingComponent = <ComponentLoader />,
}) => {
  if (!condition) {
    return fallback ? <>{fallback}</> : null;
  }

  return <Suspense fallback={loadingComponent}>{children}</Suspense>;
};

// Progressive enhancement wrapper
interface ProgressiveEnhancementProps {
  basicComponent: React.ReactNode;
  enhancedComponent: React.ReactNode;
  shouldEnhance?: boolean;
}

export const ProgressiveEnhancement: React.FC<ProgressiveEnhancementProps> = ({
  basicComponent,
  enhancedComponent,
  shouldEnhance = true,
}) => {
  const [isEnhanced, setIsEnhanced] = React.useState(false);

  React.useEffect(() => {
    if (shouldEnhance) {
      // Delay enhancement to avoid blocking initial render
      const timer = setTimeout(() => setIsEnhanced(true), 50);
      return () => clearTimeout(timer);
    }
  }, [shouldEnhance]);

  if (!shouldEnhance || !isEnhanced) {
    return <>{basicComponent}</>;
  }

  return <Suspense fallback={basicComponent}>{enhancedComponent}</Suspense>;
};

// Resource-aware loading
export function useResourceAwareLoading() {
  const [shouldLazyLoad, setShouldLazyLoad] = React.useState(true);

  React.useEffect(() => {
    // Check connection and device capabilities
    const connection = (navigator as any).connection;
    const deviceMemory = (navigator as any).deviceMemory;

    // Disable lazy loading on fast connections and high-end devices
    if (connection?.effectiveType === "4g" && deviceMemory >= 4) {
      setShouldLazyLoad(false);
    }

    // Enable lazy loading on slow connections
    if (
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g"
    ) {
      setShouldLazyLoad(true);
    }
  }, []);

  return shouldLazyLoad;
}

// Performance-aware component loader
interface PerformanceAwareLoadProps {
  children: React.ReactNode;
  loadingStrategy?: "immediate" | "lazy" | "auto";
  performanceThreshold?: number; // ms
}

export const PerformanceAwareLoad: React.FC<PerformanceAwareLoadProps> = ({
  children,
  loadingStrategy = "auto",
  performanceThreshold = 100,
}) => {
  const [shouldLoad, setShouldLoad] = React.useState(
    loadingStrategy === "immediate"
  );
  const shouldLazyLoad = useResourceAwareLoading();

  React.useEffect(() => {
    if (loadingStrategy === "immediate") {
      setShouldLoad(true);
      return;
    }

    if (loadingStrategy === "lazy") {
      // Load after a short delay
      const timer = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timer);
    }

    // Auto strategy - based on performance metrics
    const startTime = performance.now();

    const checkPerformance = () => {
      const currentTime = performance.now();
      const pageLoadTime = currentTime - startTime;

      // If page loads quickly and we should lazy load, load the component
      if (pageLoadTime < performanceThreshold && shouldLazyLoad) {
        setShouldLoad(true);
      } else {
        // Otherwise, wait for user interaction
        const handleInteraction = () => {
          setShouldLoad(true);
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("keydown", handleInteraction);
        };

        document.addEventListener("click", handleInteraction, { once: true });
        document.addEventListener("keydown", handleInteraction, { once: true });
      }
    };

    // Check performance after DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", checkPerformance);
    } else {
      checkPerformance();
    }
  }, [loadingStrategy, performanceThreshold, shouldLazyLoad]);

  if (!shouldLoad) {
    return <ComponentLoader />;
  }

  return <>{children}</>;
};
