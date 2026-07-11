import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, X, Search } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_STYLES: Record<LogLevel, { badge: string; row: string; label: string }> = {
  debug: { badge: "bg-[#2A2A2A] text-[#8A8A8A]", row: "", label: "DBG" },
  info:  { badge: "bg-[#1a3a5c] text-[#60B4FF]",  row: "", label: "INF" },
  warn:  { badge: "bg-[#3a2a00] text-[#FFAA00]",  row: "bg-[#1a1600]/40", label: "WRN" },
  error: { badge: "bg-[#3a0a0a] text-[#E61919]",  row: "bg-[#1a0505]/60", label: "ERR" },
};

type Entry = {
  id: number;
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
};

function contextFields(entry: Entry) {
  const skip = new Set(["id", "level", "msg", "ts"]);
  return Object.entries(entry).filter(([k]) => !skip.has(k));
}

export default function Logs() {
  const [levelFilter, setLevelFilter] = useState<LogLevel | undefined>(undefined);
  const [keyword, setKeyword] = useState("");
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const rowsRef = useRef<HTMLDivElement>(null);

  const { data: logs = [], refetch, isFetching } = trpc.system.logs.useQuery(
    { level: levelFilter },
    { refetchInterval: paused ? false : 2000, refetchIntervalInBackground: false }
  );

  const filtered = keyword
    ? logs.filter((e: Entry) =>
        e.msg.toLowerCase().includes(keyword.toLowerCase()) ||
        JSON.stringify(e).toLowerCase().includes(keyword.toLowerCase())
      )
    : logs;

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const rows = rowsRef.current?.querySelectorAll("[data-log-row]");
      if (rows && rows.length > 0) {
        gsap.fromTo(rows,
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: "power3.out" }
        );
      }
    });
    return () => mm.revert();
  }, { scope: rowsRef, dependencies: [filtered.length] });

  useEffect(() => {
    if (autoScroll && !paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, paused]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fmtTime(ts: string) {
    try {
      const d = new Date(ts);
      return d.toISOString().replace("T", " ").replace("Z", "").slice(0, 23);
    } catch {
      return ts;
    }
  }

  const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-lg font-bold tracking-[0.06em] text-[#EAEAEA]">
              [ SERVER LOGS ]
            </h1>
            <p className="font-mono text-xs text-[#8A8A8A] mt-0.5">
              Last {logs.length} entries · polls every 2s
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Keyword search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8A8A]" />
              <input
                type="text"
                placeholder="Filter…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-[#121212] border border-[#2A2A2A] pl-7 pr-2 py-1.5 font-mono text-xs text-[#EAEAEA] rounded-none w-40 focus:outline-none focus:border-[#8A8A8A]"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#EAEAEA]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Level filter */}
            <div className="flex border border-[#2A2A2A]">
              <button
                onClick={() => setLevelFilter(undefined)}
                className={`px-2 py-1.5 font-mono text-xs ${
                  !levelFilter
                    ? "bg-[#EAEAEA] text-[#0A0A0A]"
                    : "text-[#8A8A8A] hover:text-[#EAEAEA]"
                }`}
              >
                ALL
              </button>
              {LEVELS.map((l) => {
                const s = LEVEL_STYLES[l];
                return (
                  <button
                    key={l}
                    onClick={() => setLevelFilter(levelFilter === l ? undefined : l)}
                    className={`px-2 py-1.5 font-mono text-xs border-l border-[#2A2A2A] ${
                      levelFilter === l ? s.badge : "text-[#8A8A8A] hover:text-[#EAEAEA]"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Pause / play */}
            <button
              onClick={() => setPaused((p) => !p)}
              className={`px-3 py-1.5 font-mono text-xs border ${
                paused
                  ? "border-[#FFAA00] text-[#FFAA00]"
                  : "border-[#2A2A2A] text-[#8A8A8A] hover:text-[#EAEAEA] hover:border-[#EAEAEA]"
              }`}
            >
              {paused ? "▶ RESUME" : "⏸ PAUSE"}
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-1.5 font-mono text-xs border border-[#2A2A2A] text-[#8A8A8A] hover:text-[#EAEAEA] hover:border-[#EAEAEA] disabled:opacity-40"
            >
              <Loader2 className={`h-3.5 w-3.5 inline-block mr-1 ${isFetching ? "animate-spin" : ""}`} />
              REFRESH
            </button>
          </div>
        </div>

        {/* Auto-scroll toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 font-mono text-xs text-[#8A8A8A] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-[#E61919]"
            />
            Auto-scroll to newest
          </label>
          <span className="font-mono text-xs text-[#444]">·</span>
          <span className="font-mono text-xs text-[#444]">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {keyword ? ` matching "${keyword}"` : ""}
          </span>
        </div>

        {/* Log table */}
        <div className="border border-[#2A2A2A] font-mono text-xs overflow-auto max-h-[calc(100vh-280px)]">
          {/* Column headers */}
          <div className="sticky top-0 z-10 flex items-center gap-0 bg-[#111] border-b border-[#2A2A2A] text-[#666] uppercase tracking-[0.08em] text-[10px]">
            <div className="w-8 shrink-0 px-2 py-2 text-center">#</div>
            <div className="w-28 shrink-0 px-2 py-2">TIME</div>
            <div className="w-14 shrink-0 px-2 py-2">LEVEL</div>
            <div className="flex-1 px-2 py-2">MESSAGE</div>
            <div className="w-16 shrink-0 px-2 py-2 text-center">CTX</div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#444]">
              {logs.length === 0
                ? "No log entries yet — server activity will appear here within 2s."
                : `No entries match "${keyword}"`}
            </div>
          )}

          {/* Rows — newest is first in the array, render in order (newest at bottom of list) */}
          <div ref={rowsRef}>
          {[...filtered].reverse().map((entry: Entry) => {
            const s = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info;
            const ctx = contextFields(entry);
            const isExpanded = expanded.has(entry.id);

            return (
              <div key={entry.id} data-log-row className={`border-b border-[#1A1A1A] ${s.row}`}>
                <div
                  className="flex items-start gap-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => ctx.length > 0 && toggleExpand(entry.id)}
                >
                  <div className="w-8 shrink-0 px-2 py-1.5 text-center text-[#333] select-none">
                    {entry.id}
                  </div>
                  <div className="w-28 shrink-0 px-2 py-1.5 text-[#555] whitespace-nowrap">
                    {fmtTime(entry.ts)}
                  </div>
                  <div className="w-14 shrink-0 px-2 py-1.5">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${s.badge}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex-1 px-2 py-1.5 text-[#EAEAEA] break-all leading-relaxed">
                    {entry.msg}
                  </div>
                  <div className="w-16 shrink-0 px-2 py-1.5 text-center text-[#555]">
                    {ctx.length > 0 && (
                      <span className="text-[#666] hover:text-[#EAEAEA]">
                        {isExpanded ? "▲" : "▼"} {ctx.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded context */}
                {isExpanded && ctx.length > 0 && (
                  <div className="pl-[calc(2rem+7rem+3.5rem)] pr-4 pb-2 border-t border-[#1A1A1A] bg-[#0c0c0c]">
                    <table className="w-full text-[11px]">
                      <tbody>
                        {ctx.map(([k, v]) => (
                          <tr key={k}>
                            <td className="pr-4 py-0.5 text-[#666] whitespace-nowrap align-top">{k}</td>
                            <td className="text-[#EAEAEA] break-all font-mono">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          <div ref={bottomRef} />
        </div>

        {/* Footer hint */}
        <p className="font-mono text-[10px] text-[#444] text-right">
          Ring buffer · max 200 entries · in-memory only · resets on redeploy
        </p>
      </div>
    </DashboardLayout>
  );
}
