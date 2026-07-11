import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChartBar, Users, Clock, Star, Volume2, Terminal, Network, FileText, LogOut, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/_core/ThemeProvider";

interface Props {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "DASHBOARD", icon: ChartBar },
  { href: "/agents", label: "AGENTS", icon: Users },
  { href: "/runs", label: "HISTORY", icon: Clock },
  { href: "/leaderboard", label: "RANKINGS", icon: Star },
  { href: "/voice-demo", label: "VOICE", icon: Volume2 },
  { href: "/playground", label: "PLAYGROUND", icon: Terminal },
  { href: "/graph", label: "GRAPH", icon: Network },
  { href: "/logs", label: "LOGS", icon: FileText },
];

export default function DashboardLayout({ children }: Props) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA] bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:24px_24px]">
      <nav className="border-b-2 border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="container flex items-center justify-between py-2 md:py-0">
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <span className="font-mono text-[9px] text-[#E61919] tracking-[0.15em]">®</span>
            <span className="font-mono text-xs md:text-sm font-bold tracking-[0.08em] text-[#EAEAEA] whitespace-nowrap">[ AGENTGUARD ]</span>
          </Link>

          <div className="hidden md:flex items-center flex-1 justify-center px-4">
            {navItems.map((item) => {
              const active = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 w-[100px] h-14 font-mono text-[10px] tracking-[0.08em] border-l ${active ? "border-r border-r-[#2A2A2A]" : ""} border-[#2A2A2A] transition-colors ${
                      active
                        ? "bg-[#EAEAEA] text-[#0A0A0A]"
                        : "bg-transparent text-[#8A8A8A] hover:bg-[#121212] hover:text-[#EAEAEA]"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center h-full shrink-0">
            <button onClick={toggle} className="flex flex-col items-center justify-center w-12 h-14 border-l border-r border-[#2A2A2A] font-mono text-[9px] tracking-[0.1em] text-[#8A8A8A] hover:bg-[#121212] hover:text-[#EAEAEA] transition-colors" title="Toggle theme">
              {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>
            <Link href="/" className="hidden md:inline h-full">
              <button className="flex flex-col items-center justify-center gap-1 w-[100px] h-14 font-mono text-[10px] tracking-[0.08em] text-[#8A8A8A] hover:bg-[#121212] hover:text-[#E61919] transition-colors border-r border-[#2A2A2A]">
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                HOME
              </button>
            </Link>
            <button
              className="md:hidden px-2 py-1.5 font-mono text-sm text-[#8A8A8A] border border-transparent hover:border-[#2A2A2A] ml-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-b border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="container py-2 space-y-1">
            {navItems.map((item) => {
              const active = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                  <button
                    className={`w-full text-left px-3 py-2 font-mono text-sm tracking-[0.08em] border ${
                      active
                        ? "bg-[#EAEAEA] text-[#0A0A0A] border-[#EAEAEA]"
                        : "bg-transparent text-[#8A8A8A] border-transparent"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 inline-block mr-2" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <button className="w-full text-left px-3 py-2 font-mono text-sm tracking-[0.08em] text-[#8A8A8A] border border-transparent">
                <LogOut className="h-3.5 w-3.5 inline-block mr-2" />
                HOME
              </button>
            </Link>
          </div>
        </div>
      )}

      <main className="container py-4 md:py-6">{children}</main>
    </div>
  );
}
