/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliance helpers and testing utilities
 */

/**
 * Color contrast calculation utility
 * Ensures WCAG 2.1 AA compliance (4.5:1 for normal text, 3:1 for large text)
 */
export function calculateContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hex.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    const [r, g, b] = rgb.map(val => {
      const normalized = val / 255;
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: string, 
  background: string, 
  isLargeText = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Screen reader announcement utility
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  
  static saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      this.focusStack.push(activeElement);
    }
  }
  
  static restoreFocus(): void {
    const element = this.focusStack.pop();
    if (element && element.focus) {
      element.focus();
    }
  }
  
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  static handleArrowKeys(
    elements: HTMLElement[], 
    currentIndex: number, 
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ) {
    return (e: KeyboardEvent) => {
      const isHorizontal = orientation === 'horizontal';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
      
      let newIndex = currentIndex;
      
      if (e.key === nextKey) {
        newIndex = (currentIndex + 1) % elements.length;
        e.preventDefault();
      } else if (e.key === prevKey) {
        newIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
        e.preventDefault();
      } else if (e.key === 'Home') {
        newIndex = 0;
        e.preventDefault();
      } else if (e.key === 'End') {
        newIndex = elements.length - 1;
        e.preventDefault();
      }
      
      if (newIndex !== currentIndex && elements[newIndex]) {
        elements[newIndex].focus();
      }
    };
  }
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTester {
  static checkColorContrast(element: HTMLElement): {
    passes: boolean;
    ratio: number;
    requirement: number;
  } {
    const styles = getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    const fontSize = parseFloat(styles.fontSize);
    const fontWeight = styles.fontWeight;
    
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
    const requirement = isLargeText ? 3 : 4.5;
    
    // Convert colors to hex for calculation
    const colorHex = this.rgbToHex(color);
    const bgHex = this.rgbToHex(backgroundColor);
    
    const ratio = calculateContrastRatio(colorHex, bgHex);
    
    return {
      passes: ratio >= requirement,
      ratio,
      requirement
    };
  }
  
  static checkFocusIndicators(): HTMLElement[] {
    const focusableElements = document.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]'
    ) as NodeListOf<HTMLElement>;
    
    const elementsWithoutFocus: HTMLElement[] = [];
    
    focusableElements.forEach(element => {
      // Skip hidden elements
      if (element.offsetParent === null) return;
      
      element.focus();
      const styles = getComputedStyle(element, ':focus');
      
      // Check for focus indicators
      const hasOutline = styles.outline !== 'none' && styles.outline !== '0px';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasBorder = styles.borderColor !== styles.borderColor; // Color change
      
      if (!hasOutline && !hasBoxShadow && !hasBorder) {
        elementsWithoutFocus.push(element);
      }
    });
    
    return elementsWithoutFocus;
  }
  
  static checkAriaLabels(): HTMLElement[] {
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"]'
    ) as NodeListOf<HTMLElement>;
    
    const elementsWithoutLabels: HTMLElement[] = [];
    
    interactiveElements.forEach(element => {
      const hasAriaLabel = element.hasAttribute('aria-label');
      const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
      const hasTitle = element.hasAttribute('title');
      const hasTextContent = element.textContent?.trim();
      const hasAltText = (element as HTMLImageElement).alt;
      
      if (!hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasTextContent && !hasAltText) {
        elementsWithoutLabels.push(element);
      }
    });
    
    return elementsWithoutLabels;
  }
  
  private static rgbToHex(rgb: string): string {
    // Handle rgb() format
    const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`;
    }
    
    // Handle rgba() format
    const rgbaMatch = rgb.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
      const [, r, g, b] = rgbaMatch;
      return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`;
    }
    
    // Return as-is if already hex or named color
    return rgb;
  }
}

/**
 * React Hook for managing focus announcements
 */
export function useFocusAnnouncement() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  };
  
  return { announce };
}

/**
 * React Hook for keyboard navigation
 */
export function useKeyboardNavigation(
  elements: HTMLElement[], 
  orientation: 'horizontal' | 'vertical' = 'horizontal'
) {
  const handleKeyDown = (currentIndex: number) => {
    return KeyboardNavigation.handleArrowKeys(elements, currentIndex, orientation);
  };
  
  return { handleKeyDown };
}

/**
 * ARIA live region manager
 */
export class LiveRegionManager {
  private static regions: Map<string, HTMLElement> = new Map();
  
  static createRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
    if (this.regions.has(id)) {
      return this.regions.get(id)!;
    }
    
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    
    document.body.appendChild(region);
    this.regions.set(id, region);
    
    return region;
  }
  
  static announce(regionId: string, message: string): void {
    const region = this.regions.get(regionId);
    if (region) {
      region.textContent = message;
    }
  }
  
  static clear(regionId: string): void {
    const region = this.regions.get(regionId);
    if (region) {
      region.textContent = '';
    }
  }
  
  static cleanup(): void {
    this.regions.forEach(region => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    this.regions.clear();
  }
}