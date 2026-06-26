import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "lg" | "default";
}

const variants: Record<string, string> = {
  default: "bg-accent text-black hover:bg-accent/90 hover:shadow-glow-sm",
  ghost: "text-muted-foreground hover:text-accent hover:bg-white/5",
  outline: "border border-border/50 text-foreground hover:border-accent/30 hover:bg-white/5",
};

const sizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  default: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-95 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
