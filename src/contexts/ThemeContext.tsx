import { createContext, useContext, ReactNode } from "react";

interface ThemeContextType {
  theme: "dark";
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark" });

interface Props {
  children: ReactNode;
  defaultTheme?: "dark";
}

export function ThemeProvider({ children, defaultTheme = "dark" }: Props) {
  return (
    <ThemeContext.Provider value={{ theme: defaultTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
