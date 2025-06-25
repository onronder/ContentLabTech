/**
 * Scroll Reveal Hook
 * Advanced scroll-triggered animations with intersection observer
 */

"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  triggerOnce?: boolean;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
}

export const useScrollReveal = ({
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
  delay = 0,
  triggerOnce = true,
  direction = "up",
  distance = 30,
  duration = 600,
}: UseScrollRevealOptions = {}) => {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          if (!hasTriggered || !triggerOnce) {
            setTimeout(() => {
              setIsVisible(true);
              if (triggerOnce) {
                setHasTriggered(true);
              }
            }, delay);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, delay, triggerOnce, hasTriggered]);

  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0)";

    switch (direction) {
      case "up":
        return `translate3d(0, ${distance}px, 0)`;
      case "down":
        return `translate3d(0, -${distance}px, 0)`;
      case "left":
        return `translate3d(${distance}px, 0, 0)`;
      case "right":
        return `translate3d(-${distance}px, 0, 0)`;
      default:
        return `translate3d(0, ${distance}px, 0)`;
    }
  };

  const style = {
    opacity: isVisible ? 1 : 0,
    transform: getTransform(),
    transition: `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
  };

  return {
    ref: elementRef,
    style,
    isVisible,
  };
};

// Staggered animation hook for lists
export const useStaggeredReveal = (itemCount: number, staggerDelay = 100) => {
  const [revealedItems, setRevealedItems] = useState<number[]>([]);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          // Reveal items with stagger effect
          for (let i = 0; i < itemCount; i++) {
            setTimeout(() => {
              setRevealedItems(prev => [...prev, i]);
            }, i * staggerDelay);
          }
          observer.unobserve(container);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [itemCount, staggerDelay]);

  const getItemStyle = (index: number) => ({
    opacity: revealedItems.includes(index) ? 1 : 0,
    transform: revealedItems.includes(index)
      ? "translate3d(0, 0, 0)"
      : "translate3d(0, 20px, 0)",
    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  });

  return {
    containerRef,
    getItemStyle,
    revealedItems,
  };
};

// Parallax scroll effect
export const useParallax = (speed = 0.5) => {
  const elementRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!elementRef.current) return;

      const scrolled = window.pageYOffset;
      const parallax = scrolled * speed;

      setOffset(parallax);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  const style = {
    transform: `translate3d(0, ${offset}px, 0)`,
  };

  return {
    ref: elementRef,
    style,
  };
};
