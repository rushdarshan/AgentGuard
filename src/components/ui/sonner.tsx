import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#121212",
          border: "1px solid #2A2A2A",
          color: "#EAEAEA",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "12px",
          borderRadius: "0",
        },
      }}
    />
  );
}
