/**
 * Interactive Button Component
 * Advanced micro-interactions with Figma-inspired animations
 */

"use client";

import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InteractiveButtonProps extends React.ComponentProps<"button"> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "magnetic"
    | "glass";
  effect?: "ripple" | "glow" | "lift" | "tilt" | "scale" | "pulse" | "magnetic";
  magneticStrength?: number;
  glowColor?: string;
  children: React.ReactNode;
}

export const InteractiveButton = ({
  className,
  variant = "default",
  effect = "lift",
  magneticStrength = 0.3,
  glowColor,
  children,
  onMouseMove,
  onMouseLeave,
  onClick,
  ...props
}: InteractiveButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<
    Array<{ id: string; x: number; y: number }>
  >([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (effect === "magnetic" && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) * magneticStrength;
        const deltaY = (e.clientY - centerY) * magneticStrength;

        setMagneticOffset({ x: deltaX, y: deltaY });
      }

      onMouseMove?.(e);
    },
    [effect, magneticStrength, onMouseMove]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      setMagneticOffset({ x: 0, y: 0 });
      onMouseLeave?.(e);
    },
    [onMouseLeave]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (effect === "ripple" && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
          id: Date.now().toString(),
          x,
          y,
        };

        setRipples(prev => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
        }, 600);
      }

      onClick?.(e);
    },
    [effect, onClick]
  );

  const getEffectClasses = () => {
    const effects = {
      lift: "hover-lift",
      glow: "hover-glow",
      tilt: "hover-tilt",
      scale: "hover-scale",
      pulse: "animate-pulse-glow",
      magnetic: "magnetic",
      ripple: "ripple-effect",
    };

    return effects[effect] || "";
  };

  const getVariantClasses = () => {
    if (variant === "magnetic") {
      return cn(
        "relative overflow-hidden",
        "bg-gradient-to-r from-blue-600 to-purple-600",
        "text-white border-0",
        "hover:from-blue-700 hover:to-purple-700",
        "transition-all duration-300 ease-out",
        "shadow-lg hover:shadow-xl",
        "btn-magnetic"
      );
    }

    if (variant === "glass") {
      return cn(
        "glass-card",
        "border border-white/20",
        "text-gray-700 hover:text-gray-900",
        "shadow-lg backdrop-blur-xl"
      );
    }

    return "";
  };

  const buttonStyle =
    effect === "magnetic"
      ? {
          transform: `translate(${magneticOffset.x}px, ${magneticOffset.y}px)`,
          transition:
            magneticOffset.x === 0 && magneticOffset.y === 0
              ? "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
        }
      : undefined;

  const customGlow =
    glowColor && isHovered
      ? {
          boxShadow: `0 0 20px ${glowColor}15, 0 5px 25px ${glowColor}10`,
        }
      : undefined;

  return (
    <Button
      ref={buttonRef}
      variant={
        variant === "magnetic" || variant === "glass" ? "default" : variant
      }
      className={cn(
        getEffectClasses(),
        getVariantClasses(),
        "relative overflow-hidden",
        "focus-ring",
        "state-transition",
        className
      )}
      style={{ ...buttonStyle, ...customGlow }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {/* Ripple Effects */}
      {effect === "ripple" &&
        ripples.map(ripple => (
          <span
            key={ripple.id}
            className="pointer-events-none absolute"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.5)",
              transform: "translate(-50%, -50%)",
              animation: "ripple 0.6s ease-out",
            }}
          />
        ))}

      {/* Shimmer Effect for Magnetic Variant */}
      {variant === "magnetic" && (
        <div className="absolute inset-0 -top-2 -bottom-2">
          <div
            className="animate-shimmer absolute inset-0 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ left: "-100%", animationDuration: "3s" }}
          />
        </div>
      )}

      {/* Glass Reflection */}
      {variant === "glass" && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      <span className="relative z-10">{children}</span>
    </Button>
  );
};
