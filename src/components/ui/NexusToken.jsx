/**
 * NexusToken.jsx
 *
 * PURPOSE: Renders a tactical token image at a specified size with optional
 *          pulse ring animation for live/active states and opacity control
 *          for locked/inactive states. The single rendering component for
 *          all 232 token assets in the NexusOS token library.
 *
 * LOCATION: Renders inline wherever a token marker is placed — phase tracker
 *           nodes, SystemMap deposit overlays, threat panel rows, crew grid
 *           role indicators, rank badges, material table icons.
 *
 * DATA: No entity queries. Receives a pre-resolved src string from tokenMap.js.
 *
 * PROPS:
 *   src (string, required)     — Token path from tokenMap.js utility functions.
 *                                Never hardcode a path here; always derive via
 *                                the named helpers in tokenMap.js.
 *   size (number, default 32)  — Render width and height in px. Source images
 *                                are 280×280px RGBA PNG, so any size up to 280
 *                                is lossless. Below 16px, inner icon detail is
 *                                lost — use a plain NexusAvatar dot instead.
 *   pulse ('live'|'warn'|false) — Adds an animated ring around the token.
 *                                'live' uses var(--live) ring for ready/active.
 *                                'warn' uses var(--warn) ring for urgent/pending.
 *                                false (default) = no ring.
 *   opacity (number, default 1) — Override render opacity. Use 0.35 for locked
 *                                 or inactive states (matches o-low token var).
 *   alt (string, default '')   — Accessible alt text. Provide a meaningful
 *                                description for screen readers.
 *   className (string)         — Optional additional CSS class on the wrapper.
 *   onClick (function)         — Optional click handler. Adds cursor:pointer.
 *   title (string)             — Optional tooltip text (native browser title).
 *
 * RECOMMENDED SIZES:
 *   18–20px  Inline badge: priority number, compact phase indicator
 *   22px     Crew role dot replacement in CrewGrid
 *   24px     Material table row icon, blueprint registry dot
 *   16px     Rank pip in user chip topbar
 *   28–32px  Threat panel severity marker, SystemMap deposit
 *   36–40px  Phase tracker node (matches current circle dimensions)
 *   48px     Feature-level display: op type selector, profile rank
 *   280px    Herald Bot Discord embed thumbnail (original resolution)
 *
 * DESIGN NOTES:
 *   Tokens are RGBA PNGs designed for dark backgrounds. They render directly
 *   on bg0 with no wrapper background needed. Never add a background-color
 *   behind a token — the token carries its own dark frame.
 *
 *   The pulse ring uses position:absolute on a wrapping span, so the
 *   component switches between a bare <img> (no pulse) and a <span>+<img>
 *   (with pulse) depending on the pulse prop. Account for the span wrapper
 *   in flex/grid layout by checking whether pulse is active.
 *
 * AI NOTES:
 *   Do not add new colour variants or shape logic here. All token selection
 *   logic lives in src/lib/tokenMap.js. This component only renders.
 *   Do not add background colours, shadows, or borders to this component —
 *   the token's own visual frame handles all of that.
 *   The ring animation keyframe 'ring' and 'pulse-border-warn' must be
 *   defined in src/styles/tokens.css (they already are as of Series 1).
 */

import { memo } from 'react'

// ---------------------------------------------------------------------------
// Pulse ring styles — keyed by variant
// ---------------------------------------------------------------------------

const RING_STYLES = {
  live: {
    borderColor: 'var(--live)',
    animationName: 'ring',
    animationDuration: '2.2s',
    animationTimingFunction: 'ease-out',
    animationIterationCount: 'infinite',
  },
  warn: {
    borderColor: 'var(--warn)',
    animationName: 'ring',
    animationDuration: '1.6s',
    animationTimingFunction: 'ease-out',
    animationIterationCount: 'infinite',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   src: string;
 *   size?: number;
 *   pulse?: 'live' | 'warn' | false;
 *   opacity?: number;
 *   alt?: string;
 *   className?: string;
 *   onClick?: (() => void) | undefined;
 *   title?: string;
 * }} props
 */
function NexusToken({
  src,
  size = 32,
  pulse = false,
  opacity = 1,
  alt = '',
  className = '',
  onClick = undefined,
  title = '',
}) {
  /** @type {import('react').CSSProperties} */
  const imgStyle = {
    display: 'block',
    width:   size,
    height:  size,
    opacity,
    flexShrink:      0,
    userSelect:      'none',
    pointerEvents:   onClick ? 'auto' : 'none',
    cursor:          onClick ? 'pointer' : undefined,
    // Prevent blurry rendering at small sizes where browser default
    // bicubic resampling can soften the crisp token outlines.
    imageRendering:  size <= 24 ? 'crisp-edges' : undefined,
  }

  const img = (
    <img
      src={src}
      alt={alt}
      title={title}
      width={size}
      height={size}
      style={imgStyle}
      onClick={onClick}
      draggable={false}
    />
  )

  // No ring — return bare img, no wrapper overhead
  if (!pulse) {
    if (className) {
      return (
        <span
          className={className}
          style={{ display: 'inline-flex', flexShrink: 0 }}
        >
          {img}
        </span>
      )
    }
    return img
  }

  // With pulse ring — needs relative wrapper so ring can use absolute inset
  /** @type {import('react').CSSProperties} */
  const ringStyle = {
    position:      'absolute',
    inset:         -(size * 0.1),  // ring gap scales with token size
    borderRadius:  '50%',
    border:        '1px solid',
    pointerEvents: 'none',
    ...RING_STYLES[pulse],
  }

  return (
    <span
      className={className}
      style={{
        position:    'relative',
        display:     'inline-flex',
        flexShrink:  0,
        alignItems:  'center',
        justifyContent: 'center',
      }}
    >
      {img}
      <span style={ringStyle} aria-hidden="true" />
    </span>
  )
}

// Memo-ise: tokens are pure visual — same src/size/pulse/opacity = same output.
// This prevents re-render cascades in list contexts (phase nodes, material rows)
// where the parent re-renders frequently during live op state updates.
export default memo(NexusToken)
