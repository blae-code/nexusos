/**
 * tokenMap.js
 *
 * PURPOSE: Single source of truth for mapping NexusOS application state
 *          to tactical token image paths. All token colour choices enforce
 *          the NexusOS semantic colour system — colour is never decorative.
 *
 * USAGE:
 *   import { depositToken, threatToken, phaseToken, roleToken, rankToken,
 *            materialToken, priorityToken, opTypeToken, T } from '@/core/data/tokenMap'
 *
 * ASSET LOCATION: /public/tokens/token-*.png
 *   All 232 token files must be present. Run scripts/setup-tokens.sh once
 *   after cloning to copy assets and fix source filename typos.
 *
 * SEMANTIC COLOUR RULES (never violate these):
 *   green   → READY, T2+ quality, confirmed, complete       (maps to --live)
 *   red     → threat, danger, error, critical, hostile       (maps to --danger)
 *   orange  → warning, pending, T1-borderline, caution       (maps to --warn)
 *   yellow  → mild warning, needs attention but not urgent   (maps to --warn light)
 *   blue    → informational, active / in-progress            (maps to --info)
 *   cyan    → processing, neutral highlight, in-use          (maps to --acc / --acc2)
 *   grey    → stale, locked, inactive, needs re-verify       (maps to --t2)
 *   violet  → Pioneer rank, legendary-tier materials only    (reserved — rare)
 *   purple  → number cube variant (typographic alternative)  (internal use)
 *
 * AI NOTES:
 *   Do not add new token mappings that violate the semantic colour rules above.
 *   Do not hardcode colour names in JSX — always call a tokenMap function.
 *   The T() helper is exported for edge cases only; prefer the named helpers.
 */

// ---------------------------------------------------------------------------
// Base path helper
// ---------------------------------------------------------------------------

/**
 * T — low-level token path builder.
 * Prefer the named helper functions below for all application code.
 * @param {string} name — everything after "token-" and before ".png"
 * @returns {string} absolute public path
 */
export const T = (name) => `/tokens/token-${name}.png`


// ---------------------------------------------------------------------------
// Scout Intel — deposit markers
// ---------------------------------------------------------------------------

/**
 * depositToken
 * Returns the hex token path that communicates deposit quality and freshness.
 * Used as SVG map overlay markers in SystemMap.jsx and DepositPanel.jsx.
 *
 * @param {number} qualityPct  — 0–100 quality percentage
 * @param {boolean} isStale    — re-verify required (overrides quality colour)
 * @param {boolean} isActive   — org is actively running this deposit right now
 * @returns {string} token path
 */
export function depositToken(qualityPct, isStale = false, isActive = false) {
  if (isActive) return T('hex-cyan')       // in use this session
  if (isStale)  return T('hex-grey')       // needs re-verification
  if (qualityPct >= 80) return T('hex-green')    // T2 eligible
  if (qualityPct >= 60) return T('hex-yellow')   // T1, borderline
  return T('hex-red')                            // below threshold
}

/**
 * locationToken
 * Returns the appropriate token for a non-deposit map marker.
 * Used for stations, outposts, and hostile zones on the system map.
 *
 * @param {'station'|'outpost'|'hostile'|'objective'|'waypoint'} type
 * @param {boolean} isActive
 * @returns {string} token path
 */
export function locationToken(type, isActive = false) {
  const map = {
    station:   T('shelter-blue'),
    outpost:   T('shelter-cyan'),
    hostile:   T('target-alt-red'),
    objective: isActive ? T('objective-cyan') : T('objective-blue'),
    waypoint:  T('triangle-blue'),
  }
  return map[type] || T('circle-grey')
}


// ---------------------------------------------------------------------------
// Op Board — phase tracker nodes
// ---------------------------------------------------------------------------

/**
 * phaseToken
 * Returns a numbered cube token for a phase tracker node.
 * Numbers 1–13 supported; phases beyond 13 fall back to objective shape.
 *
 * @param {number} phaseNum    — 1-indexed phase number
 * @param {'DONE'|'ACTIVE'|'LOCKED'} state
 * @returns {string} token path
 *
 * NOTE ON LOCKED STATE:
 *   The source token library contains no grey variants for any number token
 *   (0–13). Grey number tokens simply do not exist in the asset archive.
 *   For LOCKED phases, this function returns the blue variant. The call site
 *   in PhaseTracker.jsx is responsible for passing opacity={0.35} when state
 *   is 'LOCKED' — a dim blue cube at 0.35 opacity is visually identical to
 *   a grey token at full opacity, and semantically correct since blue maps
 *   to "informational / not yet active" in the NexusOS colour system.
 *   Do not change this to 'grey' — that path does not exist and will produce
 *   a broken image on every phase node in the locked state.
 */
export function phaseToken(phaseNum, state) {
  const colorMap = {
    DONE:   'green',
    ACTIVE: 'cyan',
    LOCKED: 'blue',   // no grey number variants exist in the token library;
                      // render blue at opacity 0.35 (set at call site) instead
  }
  const color = colorMap[state] || 'blue'
  const n = Math.max(0, Math.min(13, phaseNum))
  return T(`number-${n}-${color}`)
}

/**
 * opStatusToken
 * Returns an objective-shape token for op-level status indicators.
 * Used in the op list hero and the LiveOp header.
 *
 * @param {'PLANNING'|'PUBLISHED'|'LIVE'|'STOOD_DOWN'|'CANCELLED'} status
 * @returns {string} token path
 */
export function opStatusToken(status) {
  const map = {
    PLANNING:    T('objective-grey'),
    PUBLISHED:   T('objective-blue'),
    LIVE:        T('objective-cyan'),
    STOOD_DOWN:  T('objective-green'),
    CANCELLED:   T('objective-red'),
  }
  return map[status] || T('objective-grey')
}


// ---------------------------------------------------------------------------
// Op Board — threat panel
// ---------------------------------------------------------------------------

/**
 * threatToken
 * Returns a targeting token for a threat row in ThreatPanel.jsx.
 * target (crosshair) = confirmed active threat
 * target-alt (X-mark) = secondary / unconfirmed threat
 *
 * @param {'HIGH'|'MED'|'LOW'} severity
 * @param {boolean} isResolved
 * @returns {string} token path
 */
export function threatToken(severity, isResolved = false) {
  if (isResolved) return T('target-grey')
  const map = {
    HIGH: T('target-red'),
    MED:  T('target-alt-orange'),
    LOW:  T('target-alt-grey'),
  }
  return map[severity] || T('target-grey')
}


// ---------------------------------------------------------------------------
// Op Board — crew grid role markers
// ---------------------------------------------------------------------------

/**
 * roleToken
 * Returns a circle token for crew role identification in CrewGrid.jsx.
 * Replaces the 8px role colour dot.
 *
 * @param {'MINING'|'ESCORT'|'FABRICATOR'|'SCOUT'|'COMMAND'|'MEDICAL'|'UNASSIGNED'} role
 * @returns {string} token path
 */
export function roleToken(role) {
  const map = {
    MINING:      T('circle-cyan'),
    ESCORT:      T('circle-red'),
    FABRICATOR:  T('circle-orange'),
    SCOUT:       T('circle-green'),
    COMMAND:     T('circle-blue'),
    MEDICAL:     T('circle-violet'),
    UNASSIGNED:  T('circle-grey'),
  }
  return map[role] || T('circle-grey')
}


// ---------------------------------------------------------------------------
// Rank indicators
// ---------------------------------------------------------------------------

/**
 * rankToken
 * Returns a penta (pentagon) token for the org rank system.
 * Pentagon has five sides; org has five active rank tiers — intentional.
 * Used in: user chip dropdown, profile settings,
 * roster module member cards.
 *
 * @param {'PIONEER'|'FOUNDER'|'VOYAGER'|'SCOUT'|'VAGRANT'|'AFFILIATE'|string} rank
 * @returns {string} token path
 */
export function rankToken(rank) {
  const map = {
    PIONEER:   T('penta-cyan'),      // highest — cyan matches org identity
    FOUNDER:   T('penta-violet'),    // founding member — rare violet
    VOYAGER:   T('penta-blue'),      // full member
    SCOUT:     T('penta-green'),     // active operator
    VAGRANT:   T('penta-grey'),      // new / probationary
    AFFILIATE: T('penta-orange'),    // external / allied
  }
  return map[rank] || T('penta-grey')
}


// ---------------------------------------------------------------------------
// Industry Hub — material category icons
// ---------------------------------------------------------------------------

/**
 * materialToken
 * Returns a resource token for a material row icon in the material table.
 * Token colour communicates T2 eligibility status simultaneously with shape
 * communicating material category — two data points, one element.
 *
 * @param {'ore'|'salvage'|'fuel'|'energy'|'ammo'|'food'|'medical'|'general'} category
 * @param {'CRAFT-READY'|'BELOW T2'|'REFINE FIRST'|'T1 ONLY'|'neutral'} status
 * @returns {string} token path
 */
export function materialToken(category, status = 'neutral') {
  const colorMap = {
    'CRAFT-READY':   'green',
    'BELOW T2':      'yellow',
    'REFINE FIRST':  'orange',
    'T1 ONLY':       'grey',
    'neutral':       'cyan',
  }
  const shapeMap = {
    ore:      'hex',
    salvage:  'mechanics',
    fuel:     'fuel',
    energy:   'energy',
    ammo:     'ammunition',
    food:     'food',
    medical:  'hospital',
    general:  'square',
  }
  const color = colorMap[status] || 'cyan'
  const shape = shapeMap[category] || 'square'
  return T(`${shape}-${color}`)
}

/**
 * blueprintToken
 * Returns a square-diamond token for blueprint registry items.
 * The diamond shape signals "this item has an operational designation."
 *
 * @param {boolean} isOwned
 * @param {boolean} isPriority
 * @returns {string} token path
 */
export function blueprintToken(isOwned, isPriority) {
  if (!isOwned && isPriority) return T('square-red')
  if (!isOwned) return T('square-grey')
  if (isPriority) return T('square-orange')
  return T('square-cyan')
}


// ---------------------------------------------------------------------------
// Craft Queue — priority badges
// ---------------------------------------------------------------------------

/**
 * priorityToken
 * Returns a numbered cube token for craft queue job priority badges.
 * Rendered at 20px top-left of each job card.
 *
 * @param {number} num          — priority number (1–13)
 * @param {'critical'|'high'|'normal'|'low'} level
 * @returns {string} token path
 */
export function priorityToken(num, level = 'normal') {
  const colorMap = {
    critical: 'red',
    high:     'orange',
    normal:   'cyan',
    low:      'grey',
  }
  const color = colorMap[level] || 'cyan'
  const n = Math.max(0, Math.min(13, num))
  return T(`number-${n}-${color}`)
}


// ---------------------------------------------------------------------------
// Op Creator — op type selector
// ---------------------------------------------------------------------------

/**
 * opTypeToken
 * Returns an iconic token for the op type segmented control in OpCreator.jsx.
 * Displayed at 24px alongside the type label.
 *
 * @param {'MINING'|'SALVAGE'|'COMBAT'|'ESCORT'|'RESCUE'|'EXPLORATION'|'DELIVERY'} type
 * @returns {string} token path
 */
export function opTypeToken(type) {
  const map = {
    MINING:      T('hex-cyan'),
    SALVAGE:     T('mechanics-orange'),
    COMBAT:      T('target-red'),
    ESCORT:      T('target-alt-blue'),
    RESCUE:      T('hospital-green'),
    EXPLORATION: T('objective-blue'),
    DELIVERY:    T('fuel-yellow'),
  }
  return map[type] || T('objective-grey')
}


// ---------------------------------------------------------------------------
// Herald Bot — embed thumbnails
// Used server-side in heraldBot.ts to set embed thumbnail URLs.
// Tokens must be accessible as public URLs at your deployment domain.
// Base URL should be set via NEXUSOS_PUBLIC_URL environment variable.
// ---------------------------------------------------------------------------

/**
 * heraldTokenUrl
 * Returns an absolute URL for a token, suitable for Discord embed thumbnails.
 * Call from heraldBot.ts only — not for client-side React use.
 *
 * @param {string} tokenName   — e.g. 'objective-blue', 'hex-grey'
 * @param {string} baseUrl     — process.env.NEXUSOS_PUBLIC_URL
 * @returns {string} absolute URL
 */
export function heraldTokenUrl(tokenName, baseUrl) {
  const base = baseUrl?.replace(/\/$/, '') || ''
  return `${base}/tokens/token-${tokenName}.png`
}

// Named presets for heraldBot.ts actions
export const HERALD_TOKENS = {
  opAnnounce:     'objective-blue',
  opLive:         'objective-cyan',
  opStoodDown:    'objective-green',
  opCancelled:    'objective-red',
  keyDelivered:   'square-cyan',
  keyRevoked:     'square-red',
  threatHigh:     'target-red',
  threatMed:      'target-alt-orange',
  depositStale:   'hex-grey',
  depositReady:   'hex-green',
  armoryUpdate:   'mechanics-blue',
  patchDigest:    'energy-blue',
  craftComplete:  'square-green',
  craftPending:   'square-orange',
  rescueActive:   'hospital-red',
}


// ---------------------------------------------------------------------------
// Utility — preload hints for above-the-fold tokens
// Call once in Shell.jsx to pre-warm the browser image cache for the tokens
// that will appear immediately on any screen: rank in topbar, phase nodes,
// deposit markers. Prevents token pop-in on first navigation.
// ---------------------------------------------------------------------------

/**
 * preloadCriticalTokens
 * Call from Shell.jsx useEffect on mount.
 * @param {'PIONEER'|'FOUNDER'|'VOYAGER'|'SCOUT'|'VAGRANT'|'AFFILIATE'|string} userRank
 * @param {number} maxPhases  — how many phase tokens to preload (default 6)
 */
export function preloadCriticalTokens(userRank, maxPhases = 6) {
  const paths = [
    // Rank token for user chip
    rankToken(userRank),
    // All status colours for deposit markers (SystemMap loads them all)
    T('hex-green'), T('hex-yellow'), T('hex-red'), T('hex-grey'), T('hex-cyan'),
    // Phase nodes 1–maxPhases in all three states
    ...Array.from({ length: maxPhases }, (_, i) => [
      phaseToken(i + 1, 'DONE'),
      phaseToken(i + 1, 'ACTIVE'),
      phaseToken(i + 1, 'LOCKED'),  // returns blue variant — grey doesn't exist
    ]).flat(),
    // Op status set
    T('objective-grey'), T('objective-blue'), T('objective-cyan'),
    T('objective-green'), T('objective-red'),
    // Common threat tokens
    T('target-red'), T('target-alt-orange'), T('target-grey'),
  ];

  // Deduplicate and create link preload hints
  [...new Set(paths)].forEach(path => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = path
    document.head.appendChild(link)
  })
}
