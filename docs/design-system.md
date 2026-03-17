# NexusOS Design System

The NexusOS visual system is intentionally narrow: dark industrial surfaces, thin borders, monospaced typography, and semantic status color. The canonical token file is `src/styles/tokens.css`.

## Core Palette

Backgrounds step from deep navy through five lighter layers:

- `--bg0: #080a12` → `--bg5: #252c50`
- Borders `--b0: #1a1f34` → `--b3: #3e4572`
- Text `--t0: #eaedff` (bright cool white), `--t1: #aab4d8`, `--t2: #6870a4`, `--t3: #3e456a`
- Accent `--acc: #6878c0`, `--acc2: #8898d8`

`--warn` amber (`#f0aa24`) is reserved for semantic status and SIMULATION mode chrome. Do not use it decoratively.

## Core Rules

- `tokens.css` is the only source of truth for shared visual tokens.
- Status colors are semantic only:
  - `--live` for go/live/healthy states
  - `--warn` for degraded, partial, or preparatory states; also used for all SIMULATION mode indicators
  - `--danger` for failure or critical alerts
  - `--info` for informational status
- Borders are thin and consistent, using `0.5px` where the system expects chrome, cards, and separators.
- Typography stays on the monospace system font stack defined by `--font`.

## Shared Primitives

- `.nexus-card` and `.nexus-card-2` for panel surfaces
- `.nexus-pill*` for status chips
- `.nexus-btn*` for button variants
- `.nexus-input` for single-line form input
- `.nexus-tag` for compact metadata
- `.nexus-avatar` for small member indicators
- `.nexus-bar-*` for progress indicators
- `.nexus-toggle*` for binary settings

## Shell Chrome

- Topbar height is `44px` (`--topbar-h`).
- Sidebar width is `56px` (`--sidebar-w`).
- No white UI surfaces are allowed.
- No gradients, blur, or decorative shadow are used in the shell.
- In SIMULATION mode, a 22 px amber banner sits above the topbar, a pulsing `SIM` pill appears in the topbar, a foot indicator appears at the bottom of the sidebar, and a low-opacity diagonal `SIMULATION` watermark covers the content area. All are driven by `IS_DEV_MODE` from `src/lib/dev/index.js` and are stripped from production builds when `VITE_DEMO_MODE=false`.

## Page-Specific Guidance

- Access Gate is the only place where literal white is allowed, and only for star elements.
- In SIMULATION mode the Access Gate card has an amber border tint and shows the persona picker instead of the Discord login section.
- Industry surfaces use semantic bars, tags, and registry dots rather than decorative color.
- Op Board uses focused live/warn emphasis, with phase progression and readiness carrying most of the semantic load.

## Maintenance Rules

- If a new reusable primitive is introduced, add it to `tokens.css`.
- If a style is page-local or highly specific, keep it in the component instead of expanding the global token contract.
- Avoid hardcoded hex values in component code. Shared color should come from tokens.
