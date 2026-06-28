import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-10 w-full border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 font-mono text-sm text-[#EAEAEA] placeholder:text-[#8A8A8A] focus:outline-none focus:border-[#E61919] ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
