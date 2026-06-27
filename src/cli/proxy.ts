import { startProxy, getProxyFindings } from "../_core/proxy";

interface ProxyOptions {
  port: string;
  allowlist?: string;
  blockUnknown?: boolean;
}

export async function proxyCommand(options: ProxyOptions) {
  const port = parseInt(options.port) || 9090;
  const allowlist = options.allowlist ? options.allowlist.split(",").map(d => d.trim()).filter(Boolean) : undefined;

  const server = await startProxy(port, allowlist, options.blockUnknown);

  // ponytail: graceful shutdown on SIGINT/SIGTERM
  const cleanup = () => {
    const findings = getProxyFindings();
    const blocked = findings.filter(f => f.blocked).length;
    const flagged = findings.filter(f => !f.passed && !f.blocked).length;
    const passed = findings.filter(f => f.passed).length;

    console.log(`\n--- Proxy Session Summary ---`);
    console.log(`Total requests: ${findings.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Flagged: ${flagged}`);
    console.log(`Blocked: ${blocked}`);

    if (findings.length > 0) {
      const score = Math.round((passed / findings.length) * 100);
      console.log(`Agent Readiness Score: ${score}%`);
    }

    server.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
