import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardIcon, GlobeIcon, ClockIcon, ExitIcon, LightningBoltIcon, MixIcon, StarFilledIcon, SpeakerLoudIcon, SunIcon, MoonIcon, HamburgerMenuIcon, Cross1Icon, ReaderIcon } from "@radix-ui/react-icons";
import { useTheme } from "@/_core/ThemeProvider";

interface Props {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "DASHBOARD", icon: DashboardIcon },
  { href: "/agents", label: "AGENTS", icon: GlobeIcon },
  { href: "/runs", label: "HISTORY", icon: ClockIcon },
  { href: "/leaderboard", label: "RANKINGS", icon: StarFilledIcon },
  { href: "/voice-demo", label: "VOICE", icon: SpeakerLoudIcon },
  { href: "/playground", label: "PLAYGROUND", icon: MixIcon },
  { href: "/logs", label: "LOGS", icon: ReaderIcon },
];

export default function DashboardLayout({ children }: Props) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA]">
      <nav className="border-b-2 border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="container flex items-center justify-between py-2 md:py-0">
          <div className="flex items-center gap-0 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 group shrink-0 pr-6">
              <span className="font-mono text-[10px] text-[#E61919] tracking-[0.15em]">®</span>
              <span className="font-mono text-sm md:text-base font-bold tracking-[0.08em] text-[#EAEAEA] whitespace-nowrap">[ AGENTGUARD ]</span>
            </Link>
            <span data-barcode className="hidden md:inline-block border-l border-[#2A2A2A] h-10 px-4"></span>
            <div className="hidden md:flex items-center">
              {navItems.map((item) => {
                const active = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`px-4 py-3 h-full font-mono text-sm tracking-[0.08em] border-l border-[#2A2A2A] ${
                        active
                          ? "bg-[#EAEAEA] text-[#0A0A0A]"
                          : "bg-transparent text-[#8A8A8A] hover:bg-[#121212] hover:text-[#EAEAEA]"
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5 inline-block mr-1.5" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center h-full shrink-0">
            <button onClick={toggle} className="h-full px-4 border-l border-[#2A2A2A] font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A] hover:bg-[#121212] hover:text-[#EAEAEA]" title="Toggle theme">
              {theme === "cyberpunk" ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
            </button>
            <div className="hidden md:flex items-center h-full px-4 border-l border-[#2A2A2A]">
              <span className="font-mono text-[10px] text-[#E61919] tracking-[0.15em] border border-[#E61919] px-1.5 py-0.5">REV 2.6</span>
            </div>
            <Link href="/" className="hidden md:inline h-full">
              <button className="h-full px-4 border-l border-[#2A2A2A] font-mono text-sm tracking-[0.08em] text-[#8A8A8A] hover:bg-[#121212] hover:text-[#E61919]">
                <ExitIcon className="h-3.5 w-3.5 inline-block mr-1.5" />
                HOME
              </button>
            </Link>
            <button
              className="md:hidden px-2 py-1.5 font-mono text-sm text-[#8A8A8A] border border-transparent hover:border-[#2A2A2A]"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <Cross1Icon className="h-4 w-4" /> : <HamburgerMenuIcon className="h-4 w-4" />}
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
                <ExitIcon className="h-3.5 w-3.5 inline-block mr-2" />
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
