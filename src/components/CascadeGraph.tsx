import { useMemo } from "react";

interface Node {
  id: number;
  category: string;
  passRate: number;
}

interface Edge {
  sourceId: number;
  targetId: number;
  confidence: number;
}

interface Props {
  nodes: Node[];
  edges: Edge[];
}

const NODE_SIZE = 36;
const SPACING = 140;
const PAD = 40;

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

function layout(nodes: Node[]) {
  const totalW = Math.max(nodes.length - 1, 1) * SPACING + PAD * 2;
  const startX = PAD;
  return {
    width: totalW,
    height: 130,
    positioned: nodes.map((n, i) => ({
      ...n,
      x: startX + i * SPACING,
      y: 40,
    })),
  };
}

export default function CascadeGraph({ nodes, edges }: Props) {
  const { width, height, positioned } = useMemo(() => layout(nodes), [nodes]);

  const edgeMap = useMemo(() => {
    const map = new Map<number, Node & { x: number; y: number }>();
    positioned.forEach((n) => map.set(n.id, n));
    return map;
  }, [positioned]);

  if (nodes.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        <defs>
          {edges.map((e, i) => {
            const s = edgeMap.get(e.sourceId);
            const t = edgeMap.get(e.targetId);
            if (!s || !t) return null;
            return (
              <marker
                key={i}
                id={`arrow-${i}`}
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="rgb(148 163 184)" filter="drop-shadow(0 0 2px rgb(148 163 184 / 0.5))" />
              </marker>
            );
          })}
        </defs>
        {edges.map((e, i) => {
          const s = edgeMap.get(e.sourceId);
          const t = edgeMap.get(e.targetId);
          if (!s || !t) return null;
          const strokeW = 1 + (e.confidence / 100) * 3;
          return (
            <line
              key={`edge-${i}`}
              x1={s.x + NODE_SIZE / 2}
              y1={s.y + NODE_SIZE / 2}
              x2={t.x + NODE_SIZE / 2}
              y2={t.y + NODE_SIZE / 2}
              stroke={`rgb(148 163 184 / ${0.3 + e.confidence / 100 * 0.5})`}
              strokeWidth={strokeW}
              markerEnd={`url(#arrow-${i})`}
            />
          );
        })}
        {positioned.map((n) => {
          const color = CATEGORY_COLORS[n.category] || "#818CF8";
          const passPct = n.passRate;
          return (
            <g key={n.id}>
              <circle cx={n.x + NODE_SIZE / 2} cy={n.y + NODE_SIZE / 2} r={NODE_SIZE / 2} fill="rgb(15 23 42)" stroke={color} strokeWidth={2} filter={`drop-shadow(0 0 4px ${color}80)`}>
                <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
              </circle>
              <text x={n.x + NODE_SIZE / 2} y={n.y + NODE_SIZE / 2} textAnchor="middle" dominantBaseline="central" fill="rgb(226 232 240)" fontSize={11} fontWeight="bold">
                {passPct}%
              </text>
              <text x={n.x + NODE_SIZE / 2} y={n.y + NODE_SIZE / 2 + NODE_SIZE / 2 + 12} textAnchor="middle" fill="rgb(148 163 184)" fontSize={10}>
                {n.category}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        Sequential test pipeline — edges show failure propagation between consecutive categories
      </p>
    </div>
  );
}
