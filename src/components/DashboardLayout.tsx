import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { DashboardIcon, GlobeIcon, ClockIcon, ExitIcon, LightningBoltIcon, MixIcon } from "@radix-ui/react-icons";

interface Props {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "DASHBOARD", icon: DashboardIcon },
  { href: "/agents", label: "AGENTS", icon: GlobeIcon },
  { href: "/runs", label: "HISTORY", icon: ClockIcon },
  { href: "/playground", label: "PLAYGROUND", icon: MixIcon },
];

export default function DashboardLayout({ children }: Props) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA]">
      <nav className="border-b border-[#2A2A2A]">
        <div className="container flex items-center justify-between py-2.5">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <LightningBoltIcon className="h-5 w-5 text-[#E61919]" />
              <span className="font-mono text-sm font-bold tracking-[0.08em] text-[#EAEAEA]">[ AGENTGUARD ]</span>
            </Link>
            <hr className="h-5 w-px border-none bg-[#2A2A2A] mx-2" />
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`px-3 py-1.5 font-mono text-xs tracking-[0.08em] border ${
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
            <span className="font-mono text-[10px] text-[#6B6B6B] tracking-[0.1em]">REV 2.6</span>
            <Link href="/">
              <button className="px-3 py-1.5 font-mono text-xs tracking-[0.08em] text-[#6B6B6B] border border-transparent hover:text-[#E61919] hover:border-[#2A2A2A]">
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