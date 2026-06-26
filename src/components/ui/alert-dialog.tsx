import { ReactNode, createContext, useContext } from "react";

const AlertContext = createContext<{ open: boolean; onOpenChange: (v: boolean) => void }>({
  open: false,
  onOpenChange: () => {},
});

export function AlertDialog({
  children,
  open = false,
  onOpenChange,
}: {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  if (!open) return null;
  return (
    <AlertContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg border border-border/50 bg-card p-6 w-full max-w-md mx-4 backdrop-blur-sm">
          {children}
        </div>
      </div>
    </AlertContext.Provider>
  );
}

export function AlertDialogContent({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function AlertDialogHeader({ children }: { children?: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function AlertDialogTitle({ children }: { children?: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function AlertDialogDescription({ children }: { children?: ReactNode }) {
  return <p className="text-sm text-muted-foreground mt-1">{children}</p>;
}

export function AlertDialogFooter({ children }: { children?: ReactNode }) {
  return <div className="flex justify-end gap-3 mt-6">{children}</div>;
}

export function AlertDialogAction({ children, onClick, className = "" }: { children?: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-accent text-black hover:bg-accent/90 transition-all ${className}`}
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({ children, onClick, className = "" }: { children?: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium border border-border/50 hover:bg-white/5 transition-all ${className}`}
    >
      {children}
    </button>
  );
}
