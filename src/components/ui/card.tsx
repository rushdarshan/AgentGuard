import { HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border border-[#EAEAEA] bg-white transition-shadow duration-200 hover:shadow-subtle ${className}`}
      {...props}
    />
  )
);
Card.displayName = "Card";
