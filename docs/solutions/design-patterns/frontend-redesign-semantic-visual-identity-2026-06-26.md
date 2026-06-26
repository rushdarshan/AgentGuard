---
title: Frontend Redesign: Semantic Visual Identity for AgentGuard
date: 2026-06-26
tags: [frontend, visual-identity, semantic-colors, design-system]
category: docs/solutions/design-patterns/
module: frontend
problem_type: design_pattern
component: documentation
severity: low
applies_when:
  - Building a product with inherent semantic data categories
  - Product needs visual differentiation from generic dark-SaaS templates
---

## Context

AgentGuard is a security testing tool for AI agents — a product whose domain
(red-teaming, adversarial attacks, reliability scoring) is inherently technical
and serious. The original UI used a generic dark SaaS template: cyan accent,
gradient headings, card-everything layout, trendy sans font. It was functional
but visually indistinguishable from hundreds of other AI dashboards. The
product's own semantics — severity levels, cascade propagation, agent
reliability — offered a richer design vocabulary than the template was using.

## Guidance

### 1. Accent color is not the data language

Pick one accent color for interactive chrome (buttons, links, active nav). Use a
separate, independent palette for data semantics. Do not derive data colors from
the accent.

```ts
// tailwind.config.ts — single accent for chrome
colors: {
  accent: '#6366F1',          // chrome: buttons, links, active states
  background: 'rgb(7, 11, 20)',
  foreground: 'rgb(241, 245, 249)',
  muted: { foreground: 'rgb(100, 116, 139)' },
  border: 'rgba(255, 255, 255, 0.06)',
}
```

```css
/* index.css — independent semantic palette for data */
.badge-critical { background: rgba(220, 38, 38, 0.12); color: rgb(252, 165, 165); border: 1px solid rgba(220, 38, 38, 0.25); }
.badge-high    { background: rgba(234, 88, 12, 0.12); color: rgb(254, 215, 170); border: 1px solid rgba(234, 88, 12, 0.25); }
.badge-medium  { background: rgba(202, 138, 4, 0.12); color: rgb(253, 224, 71);  border: 1px solid rgba(202, 138, 4, 0.25); }
.badge-low     { background: rgba(22, 163, 74, 0.12);  color: rgb(187, 247, 208); border: 1px solid rgba(22, 163, 74, 0.25);  }
```

### 2. Reserve cards for interactivity

Use `<Card>` only when the surface is clickable or interactive. Display-only
data (stats, metrics) uses plain elements with text hierarchy.

```tsx
// Before — stat as card
<Card className="card-hover p-6">
  <div className="rounded-lg bg-accent/10 p-3 w-fit"><TrendingUp className="h-6 w-6 text-accent" /></div>
  <p className="text-muted-foreground text-sm">Total Agents</p>
  <p className="text-2xl font-bold">{totalAgents}</p>
</Card>

// After — stat as plain div
<div>
  <div className="flex items-center gap-2 text-muted-foreground">
    <TrendingUp className="h-3.5 w-3.5 text-accent" />
    <span className="text-xs font-medium uppercase tracking-wider">Agents</span>
  </div>
  <p className="mt-1 text-3xl font-bold">{totalAgents}</p>
</div>
```

### 3. Gradient text is the first thing to remove

Never use `bg-gradient-to-r bg-clip-text text-transparent` for headings that
should just be clear, readable labels. Plain `text-accent` is cleaner and more
legible.

### 4. Tighten copy with domain vocabulary

Replace generic labels with shorter, more specific terms. The label should
describe the domain concept, not the UI container.

| Generic | Semantic |
|---|---|
| Total Agents | Agents |
| Avg Reliability | Reliability |
| Critical Issues | Critical |
| Reliability Score | System score |
| Results by Category | Category breakdown |
| Failure Cascades | Cascade analysis |
| Test Run History | Run history |
| Getting Started | Quick start |
| Attack Categories (7) | Attack surface |
| Reset Filters | Reset |
| Export Results | Export |

### 5. Reduce chrome weight everywhere

Nav, borders, badges, fonts — tighten everything by 1-2 units. Subtle
reductions compound into a more intentional feel.

```tsx
// Before: py-3, h-6 w-6 logo, text-lg brand
// After:  py-2.5, h-5 w-5 logo, text-sm brand

// Badges: px-3 py-1 text-sm -> px-2.5 py-0.5 text-xs
// Border opacity: 0.3 -> 0.25 (or border-border/30 vs /50)
// Font weight: 700 headings -> 600
```

### 6. Add subtle motion that serves comprehension

Breathing glow on the cascade graph nodes
(`<animate attributeName="stroke-opacity">`) communicates active analysis
without being decorative. The `::after` gradient underline on `page-title`
anchors the heading without a full border.

### 7. Choose a font with technical character

IBM Plex Sans over Plus Jakarta Sans — the former reads as engineering tooling,
the latter as a marketing page.

## Why This Matters

Security testing tools communicate trust through visual seriousness. A generic
SaaS template signals "this could be any dashboard" — undifferentiated and
forgettable. By aligning the design language with the product domain (severity
badges use actual alert semantics, cascade graphs show real attack propagation,
stats are numbers not cards), the UI reinforces the product value at every
glance. Users evaluating a security tool should feel they are looking at a
specialized instrument, not a template.

The concrete wins: stat cards went from 3 visual layers (card bg + icon bg +
icon) to 0, making the actual number the hero. Badge colors carry immediate
meaning without decoding. Copy is 30-50% shorter. Page loads save the font-
weight reflow.

## When to Apply

- Building a technical tool where domain vocabulary is a differentiator
  (security, infra, dev tools, data)
- The current design uses generic card-heavy SaaS patterns
- The product has inherent semantic categories (severity, status, risk levels)
  that can drive the color system instead of decorative theming
- Users make decisions based on displayed data — numbers should be the visual
  focal point, not UI chrome

## Examples

### Badge refinement

```css
/* Before */
.badge-critical {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid rgba(220, 38, 38, 0.3);
}

/* After — tighter, lower opacity, tracking */
.badge-critical {
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.25);
  letter-spacing: 0.02em;
}
```

### Gradient text removal

```tsx
{/* Before */}
<span className="bg-gradient-to-r from-accent via-cyan-300 to-accent bg-clip-text text-transparent">AI Agents</span>

{/* After */}
<span className="text-accent">AI Agents</span>
```

### Stat strip — cards to plain

```tsx
// Before: Card with icon-square, generic label, stat
<Card className="card-hover p-6">
  <div className="rounded-lg bg-accent/10 p-3 w-fit">
    <TrendingUp className="h-6 w-6 text-accent" />
  </div>
  <p className="text-sm text-muted-foreground mt-3">Total Agents</p>
  <p className="text-2xl font-bold">{totalAgents}</p>
</Card>

// After: Plain div, tiny accent icon, uppercase label, bold number
<div>
  <div className="flex items-center gap-2 text-muted-foreground">
    <TrendingUp className="h-3.5 w-3.5 text-accent" />
    <span className="text-xs font-medium uppercase tracking-wider">Agents</span>
  </div>
  <p className="mt-1 text-3xl font-bold">{totalAgents}</p>
</div>
```

### Glow shadows follow accent

```ts
// tailwind.config.ts
boxShadow: {
  'glow-sm': '0 0 12px rgba(99, 102, 241, 0.25)',
  'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
  'glow-lg': '0 0 35px rgba(99, 102, 241, 0.4)',
}
```

### Page title underline

```css
.page-title {
  position: relative;
  display: inline-block;
}
.page-title::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.5), transparent);
}
```

### All effects follow accent consistently

```css
/* Scanlines, grid bg, scrollbar, selection — all use the accent color */
body::before {
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.025) 1px, transparent 1px);
}
::selection { background-color: rgba(99, 102, 241, 0.3); }
::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.15); }
.card-hover:hover {
  border-color: rgba(99, 102, 241, 0.2);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.05);
}
```

## Related

- `tailwind.config.ts` — color palette, shadows, fonts
- `src/index.css` — badges, scanlines, shimmer, animations, page-title
- `src/components/ui/card.tsx` — hover border/shadow
- `src/components/ui/button.tsx` — variant colors
- `src/pages/Dashboard.tsx` — stat strip, copy refinements
- `src/components/CascadeGraph.tsx` — category colors, animate element
- `src/pages/TestRunDetail.tsx` — score glow, copy
