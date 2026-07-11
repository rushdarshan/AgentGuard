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
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA] bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:24px_24px]">
      <nav className="border-b-2 border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="container flex items-center justify-between py-2 md:py-0">
          <div className="flex items-center gap-0 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 group shrink-0 pr-6">
              <span className="font-mono text-[9px] text-[#E61919] tracking-[0.15em]">®</span>
              <span className="font-mono text-xs md:text-sm font-bold tracking-[0.08em] text-[#EAEAEA] whitespace-nowrap">[ AGENTGUARD ]</span>
            </Link>
            {/* impeccable-variants-start 43f8f566 */}
            <style data-impeccable-css="43f8f566">{`
              @scope ([data-impeccable-variant="1"]) {
                :scope > .il-v-badge {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  height: 40px;
                  padding: 0 12px;
                  border-left: 1px solid #2A2A2A;
                  font-family: "JetBrains Mono", monospace;
                  font-size: 10px;
                  letter-spacing: 0.1em;
                  color: #6B6B6B;
                  cursor: default;
                  user-select: none;
                }
                :scope > .il-v-badge .il-v-dot {
                  width: 5px;
                  height: 5px;
                  background: var(--p-status-color, #4AF626);
                  flex-shrink: 0;
                }
                :scope > .il-v-badge .il-v-label {
                  color: #EAEAEA;
                  font-weight: 600;
                }
              }
              @scope ([data-impeccable-variant="2"]) {
                :scope > .il-v-status {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  height: 40px;
                  padding: 0 12px;
                  border-left: 1px solid #2A2A2A;
                  font-family: "JetBrains Mono", monospace;
                  font-size: 10px;
                  letter-spacing: 0.08em;
                  color: #6B6B6B;
                  cursor: default;
                  user-select: none;
                }
                :scope > .il-v-status .il-v-pulse {
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background: var(--p-status-color, #4AF626);
                  animation: il-pulse 2s ease-in-out infinite;
                  flex-shrink: 0;
                }
                :scope > .il-v-status .il-v-text {
                  color: #EAEAEA;
                  text-transform: uppercase;
                }
                @keyframes il-pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.4; }
                }
              }
              @scope ([data-impeccable-variant="3"]) {
                :scope > .il-v-bread {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  height: 40px;
                  padding: 0 12px;
                  border-left: 1px solid #2A2A2A;
                  font-family: "JetBrains Mono", monospace;
                  font-size: 10px;
                  letter-spacing: 0.08em;
                  color: #6B6B6B;
                  cursor: default;
                  user-select: none;
                  min-width: 0;
                }
                :scope > .il-v-bread .il-v-sep {
                  color: #2A2A2A;
                  flex-shrink: 0;
                }
                :scope > .il-v-bread .il-v-page {
                  color: #EAEAEA;
                  font-weight: 600;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                :scope > .il-v-bread .il-v-crumb {
                  color: #6B6B6B;
                }
              }
            `}</style>
            <div data-impeccable-variant="1" data-impeccable-params='[{"id":"status-color","kind":"range","min":0,"max":1,"step":0.1,"default":0.5,"label":"Status brightness"}]'>
              <span className="il-v-badge">
                <span className="il-v-dot"></span>
                <span className="il-v-label">REV 2.6</span>
              </span>
            </div>
            <div data-impeccable-variant="2" style={{display: 'none'}} data-impeccable-params='[{"id":"status-color","kind":"range","min":0,"max":1,"step":0.1,"default":0.5,"label":"Pulse intensity"}]'>
              <span className="il-v-status">
                <span className="il-v-pulse"></span>
                <span className="il-v-text">OPERATIONAL</span>
              </span>
            </div>
            <div data-impeccable-variant="3" style={{display: 'none'}} data-impeccable-params='[{"id":"show-home","kind":"toggle","default":true,"label":"Show HOME"}]'>
              <span className="il-v-bread">
                <span className="il-v-crumb">HOME</span>
                <span className="il-v-sep">/</span>
                <span className="il-v-page">{location.replace("/", "").toUpperCase() || "DASHBOARD"}</span>
              </span>
            </div>
            {/* impeccable-variants-end 43f8f566 */}
            <div className="hidden md:flex items-center">
              {navItems.map((item) => {
                const active = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`flex flex-col items-center justify-center gap-1 w-[100px] h-14 font-mono text-[10px] tracking-[0.08em] border-l border-[#2A2A2A] transition-colors ${
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
          </div>
          <div className="flex items-center h-full shrink-0">
            <button onClick={toggle} className="flex flex-col items-center justify-center w-12 h-14 border-l border-[#2A2A2A] font-mono text-[9px] tracking-[0.1em] text-[#8A8A8A] hover:bg-[#121212] hover:text-[#EAEAEA] transition-colors" title="Toggle theme">
              {theme === "cyberpunk" ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
            </button>
            {/* impeccable-variants-start 641048a7 */}
            <style data-impeccable-css="641048a7">{`
              @scope ([data-impeccable-variant="1"]) {
                :scope > .il-v-hide {
                  display: none;
                }
              }
              @scope ([data-impeccable-variant="2"]) {
                :scope > .il-v-sep {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 24px;
                  height: 56px;
                  border-left: 1px solid #2A2A2A;
                }
                :scope > .il-v-sep::after {
                  content: "";
                  width: 3px;
                  height: 3px;
                  background: #2A2A2A;
                }
              }
              @scope ([data-impeccable-variant="3"]) {
                :scope > .il-v-empty {
                  width: 0;
                  height: 56px;
                  border-left: none;
                }
              }
            `}</style>
            <div data-impeccable-variant="1">
              <div className="il-v-hide"></div>
            </div>
            <div data-impeccable-variant="2" style={{display: 'none'}}>
              <div className="il-v-sep"></div>
            </div>
            <div data-impeccable-variant="3" style={{display: 'none'}}>
              <div className="il-v-empty"></div>
            </div>
            {/* impeccable-variants-end 641048a7 */}
            <Link href="/" className="hidden md:inline h-full">
              <button className="flex flex-col items-center justify-center gap-1 w-[100px] h-14 border-l border-[#2A2A2A] font-mono text-[10px] tracking-[0.08em] text-[#8A8A8A] hover:bg-[#121212] hover:text-[#E61919] transition-colors">
                <ExitIcon className="h-3.5 w-3.5 shrink-0" />
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
