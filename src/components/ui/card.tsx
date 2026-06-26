import { HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200 hover:border-accent/20 hover:shadow-glow-sm ${className}`}
      {...props}
    />
  )
);
Card.displayName = "Card";
