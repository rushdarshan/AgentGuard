import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { DashboardIcon, GlobeIcon, ClockIcon, ExitIcon, LightningBoltIcon, MixIcon, StarFilledIcon, SpeakerLoudIcon, SunIcon, MoonIcon } from "@radix-ui/react-icons";
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
];

export default function DashboardLayout({ children }: Props) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA]">
      <nav className="border-b-2 border-[#2A2A2A]">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <span className="font-mono text-[10px] text-[#E61919] tracking-[0.15em]">®</span>
              <span className="font-mono text-base font-bold tracking-[0.08em] text-[#EAEAEA]">[ AGENTGUARD ]</span>
            </Link>
            <span data-barcode></span>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`px-3 py-1.5 font-mono text-sm tracking-[0.08em] border ${
                        active
                          ? "bg-[#EAEAEA] text-[#0A0A0A] border-[#EAEAEA]"
                          : "bg-transparent text-[#6B6B6B] border-transparent hover:text-[#EAEAEA] hover:border-[#2A2A2A]"
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
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="px-2 py-1.5 font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B] border border-transparent hover:border-[#2A2A2A] hover:text-[#EAEAEA]" title="Toggle theme">
              {theme === "cyberpunk" ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
            </button>
            <span className="font-mono text-[10px] text-[#8A8A8A] tracking-[0.15em] border border-[#2A2A2A] px-1.5 py-0.5">REV 2.6</span>
            <Link href="/">
              <button className="px-3 py-1.5 font-mono text-sm tracking-[0.08em] text-[#6B6B6B] border border-transparent hover:text-[#E61919] hover:border-[#2A2A2A]">
                <ExitIcon className="h-3.5 w-3.5 inline-block mr-1.5" />
                HOME
              </button>
            </Link>
          </div>
        </div>
      </nav>
      <main className="container py-6">{children}</main>
    </div>
  );
}
