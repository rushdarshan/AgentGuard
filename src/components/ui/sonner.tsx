import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#FFFFFF",
          border: "1px solid #EAEAEA",
          color: "#111111",
        },
      }}
    />
  );
}
