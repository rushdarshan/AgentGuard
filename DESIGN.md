---
name: AgentGuard
description: CI for Your AI Agents — adversarial testing harness dashboard
colors:
  substrate: "#0A0A0A"
  surface: "#121212"
  phosphor: "#EAEAEA"
  alarm: "#E61919"
  terminal-green: "#4AF626"
  border: "#2A2A2A"
  muted: "#6B6B6B"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "JetBrains Mono, IBM Plex Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "JetBrains Mono, IBM Plex Mono, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, IBM Plex Mono, monospace"
    fontSize: "13px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

# Design System: AgentGuard

## 1. Overview

**Creative North Star: "The Test Bench"**

A dark, flat, unadorned workspace for adversarial testing. Every element is purposeful: there to surface signal, never decoration. The aesthetic borrows from lab instruments and control panels — diagnostic, precise, serious. Nothing glows, nothing blurs, nothing casts a shadow. The red accent is Alarm: it only appears when something fails, and its rarity is the point.

This system explicitly rejects hacker-movie theatrics (scanlines, glitch effects, neon-on-black), generic SaaS dashboard conventions (rounded cards, pastel gradients, heavy shadows), and cybersecurity cliches (skulls, shields, faux-holographic UI).

**Key Characteristics:**
- Monochromatic with a single alarm-red accent used exclusively for failure states
- Zero border radius — every corner is sharp (0px)
- Zero elevation — no shadows, depth through borders and contrast alone
- Monospace-forward reading experience (JetBrains Mono for body, Inter for display)
- All-caps labels with wide tracking for diagnostic-panel feel

## 2. Colors

A restrained two-color system: warm-off-black, warm-off-white, and one red alarm for failure states only.

### Primary
- **Substrate** (#0A0A0A): Primary background — the test bench surface.
- **Phosphor** (#EAEAEA): Primary text and active interface elements. Named for the glow of a CRT phosphor at its most legible.

### Accent
- **Alarm** (#E61919): Failure-only red. Appears on failed test results, error states, critical severity badges, and the selection highlight. Used on ≤5% of any given screen. Its rarity communicates urgency.

### Neutral
- **Surface** (#121212): Card and container background — one step above substrate for tonal separation without a shadow.
- **Border** (#2A2A2A): All borders, dividers, separators.
- **Muted** (#6B6B6B): Secondary text, inactive nav items, placeholder text, low-severity badges.
- **Terminal Green** (#4AF626): Incidental accent for passing test states and success indicators. Used sparingly — passing is the expected state, not a celebration.

### Named Rules
**The Alarm Rule.** The red accent (#E61919) appears only on failure states. Never decorative, never for hover effects on non-failure elements, never as a background fill. A rare alarm is credible; a constant one is noise.

## 3. Typography

**Display Font:** Inter (with system-ui and sans-serif fallback)
**Body Font:** JetBrains Mono (with IBM Plex Mono and monospace fallback)

The pairing is clinical: Inter's clean geometry for hierarchy, JetBrains Mono's unambiguous characters for data-dense reading. No serifs, no flourishes. Every glyph earns its place.

### Hierarchy
- **Display** (800, clamp(2rem, 5vw, 3rem), 1.1, -0.04em): Page titles and hero numbers. Tight tracking for density.
- **Headline** (700, 1rem, 1.2): Section headings. Uppercase with 0.08em letter-spacing.
- **Body** (400, 13px, 1.4): All running text, table cells, descriptions. Monospace for data alignment.
- **Label** (600, 11px, 1, 0.1em): Badges, timestamps, metadata labels. All uppercase.

### Named Rules
**The Monospace Rule.** Body text is JetBrains Mono (13px). Inter is reserved for display-scale headings only. This is a tool, not a document — monospace signals data, not prose.

## 4. Elevation

Flat. No shadows, no blur, no z-axis depth. Surfaces separate through border contrast (1px #2A2A2A on #0A0A0A) and background tone (surface #121212 vs substrate #0A0A0A). The one-step tonal lift between substrate and surface is the only depth cue.

**The Flat-by- Default Rule.** No shadow, no blur, no glass effect at any elevation. Every surface is at rest. Focus and hover states use border-color shifts, never shadows.

## 5. Components

### Buttons
- **Shape:** Sharp corners (0px border-radius).
- **Solid (Primary):** Substrate background (#0A0A0A), phosphor text (#EAEAEA), phosphor border 1px. Hover: alarm background (#E61919), alarm border (#E61919), phosphor text. Padding: 8px 16px. Uppercase, 0.08em tracking.
- **Outline:** Transparent bg, phosphor text, border (#2A2A2A) 1px. Hover: alarm border, alarm text. Padding: 8px 16px. Uppercase, 0.08em tracking.
- **Ghost:** Transparent bg, muted text (#6B6B6B), no border. Hover: phosphor text, border (#2A2A2A) 1px.
- **States:** Disabled = muted text + border. No shadow on any state.

### Cards
- **Shape:** Sharp corners (0px border-radius).
- **Background:** Surface (#121212).
- **Border:** 1px solid #2A2A2A.
- **Padding:** 24px (6). Internal spacing: 16px between children.
- **Shadow:** None. No border change on default state.
- **Hover (selectable cards):** Border shifts to alarm (#E61919) with 200ms transition.

### Inputs / Fields
- **Shape:** Sharp corners (0px border-radius).
- **Background:** Substrate (#0A0A0A).
- **Border:** 1px solid #2A2A2A.
- **Text:** 13px JetBrains Mono, phosphor (#EAEAEA). Placeholder: muted (#6B6B6B).
- **Focus:** Border shifts to alarm (#E61919), no glow, no outline offset.
- **Disabled:** Muted text and border, no background change.

### Badges
- **Shape:** Sharp corners (0px border-radius). 2px 8px padding.
- **Style:** 10px JetBrains Mono, uppercase, 0.1em tracking, bottom weight 600. No background fill.
- **Severity variants:** 
  - Critical: alarm border, alarm text
  - High: alarm border, alarm text
  - Medium: muted text, border (#2A2A2A)  
  - Low: muted text, border (#2A2A2A)

### Navigation (Dashboard)
- **Shape:** Sharp tabs with button-like border treatment.
- **Default:** Transparent bg, muted text, transparent border. Hover: phosphor text, border (#2A2A2A).
- **Active:** Phosphor bg (#EAEAEA), substrate text (#0A0A0A), phosphor border (#EAEAEA).
- **Spacing:** 12px horizontal padding, 6px vertical padding between items.

## 6. Dos and Don ts

### Do:
- **Do** use the alarm red (#E61919) only for failure states and error conditions.
- **Do** keep all corners sharp (0px border-radius) everywhere.
- **Do** use JetBrains Mono for body text and Inter for display headings only.
- **Do** separate surfaces through border contrast and background tone, never shadows.
- **Do** use uppercase + wide tracking (0.08em to 0.1em) for labels and nav items.

### Don't:
- **Don't** add shadows, blur, glassmorphism, or any elevation effects.
- **Don't** use the alarm red for decorative purposes, hover effects on non-failure elements, or background fills.
- **Don't** add scanline CRT overlays, glitch effects, neon accents, or hacker-movie theatrics.
- **Don't** use rounded corners — not on buttons, cards, inputs, or badges.
- **Don't** use gradient text, pastel colors, or SaaS-dashboard conventions.
- **Don't** use shields, skulls, or cybersecurity iconography cliches.
