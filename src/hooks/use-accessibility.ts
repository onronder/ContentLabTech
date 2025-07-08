/**
 * Accessibility React Hooks
 * Custom hooks for managing accessibility features in React components
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FocusManager,
  announceToScreenReader,
  LiveRegionManager,
} from "@/lib/utils/accessibility";

/**
 * Hook for managing focus trapping in modals/dialogs
 */
export function useFocusTrap(isActive = false) {
  const containerRef = useRef<HTMLElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      FocusManager.saveFocus();
      cleanupRef.current = FocusManager.trapFocus(containerRef.current);
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (isActive) {
        FocusManager.restoreFocus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for keyboard navigation with arrow keys
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  orientation: "horizontal" | "vertical" = "horizontal"
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const elementsRef = useRef<T[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const elements = elementsRef.current;
      if (elements.length === 0) return;

      const isHorizontal = orientation === "horizontal";
      const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
      const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

      let newIndex = activeIndex;

      switch (e.key) {
        case nextKey:
          newIndex = (activeIndex + 1) % elements.length;
          e.preventDefault();
          break;
        case prevKey:
          newIndex = activeIndex === 0 ? elements.length - 1 : activeIndex - 1;
          e.preventDefault();
          break;
        case "Home":
          newIndex = 0;
          e.preventDefault();
          break;
        case "End":
          newIndex = elements.length - 1;
          e.preventDefault();
          break;
        default:
          return;
      }

      if (newIndex !== activeIndex && elements[newIndex]) {
        setActiveIndex(newIndex);
        elements[newIndex]?.focus();
      }
    },
    [activeIndex, orientation]
  );

  const registerElement = useCallback((element: T | null, index: number) => {
    if (element) {
      elementsRef.current[index] = element;
    }
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    registerElement,
  };
}

/**
 * Hook for managing ARIA live announcements
 */
export function useAnnouncements(regionId = "announcements") {
  const regionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    regionRef.current = LiveRegionManager.createRegion(regionId, "polite");

    return () => {
      if (regionRef.current) {
        LiveRegionManager.clear(regionId);
      }
    };
  }, [regionId]);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (priority === "assertive") {
        announceToScreenReader(message, "assertive");
      } else {
        LiveRegionManager.announce(regionId, message);
      }
    },
    [regionId]
  );

  const clear = useCallback(() => {
    LiveRegionManager.clear(regionId);
  }, [regionId]);

  return { announce, clear };
}

/**
 * Hook for managing reduced motion preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for managing high contrast preferences
 */
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: high)");
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersHighContrast;
}

/**
 * Hook for managing focus-visible behavior
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [hadKeyboardEvent, setHadKeyboardEvent] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey || e.ctrlKey) return;
      setHadKeyboardEvent(true);
    };

    const handleMouseDown = () => {
      setHadKeyboardEvent(false);
    };

    const handleFocus = () => {
      setIsFocusVisible(hadKeyboardEvent);
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("focus", handleFocus, true);
    document.addEventListener("blur", handleBlur, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("focus", handleFocus, true);
      document.removeEventListener("blur", handleBlur, true);
    };
  }, [hadKeyboardEvent]);

  return isFocusVisible;
}

/**
 * Hook for managing ARIA expanded state
 */
export function useAriaExpanded(initialExpanded = false) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    setIsExpanded,
    toggle,
    expand,
    collapse,
    "aria-expanded": isExpanded,
  };
}

/**
 * Hook for managing ARIA selected state
 */
export function useAriaSelected<T = string>(
  options: T[],
  initialSelected?: T,
  multiSelect = false
) {
  const [selected, setSelected] = useState<T | T[]>(
    multiSelect ? [] : initialSelected || options[0]
  );

  const select = useCallback(
    (option: T) => {
      if (multiSelect) {
        setSelected(prev => {
          const prevArray = Array.isArray(prev) ? prev : [];
          return prevArray.includes(option)
            ? prevArray.filter(item => item !== option)
            : [...prevArray, option];
        });
      } else {
        setSelected(option);
      }
    },
    [multiSelect]
  );

  const isSelected = useCallback(
    (option: T) => {
      if (multiSelect) {
        return Array.isArray(selected) && selected.includes(option);
      }
      return selected === option;
    },
    [selected, multiSelect]
  );

  return {
    selected,
    select,
    isSelected,
    setSelected,
  };
}

/**
 * Hook for managing roving tabindex
 */
export function useRovingTabIndex<T extends HTMLElement = HTMLElement>(
  elements: T[],
  initialIndex = 0
) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const getTabIndex = useCallback(
    (index: number) => {
      return index === activeIndex ? 0 : -1;
    },
    [activeIndex]
  );

  const setActiveItem = useCallback(
    (index: number) => {
      if (index >= 0 && index < elements.length) {
        setActiveIndex(index);
        elements[index]?.focus();
      }
    },
    [elements]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, currentIndex: number) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          setActiveItem((currentIndex + 1) % elements.length);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          setActiveItem(
            currentIndex === 0 ? elements.length - 1 : currentIndex - 1
          );
          break;
        case "Home":
          e.preventDefault();
          setActiveItem(0);
          break;
        case "End":
          e.preventDefault();
          setActiveItem(elements.length - 1);
          break;
      }
    },
    [elements, setActiveItem]
  );

  return {
    activeIndex,
    getTabIndex,
    setActiveItem,
    handleKeyDown,
  };
}

/**
 * Hook for detecting and announcing form validation errors
 */
export function useFormValidationAnnouncements() {
  const { announce } = useAnnouncements("form-validation");

  const announceErrors = useCallback(
    (errors: string[]) => {
      if (errors.length === 0) return;

      const message =
        errors.length === 1
          ? `Error: ${errors[0]}`
          : `${errors.length} errors found: ${errors.join(", ")}`;

      announce(message, "assertive");
    },
    [announce]
  );

  const announceSuccess = useCallback(
    (message = "Form submitted successfully") => {
      announce(message, "polite");
    },
    [announce]
  );

  return {
    announceErrors,
    announceSuccess,
  };
}
