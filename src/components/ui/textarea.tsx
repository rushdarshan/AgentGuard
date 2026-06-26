import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`flex min-h-20 w-full rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-sm placeholder:text-[#787774] focus:outline-none focus:border-[#111111] ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
