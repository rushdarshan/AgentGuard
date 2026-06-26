import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "rgb(3, 7, 18)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgb(226, 232, 240)",
        },
      }}
    />
  );
}
