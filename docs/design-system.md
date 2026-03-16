# NexusOS Design System

The NexusOS visual system is intentionally narrow: dark industrial surfaces, thin borders, monospaced typography, and semantic status color. The canonical token file is `src/styles/tokens.css`.

## Core Rules
- `tokens.css` is the only source of truth for shared visual tokens.
- Status colors are semantic only:
  - `--live` for go/live/healthy states
  - `--warn` for degraded, partial, or preparatory states
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
- Topbar height is `44px`.
- Sidebar width is `50px`.
- No white UI surfaces are allowed.
- No gradients, blur, or decorative shadow are used in the shell.

## Page-Specific Guidance
- Access Gate is the only place where literal white is allowed, and only for star elements.
- Industry surfaces use semantic bars, tags, and registry dots rather than decorative color.
- Op Board uses focused live/warn emphasis, with phase progression and readiness carrying most of the semantic load.

## Maintenance Rules
- If a new reusable primitive is introduced, add it to `tokens.css`.
- If a style is page-local or highly specific, keep it in the component instead of expanding the global token contract.
- Avoid hardcoded hex values in component code. Shared color should come from tokens.
