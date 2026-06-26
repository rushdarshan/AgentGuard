import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { DashboardIcon, GlobeIcon, ClockIcon, ExitIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/agents", label: "Agents", icon: GlobeIcon },
  { href: "/runs", label: "History", icon: ClockIcon },
];

export default function DashboardLayout({ children }: Props) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111]">
      <nav className="border-b border-[#EAEAEA] backdrop-blur-sm">
        <div className="container flex items-center justify-between py-2.5">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <LightningBoltIcon className="h-5 w-5" />
              <span className="text-sm font-bold tracking-tight">AgentGuard</span>
            </Link>
            <div className="flex items-center">
              {navItems.map((item) => {
                const active = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      type="button"
                      variant={active ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5 px-2.5"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 px-2.5">
                <ExitIcon className="h-3.5 w-3.5" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      <main className="container py-6">{children}</main>
    </div>
  );
}
