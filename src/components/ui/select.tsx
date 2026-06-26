import { SelectHTMLAttributes, createContext, useContext, useState, ReactNode } from "react";

const SelectContext = createContext<{
  value: string;
  onChange: (v: string) => void;
} | null>(null);

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

export function Select({ value = "", onValueChange, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange || (() => {}) }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children }: { className?: string; children?: ReactNode }) {
  const ctx = useContext(SelectContext);
  return (
    <div className={`flex h-10 w-full items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2 text-sm cursor-pointer ${className}`}>
      {children}
    </div>
  );
}

export function SelectValue({ placeholder = "" }: { placeholder?: string }) {
  const ctx = useContext(SelectContext);
  return <span className={ctx?.value ? "text-foreground" : "text-muted-foreground"}>{ctx?.value || placeholder}</span>;
}

export function SelectContent({ children }: { children?: ReactNode }) {
  return <div className="absolute z-50 mt-1 w-full rounded-lg border border-border/50 bg-card backdrop-blur-sm">{children}</div>;
}

export function SelectItem({ value, children }: { value: string; children?: ReactNode }) {
  const ctx = useContext(SelectContext);
  return (
    <div
      className="px-3 py-2 text-sm cursor-pointer hover:bg-white/5"
      onClick={() => ctx?.onChange(value)}
    >
      {children}
    </div>
  );
}
