import { forwardRef } from "react";

interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className = "", ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value?.[0] ?? 50}
      onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
      className={`w-full h-2 rounded-full appearance-none bg-border cursor-pointer accent-[#00d9ff] ${className}`}
      {...props}
    />
  )
);
Slider.displayName = "Slider";
