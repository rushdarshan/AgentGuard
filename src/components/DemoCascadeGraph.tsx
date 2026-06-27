import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const CATEGORY_COLORS: Record<string, string> = {
  "Prompt Injection": "#a78bfa",
  "Context Overflow": "#f59e0b",
  "Logic Collapse": "#34d399",
  Jailbreak: "#ef4444",
  Hallucination: "#60a5fa",
  "Schema Drift": "#f472b6",
  "Multi-tenant Context Leak": "#fb923c",
  "Indirect Prompt Injection": "#2dd4bf",
  "Multi-turn Crescendo": "#e879f9",
};

const DEMO_NODES = [
  { id: 1, category: "Prompt Injection", passRate: 65, community: 0 },
  { id: 2, category: "Context Overflow", passRate: 82, community: 1 },
  { id: 3, category: "Logic Collapse", passRate: 91, community: 1 },
  { id: 4, category: "Jailbreak", passRate: 43, community: 0 },
  { id: 5, category: "Hallucination", passRate: 74, community: 2 },
  { id: 6, category: "Schema Drift", passRate: 88, community: 2 },
  { id: 7, category: "Multi-tenant Context Leak", passRate: 38, community: 0 },
  { id: 8, category: "Indirect Prompt Injection", passRate: 58, community: 3 },
  { id: 9, category: "Multi-turn Crescendo", passRate: 52, community: 3 },
];

const DEMO_EDGES: Array<{ sourceId: number; targetId: number; confidence: number }> = [
  { sourceId: 1, targetId: 4, confidence: 85 },
  { sourceId: 4, targetId: 7, confidence: 72 },
  { sourceId: 1, targetId: 8, confidence: 65 },
  { sourceId: 8, targetId: 9, confidence: 78 },
  { sourceId: 4, targetId: 9, confidence: 60 },
  { sourceId: 2, targetId: 3, confidence: 45 },
  { sourceId: 5, targetId: 6, confidence: 30 },
  { sourceId: 7, targetId: 5, confidence: 55 },
];

interface SimNode {
  id: number;
  category: string;
  passRate: number;
  community: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function simulate(): SimNode[] {
  const nodes: SimNode[] = DEMO_NODES.map((n) => ({
    ...n,
    x: Math.random() * 500,
    y: Math.random() * 300,
    vx: 0,
    vy: 0,
  }));

  const cx = 300, cy = 180;
  for (let iter = 0; iter < 150; iter++) {
    const cool = 1 - iter / 150;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1400 / (dist * dist) * cool;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        a.vx -= dx; a.vy -= dy;
        b.vx += dx; b.vy += dy;
      }
    }
    for (const e of DEMO_EDGES) {
      const a = nodes.find((n) => n.id === e.sourceId);
      const b = nodes.find((n) => n.id === e.targetId);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 130) * 0.004 * cool;
      a.vx += (dx / dist) * force;
      b.vx -= (dx / dist) * force;
      a.vy += (dy / dist) * force;
      b.vy -= (dy / dist) * force;
    }
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.006 * cool;
      n.vy += (cy - n.y) * 0.006 * cool;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const gw = maxX - minX || 1, gh = maxY - minY || 1;
  const cw = Math.max(gw + 100, 500), ch = Math.max(gh + 100, 400);
  const px = (cw - gw) / 2, py = (ch - gh) / 2;
  return nodes.map((n) => ({
    ...n,
    x: ((n.x - minX) / gw) * (cw - 100) + px,
    y: ((n.y - minY) / gh) * (ch - 100) + py,
  }));
}

export default function DemoCascadeGraph() {
  const ref = useRef<HTMLDivElement>(null);
  const positioned = useMemo(() => simulate(), []);
  const cw = 600, ch = 400;

  useGSAP(() => {
    const ctx = ref.current;
    if (!ctx) return;
    const edges = ctx.querySelectorAll<SVGLineElement>("line[data-edge]");
    gsap.set(edges, { scaleX: 0, transformOrigin: "0 50%" });
    gsap.to(edges, {
      scaleX: 1,
      duration: 0.5,
      stagger: 0.25,
      ease: "power2.out",
      delay: 0.5,
    });
    const nodes = ctx.querySelectorAll<SVGCircleElement>("circle[data-node]");
    gsap.from(nodes, {
      scale: 0,
      opacity: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: "back.out(2)",
      delay: 0.3,
    });
    const labels = ctx.querySelectorAll<SVGTextElement>("text[data-label]");
    gsap.from(labels, {
      opacity: 0,
      y: 6,
      duration: 0.3,
      stagger: 0.06,
      delay: 0.3,
    });
  }, { scope: ref });

  return (
    <div ref={ref} className="w-full flex justify-center">
      <svg width={cw} height={ch} viewBox={`0 0 ${cw} ${ch}`} className="overflow-visible">
        <defs>
          {DEMO_EDGES.map((_, i) => (
            <marker key={i} id={`da-${i}`} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="rgb(148 163 184 / 0.6)" />
            </marker>
          ))}
        </defs>
        {DEMO_EDGES.map((e, i) => {
          const s = positioned.find((n) => n.id === e.sourceId);
          const t = positioned.find((n) => n.id === e.targetId);
          if (!s || !t) return null;
          const sw = 1 + (e.confidence / 100) * 2.5;
          return (
            <line
              key={i}
              data-edge
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={`rgb(148 163 184 / ${0.25 + (e.confidence / 100) * 0.45})`}
              strokeWidth={sw}
              markerEnd={`url(#da-${i})`}
            />
          );
        })}
        {positioned.map((n) => {
          const color = CATEGORY_COLORS[n.category] || "#818CF8";
          return (
            <g key={n.id} className="pointer-events-none">
              <filter id={`glow-${n.id}`}>
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <circle data-node cx={n.x} cy={n.y} r={24} fill="rgb(15 23 42)" stroke={color} strokeWidth={2} filter={`url(#glow-${n.id})`}>
                <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="4s" repeatCount="indefinite" />
              </circle>
              <text data-label x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fill="rgb(226 232 240)" fontSize={10} fontWeight="bold">
                {n.passRate}%
              </text>
              <text data-label x={n.x} y={n.y + 32} textAnchor="middle" fill="rgb(148 163 184)" fontSize={8}>
                {n.category}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
