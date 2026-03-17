# NexusOS — Base44 Editor Rules
## These rules are non-negotiable on every edit

### Scope
Each Base44 edit targets ONE app only.
Only modify files within src/apps/[app-name]/.
Do not touch src/core/ unless explicitly told.
Read src/apps/[app-name]/CONTEXT.md first.

### Colour system
All rgba() values use RGB triplet variables:
  rgba(var(--acc-rgb), 0.x)
  rgba(var(--live-rgb), 0.x)
  rgba(var(--warn-rgb), 0.x)
  rgba(var(--danger-rgb), 0.x)
  rgba(var(--info-rgb), 0.x)
  rgba(var(--bg0-rgb), 0.x)
Never write hardcoded hex or rgb values in JSX.

### CSS classes — always use these
  .nexus-btn — all buttons
  .nexus-btn.primary — primary action
  .nexus-btn.danger-btn — destructive action
  .nexus-card — all card containers
  .nexus-input — all inputs and selects
  .nexus-table — all table elements
  .nexus-tag — inline status chips
  .nexus-loading-dots — loading state
  MFDPanel — data panel component from
    src/core/design/components/MFDPanel.jsx

### Typography
  --font: SF Mono (all data, labels, body)
  --font-display: Barlow Condensed
    (large numbers, op names, phase names,
    section titles 16px+)
  Never hardcode a font-family string.

### Borders
  All structural borders: 0.5px solid
  Never use 1px on structural elements.

### Prohibited
  No white (#fff) backgrounds anywhere
  No gradients on surfaces
  No position: fixed except toast components
  No decorative colours — semantic use only
  No AI labels visible to users
  No localStorage
  No hardcoded rgba numbers

### Modal overlays
  Background: rgba(var(--bg0-rgb), 0.85)
  Never use black or white overlay.

### Authentication
  Discord OAuth2 SSO only.
  No legacy key entry UI.
  Herald Bot handles all auth flows.

### App names
  ops-board = OPERATIONS
  industry = INDUSTRY
  intel = INTEL
  armory = ARMORY
  epic-archive = ARCHIVE
  commerce = COMMERCE
  logistics = LOGISTICS
