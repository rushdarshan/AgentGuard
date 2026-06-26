import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-10 w-full rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-sm placeholder:text-[#787774] focus:outline-none focus:border-[#111111] ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
