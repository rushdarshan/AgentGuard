import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "cyberpunk" | "professional";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "cyberpunk", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("cyberpunk");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === "cyberpunk" ? "professional" : "cyberpunk") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
