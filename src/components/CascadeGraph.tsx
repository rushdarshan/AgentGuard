import { useMemo, useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

interface Node {
  id: number;
  category: string;
  passRate: number;
  language?: string;
  community?: number | null;
}

interface Edge {
  sourceId: number;
  targetId: number;
  confidence: number;
}

interface Props {
  nodes: Node[];
  edges: Edge[];
  colorBy?: "category" | "community";
  onNodeClick?: (category: string) => void;
}

interface SimNode extends Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const NODE_RADIUS = 28;
const REPULSION = 1200;
const ATTRACTION = 0.003;
const DAMPING = 0.85;
const CENTER_FORCE = 0.008;
const FRAMES = 120;

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
  "Memory Poisoning": "#ff6b35",
};

const COMMUNITY_PALETTE = [
  "#f43f5e", "#3b82f6", "#22c55e", "#eab308", "#a855f7",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1",
];

function simulate(nodes: Node[], edges: Edge[]): SimNode[] {
  const simNodes: SimNode[] = nodes.map((n) => ({
    ...n,
    x: Math.random() * 400,
    y: Math.random() * 200,
    vx: 0,
    vy: 0,
  }));

  const centerX = 250;
  const centerY = 120;

  for (let iter = 0; iter < FRAMES; iter++) {
    const cooling = 1 - iter / FRAMES;

    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i];
        const b = simNodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        dx = (dx / dist) * force * cooling;
        dy = (dy / dist) * force * cooling;
        a.vx -= dx;
        a.vy -= dy;
        b.vx += dx;
        b.vy += dy;
      }
    }

    for (const e of edges) {
      const a = simNodes.find((n) => n.id === e.sourceId);
      const b = simNodes.find((n) => n.id === e.targetId);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 100) * ATTRACTION * cooling;
      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
      b.vx -= (dx / dist) * force;
      b.vy -= (dy / dist) * force;
    }

    for (const n of simNodes) {
      n.vx += (centerX - n.x) * CENTER_FORCE * cooling;
      n.vy += (centerY - n.y) * CENTER_FORCE * cooling;
    }

    for (const n of simNodes) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  const xs = simNodes.map((n) => n.x);
  const ys = simNodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const graphW = maxX - minX || 1;
  const graphH = maxY - minY || 1;

  const canvasW = Math.max(graphW + 80, 400);
  const canvasH = Math.max(graphH + 80, 300);
  const padX = (canvasW - graphW) / 2;
  const padY = (canvasH - graphH) / 2;

  return simNodes.map((n) => ({
    ...n,
    x: ((n.x - minX) / graphW) * (canvasW - 80) + padX,
    y: ((n.y - minY) / graphH) * (canvasH - 80) + padY,
  }));
}

export default function CascadeGraph({ nodes, edges, colorBy = "category", onNodeClick }: Props) {
  const [dragNode, setDragNode] = useState<{ id: number; x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const graphRef = useRef<HTMLDivElement>(null);

  useGSAP((_context, contextSafe) => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(graphRef.current!.querySelectorAll("g[data-node]"), {
        autoAlpha: 0, scale: 0.8, duration: 0.4, stagger: 0.03, ease: "back.out(1.7)",
        transformOrigin: "center center",
      });
    });
    return () => mm.revert();
  }, { scope: graphRef, dependencies: [nodes, edges] });

  const positioned = useMemo(() => simulate(nodes, edges), [nodes, edges]);

  const edgeMap = useMemo(() => {
    const map = new Map<number, SimNode>();
    positioned.forEach((n) => map.set(n.id, n));
    return map;
  }, [positioned]);

  const canvasW = useMemo(() => Math.max(positioned.length * 80 + 40, 600), [positioned]);
  const canvasH = useMemo(() => Math.max(300, positioned.length * 40 + 40), [positioned]);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: number) => {
    const svg = (e.target as SVGElement).closest("svg");
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM()!.inverse();
    const p = pt.matrixTransform(ctm);
    setDragNode({ id, x: p.x, y: p.y });
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragNode) return;
    const svg = (e.target as SVGElement).closest("svg");
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM()!.inverse();
    const p = pt.matrixTransform(ctm);
    setDragNode((prev) => prev ? { ...prev, x: p.x, y: p.y } : null);
  }, [dragNode]);

  const handlePointerUp = useCallback(() => {
    setDragNode(null);
    setDragStart(null);
  }, []);

  const handleNodePointerUp = useCallback((e: React.PointerEvent, category: string) => {
    if (dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 6 && onNodeClick) {
        onNodeClick(category);
      }
    }
    handlePointerUp();
  }, [dragStart, onNodeClick, handlePointerUp]);

  const displayNodes = useMemo(
    () =>
      dragNode
        ? positioned.map((n) => (n.id === dragNode.id ? { ...n, x: dragNode.x, y: dragNode.y } : n))
        : positioned,
    [positioned, dragNode]
  );

  if (nodes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-center gap-2 pb-3">
        <span className="text-xs text-[#787774]">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
          className="flex h-7 w-7 items-center justify-center rounded border border-[#EAEAEA] text-sm text-[#787774] hover:text-[#111111]"
        >
          -
        </button>
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.2))}
          className="flex h-7 w-7 items-center justify-center rounded border border-[#EAEAEA] text-sm text-[#787774] hover:text-[#111111]"
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="rounded border border-[#EAEAEA] px-2 py-1 text-[11px] text-[#787774] hover:text-[#111111]"
        >
          Reset
        </button>
      </div>
      <div
        ref={graphRef}
        className="flex justify-center overflow-auto"
        style={{ cursor: dragNode ? "grabbing" : "grab" }}
      >
        <svg
          style={{ width: canvasW * zoom, height: canvasH * zoom, maxWidth: "none", willChange: "transform" }}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            {edges.map((e, i) => {
              const s = edgeMap.get(e.sourceId);
              const t = edgeMap.get(e.targetId);
              if (!s || !t) return null;
              return (
                <marker key={i} id={`arrow-${i}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgb(148 163 184)" filter="drop-shadow(0 0 2px rgb(148 163 184 / 0.5))" />
                </marker>
              );
            })}
          </defs>
          {edges.map((e, i) => {
            const s = displayNodes.find((n) => n.id === e.sourceId);
            const t = displayNodes.find((n) => n.id === e.targetId);
            if (!s || !t) return null;
            const strokeW = 1 + (e.confidence / 100) * 3;
            return (
              <line
                key={`edge-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={`rgb(148 163 184 / ${0.3 + (e.confidence / 100) * 0.5})`}
                strokeWidth={strokeW}
                markerEnd={`url(#arrow-${i})`}
              />
            );
          })}
          {displayNodes.map((n) => {
            const cIdx = n.community != null ? n.community % COMMUNITY_PALETTE.length : -1;
            const color = colorBy === "community" && cIdx >= 0
              ? COMMUNITY_PALETTE[cIdx]
              : CATEGORY_COLORS[n.category] || "#818CF8";
            const langLabel = n.language && n.language !== "en" ? n.language : "";
            return (
              <g key={n.id} data-node onPointerDown={(e) => handlePointerDown(e, n.id)} onPointerUp={(e) => handleNodePointerUp(e, n.category)} style={{ cursor: "pointer" }}>
                <circle cx={n.x} cy={n.y} r={NODE_RADIUS} fill="rgb(15 23 42)" stroke={color} strokeWidth={2} filter={`drop-shadow(0 0 4px ${color}80)`}>
                  <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
                </circle>
                <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fill="rgb(226 232 240)" fontSize={11} fontWeight="bold">
                  {Math.round(n.passRate)}%
                </text>
                <text x={n.x} y={n.y + NODE_RADIUS + 12} textAnchor="middle" fill="rgb(148 163 184)" fontSize={9}>
                  {n.category}
                </text>
                {langLabel && (
                  <text x={n.x} y={n.y + NODE_RADIUS + 24} textAnchor="middle" fill="rgb(100 116 139)" fontSize={8}>
                    {langLabel}
                  </text>
                )}
                {cIdx >= 0 && colorBy === "community" && (
                  <text x={n.x} y={n.y - NODE_RADIUS - 6} textAnchor="middle" fill="rgb(148 163 184)" fontSize={8}>
                    C{n.community}
                  </text>
                )}
              </g>
            );
          })}
          </svg>
        </div>
      </div>
    );
}