import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`flex min-h-20 w-full border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 font-mono text-sm text-[#EAEAEA] placeholder:text-[#8A8A8A] focus:outline-none focus:border-[#E61919] ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
