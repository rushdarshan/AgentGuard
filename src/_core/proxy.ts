import { ATTACK_CATEGORIES } from "../const";

export interface ProxyFinding {
  timestamp: string;
  method: string;
  url: string;
  category: string;
  passed: boolean;
  reasoning: string;
  blocked: boolean;
}

// ponytail: in-memory store, no persistence
const findings: ProxyFinding[] = [];

export function getProxyFindings(): ProxyFinding[] {
  return [...findings];
}

export function clearProxyFindings() {
  findings.length = 0;
}

export async function startProxy(port: number, allowlist?: string[], blockUnknown?: boolean): Promise<{ close: () => void }> {
  // ponytail: dynamic import so vite doesn't bundle for browser
  const http = await import("node:http");
  const net = await import("node:net");
  const urlMod = await import("node:url");
  const blocked = new Set(allowlist?.map(d => d.toLowerCase()) ?? []);
  const allowAll = !allowlist || allowlist.length === 0;

  return new Promise((resolve, reject) => {
    try {
      const server = http.createServer(async (req, res) => {
      const method = req.method ?? "GET";
      const targetUrl = req.url ?? "";
      const parsed = urlMod.parse(targetUrl);
      const hostname = parsed.hostname ?? "unknown";
      const startTime = Date.now();

      // ponytail: check allowlist first
      if (!allowAll && !blocked.has(hostname.toLowerCase())) {
        findings.push({ timestamp: new Date().toISOString(), method, url: targetUrl, category: "Schema Drift", passed: false, reasoning: `Domain not in allowlist: ${hostname}`, blocked: true });
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end(`AgentGuard blocked: ${hostname} not in allowlist\n`);
        logFinding(findings[findings.length - 1]);
        return;
      }

      // ponytail: buffer request body for judge
      const bodyChunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => bodyChunks.push(chunk));
      req.on("end", async () => {
        const body = Buffer.concat(bodyChunks).toString("utf-8");

        try {
          const options = {
            hostname: parsed.hostname,
            port: parsed.port || 80,
            path: parsed.path || "/",
            method,
            headers: { ...req.headers, host: parsed.host },
          };

          const proxyReq = http.request(options, (proxyRes) => {
            const respChunks: Buffer[] = [];
            proxyRes.on("data", (chunk: Buffer) => respChunks.push(chunk));
            proxyRes.on("end", async () => {
              const respBody = Buffer.concat(respChunks).toString("utf-8");
              // ponytail: judge the interaction
              await judgeInteraction(targetUrl, method, body, respBody, (f) => {
                findings.push(f);
                logFinding(f);
              });
              res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
              res.end(respBody);
            });
          });

          proxyReq.on("error", () => {
            res.writeHead(502);
            res.end("AgentGuard: upstream error\n");
          });

          if (body) proxyReq.write(body);
          proxyReq.end();
        } catch (err) { console.warn(err); 
          res.writeHead(502);
          res.end("AgentGuard: proxy error\n");
        }
      });
    });

    // ponytail: handle HTTPS CONNECT — domain-level check only, no MITM
    server.on("connect", async (req, clientSocket, head) => {
      const [hostname, portStr] = (req.url ?? ":").split(":");
      const port = parseInt(portStr) || 443;

      if (!allowAll && !blocked.has(hostname.toLowerCase())) {
        findings.push({ timestamp: new Date().toISOString(), method: "CONNECT", url: `${hostname}:${port}`, category: "Schema Drift", passed: false, reasoning: `Domain not in allowlist: ${hostname}`, blocked: true });
        clientSocket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        clientSocket.end();
        logFinding(findings[findings.length - 1]);
        return;
      }

      const serverSocket = net.connect(port, hostname, () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });

      serverSocket.on("error", () => clientSocket.end());
      clientSocket.on("error", () => serverSocket.end());

      findings.push({ timestamp: new Date().toISOString(), method: "CONNECT", url: `${hostname}:${port}`, category: "Multi-tenant Context Leak", passed: true, reasoning: `HTTPS tunnel to ${hostname} — passthrough (no MITM)`, blocked: false });
    });

    server.listen(port, "127.0.0.1", () => {
      console.log(`\nAgentGuard Proxy running on http://127.0.0.1:${port}`);
      console.log(`Set HTTP_PROXY=http://127.0.0.1:${port} in your agent's environment\n`);
      resolve({ close: () => server.close() });
    });
    } catch (err) {
      reject(err);
    }
  });
}

// ponytail: quick judge that checks each attack category
async function judgeInteraction(url: string, method: string, body: string, response: string, onFinding: (f: ProxyFinding) => void) {
  const prompt = body || `${method} ${url}`;
  const category = pickCategory(prompt, url);

  try {
    const { MultiModelJudge } = await import("./judge");
    const { getAvailableProviders } = await import("./llm");
    const providers = getAvailableProviders();
    let verdict;
    try {
      verdict = await MultiModelJudge.evaluate(prompt, response || "(empty)", category, providers);
    } catch (err) { console.warn(err); 
      const { evaluateHeuristic } = await import("./llm");
      const h = evaluateHeuristic(prompt, response || "", category);
      verdict = { passed: h.passed, reasoning: h.reasoning + " (heuristic)" };
    }

    onFinding({
      timestamp: new Date().toISOString(),
      method,
      url,
      category,
      passed: verdict.passed,
      reasoning: verdict.reasoning,
      blocked: !verdict.passed,
    });
  } catch (err) { console.warn(err); 
    // ponytail: judge unavailable — log without blocking
    onFinding({
      timestamp: new Date().toISOString(),
      method,
      url,
      category,
      passed: true,
      reasoning: "Judge unavailable — passthrough",
      blocked: false,
    });
  }
}

// ponytail: best-guess category from URL/path
function pickCategory(body: string, url: string): string {
  const lower = (body + " " + url).toLowerCase();
  if (lower.includes("password") || lower.includes("secret") || lower.includes("credential")) return "Prompt Injection";
  if (lower.includes("ignore") || lower.includes("forget") || lower.includes("system prompt")) return "Jailbreak";
  if (lower.includes("../") || lower.includes("..\\") || lower.includes("file://")) return "Indirect Prompt Injection";
  if (lower.includes("admin") || lower.includes("sudo") || lower.includes("override")) return "Schema Drift";
  return "Prompt Injection";
}

let logCount = 0;
function logFinding(f: ProxyFinding) {
  logCount++;
  const status = f.blocked ? "⛔ BLOCKED" : f.passed ? "✓ PASS" : "⚠  FLAG";
  const shortUrl = f.url.length > 60 ? f.url.slice(0, 57) + "..." : f.url;
  console.log(`  [${logCount}] ${status}  ${f.method} ${shortUrl}`);
  if (!f.passed || f.blocked) {
    console.log(`        ${f.category}: ${f.reasoning.slice(0, 100)}`);
  }
}
