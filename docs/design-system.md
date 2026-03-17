# NexusOS Design System

`NEXUSOS_AI_HANDOFF.md` is the authoritative source for NexusOS visual rules.
This document is the operational summary for day-to-day implementation.

The visual target is not "clean SaaS." NexusOS should feel like an in-verse
shipboard operations console: restrained, dense, and physically grounded.

## Canonical Tokens

- `src/styles/tokens.css` is the single source of truth for shared visual tokens.
- Shared color, spacing, radius, and font decisions belong there.
- If a style is page-local or highly specific, keep it in the component instead
  of widening the token contract.

### Current Palette

- Backgrounds: `--bg0 #07080b` through `--bg5 #222535`
- Borders: `--b0 #161820` through `--b3 #323648`
- Text: `--t0 #dde1f0`, `--t1 #8890a8`, `--t2 #4a5068`, `--t3 #2a2e40`
- Accent: `--acc #5a6080`, `--acc2 #7a8098`
- Semantic status: `--live #27c96a`, `--warn #e8a020`, `--danger #e04848`,
  `--info #4a8fd0`

Status colors are semantic only. They must never be used decoratively.

## Core Visual Rules

- No white UI surfaces.
- No gradients on surfaces.
- No decorative drop shadows.
- Borders are `0.5px` for structural chrome, cards, and separators.
- Primary UI typography stays on `--font` (`SF Mono` stack).
- Literal white is only allowed for Access Gate stars.
- Quality bars use neutral brightness shifts; semantic status is carried by tags,
  pills, labels, and alerts.

## Cutting Edge Standard

### 1. Spatial Depth

- Use a three-layer depth model: background, surface, foreground.
- Panels opening over list views should suggest proximity via a subtle scale
  shift (`1.00 -> 1.01`) and `translateY(-1px)`.
- Background content behind active panels dims to 60% opacity instead of using
  a flat overlay.
- Depth is communicated through opacity, scale, and z-position, not decorative
  shadows.

Target implementation location: `src/core/shell/depth.css`

### 2. Living Background

- The main shell background should feel ambient and spatial, not static.
- Render a single ambient canvas or SVG layer behind app content.
- Use 60-80 low-opacity particles across the viewport, avoiding a 120px margin
  around the content area.
- Particle opacity should stay between `0.03` and `0.08`.
- Drift animation should be extremely slow (`80s-140s`) and non-interactive.
- A shell-only radial light impression is allowed at very low opacity using
  `var(--acc-rgb)`; this is the one ambient exception to the no-surface-gradient
  rule.
- Fade the ambient layer out while a modal overlay is active.

Target implementation location:
- `src/core/shell/components/AmbientBackground.jsx`

### 3. Operational Colour Temperature

- The shell stays on the cool default palette when no op is live.
- When any org op is `LIVE`, the shell should shift subtly warmer over `400ms`.
- This is applied globally through a root class such as `.op-live`.
- The change should be felt more than consciously noticed.

Target implementation location:
- `src/core/shell/useOperationalState.js`
- `src/styles/tokens.css` root overrides

### 4. Data as Spectacle

- All live numeric updates should count from previous value to next value over
  `600ms ease-out`.
- New rows should materialize from `opacity: 0` and `translateY(-4px)`.
- Removed rows should collapse and fade before unmount.
- Progress and quality bars should animate on every width change, not just on
  mount.
- Status badge color changes should transition over `300ms`.
- Charts should draw in on first render and animate between later states.

Target implementation location:
- `src/core/design/animations.css`
- `src/core/design/hooks/useCountUp.js`
- `src/core/design/hooks/useAnimatedList.js`

### 5. MFD Panel Architecture

Data-dense views should increasingly use a Multi-Function Display panel
metaphor rather than generic cards.

An MFD panel uses:
- `2px` outer radius with squared inner elements
- a thin inset top-edge highlight
- a `32px` header strip with mono label and right-side action/status
- a subtle interior scan-line texture
- content layered above that texture

Structural inset highlights are allowed here; this is not the same thing as a
decorative exterior drop shadow.

Target implementation location:
- `src/core/design/components/MFDPanel.jsx`

Use MFD panels for dashboard sections, live op crew and session panels, phase
tracking, split calculation, and intel deposit panels.

### 6. Typography Hierarchy

- `SF Mono` remains the default typeface for UI labels, data, timestamps, and
  controls.
- Add `--font-display: 'Barlow Condensed', sans-serif` for large numbers and
  major headings only.
- Apply the display face to stat-card values (`28px+`), phase names, op names,
  and section titles `16px+`.

### 7. Tactical Amber

- Amber remains semantic, not decorative.
- Operational contexts may lean harder on amber for countdowns, phase prompts,
  readiness below 100%, buy-in deduction lines, medium threat, and exclusive op
  indicators.
- In live-op surfaces, amber can carry slightly more weight for legibility
  under the warmer shell state.

## Shell Chrome

- Topbar height: `44px`
- Sidebar width: `50px`
- Chrome should preserve the ambient background behind content rather than
  flattening the shell into stacked boxes.
- Dropdowns, drawers, and modals should read as foreground layers, not separate
  themes.

## Page-Specific Guidance

- Access Gate is the only place where literal white is allowed, and only for
  star elements.
- Industry should use tags, registry dots, bars, and panel hierarchy rather
  than decorative color.
- Op Board should use live/warn emphasis carefully, with phase progression and
  readiness carrying the semantic load.
- Live-op, dashboard, industry, and intel surfaces are the highest-value
  candidates for MFD panel migration.

## Implementation Priority

Apply visual upgrades in this order:

1. Living background
2. Operational colour temperature shift
3. MFD panel component adoption
4. Data animation hooks
5. Barlow Condensed display typography
6. Spatial depth system

Do not land all six at once. Implement in sequence, verify build, and commit
between phases.

## Maintenance Rules

- Avoid hardcoded hex values in component code.
- Keep semantic color usage explicit.
- If a new shared primitive is introduced, add it to `tokens.css` only when it
  is truly reusable.
- When in doubt, prefer clarity under live-op pressure over screenshot appeal.
