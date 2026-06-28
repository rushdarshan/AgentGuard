/**
 * Structured logger for AgentGuard.
 *
 * In production (NODE_ENV=production) every call emits a newline-delimited JSON line
 * so Render's log search can filter with: "level":"error"  or  "testRunId":4
 *
 * In development it pretty-prints with colour to the terminal.
 *
 * Also maintains an in-memory ring buffer (last 200 entries) so the /logs page
 * can show a live tail without an external service.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

const RING_SIZE = 200;
const _buf: LogEntry[] = [];
let _seq = 0;

function push(entry: LogEntry) {
  if (_buf.length >= RING_SIZE) _buf.shift();
  _buf.push(entry);
}

/** Returns the ring buffer newest-first, optionally filtered by level. */
export function getLogBuffer(level?: LogLevel): LogEntry[] {
  const out = level ? _buf.filter((e) => e.level === level) : [..._buf];
  return out.reverse();
}

const isDev = process.env.NODE_ENV !== "production";

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: "\x1b[90m",   // grey
  info:  "\x1b[36m",   // cyan
  warn:  "\x1b[33m",   // yellow
  error: "\x1b[31m",   // red
};
const RESET = "\x1b[0m";

function emit(level: LogLevel, msg: string, ctx: Record<string, unknown> = {}) {
  const ts = new Date().toISOString();
  const id = ++_seq;
  const entry: LogEntry = { id, level, msg, ts, ...ctx };
  push(entry);

  if (isDev) {
    const colour = LEVEL_COLOR[level];
    const ctxStr = Object.keys(ctx).length
      ? "  " + JSON.stringify(ctx)
      : "";
    console.log(`${colour}[${level.toUpperCase()}]${RESET} ${msg}${ctxStr}`);
  } else {
    // NDJSON — one JSON object per line for Render log parsing
    process.stdout.write(JSON.stringify(entry) + "\n");
  }
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => emit("info",  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => emit("warn",  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
};
