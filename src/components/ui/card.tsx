import { HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`border border-[#2A2A2A] bg-[#121212] ${className}`}
      {...props}
    />
  )
);
Card.displayName = "Card";
