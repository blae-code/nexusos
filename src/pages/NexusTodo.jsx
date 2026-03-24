import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  ExternalLink,
  RefreshCw,
  ScanSearch,
  Target,
} from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import { appParams } from '@/core/data/app-params';
import { safeLocalStorage } from '@/core/data/safe-storage';

const MANUAL_STORAGE_KEY = 'nexus_todo_v1_checked';

/* ═══════════════════════════════════════════════════════════════════════════════
   V1.0 PRODUCTION ROADMAP
   ═══════════════════════════════════════════════════════════════════════════════ */

const PHASES = [
  // ─── PHASE 1: DISCORD DECOUPLING ────────────────────────────────────────────
  {
    phase: 'PHASE 1',
    title: 'DISCORD DECOUPLING',
    description: 'Remove all Discord dependencies so NexusOS runs as a fully independent platform.',
    color: '#C0392B',
    items: [
      // 1A: Entity schema changes
      {
        id: 'P1_ENTITY_SCOUT',
        label: 'ScoutDeposit: replace reported_by (discord_id) → nexus_user_id',
        detail: 'Add nexus_user_id field. Migrate existing data using callsign cross-reference. Keep reported_by_callsign for display.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_CRAFT',
        label: 'CraftQueue: replace requested_by/claimed_by (discord_id) → nexus_user_id',
        detail: 'Add requested_by_user_id, claimed_by_user_id. Keep callsign fields for display. Update CraftQueueTab form.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_REFINERY',
        label: 'RefineryOrder: replace submitted_by (discord_id) → nexus_user_id',
        detail: 'Add submitted_by_user_id. Keep submitted_by_callsign for display. Update RefineryManagement form.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_CARGO',
        label: 'CargoLog: replace logged_by (discord_id) → nexus_user_id',
        detail: 'Add logged_by_user_id. Keep logged_by_callsign. Update CargoTracker form.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_MATERIAL',
        label: 'Material: replace logged_by (discord_id) → nexus_user_id',
        detail: 'Add logged_by_user_id. Keep logged_by_callsign. Update Materials form and OCR pipeline.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_BLUEPRINT',
        label: 'Blueprint: replace owned_by (discord_id) → nexus_user_id',
        detail: 'Add owned_by_user_id. Keep owned_by_callsign. Update Blueprints module.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_COFFER',
        label: 'CofferLog: replace logged_by (discord_id) → nexus_user_id',
        detail: 'Add logged_by_user_id. Keep logged_by_callsign. Update CofferLedger.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_OP',
        label: 'Op: replace created_by (discord_id) → nexus_user_id, remove discord_event_id/discord_message_id',
        detail: 'Add created_by_user_id. Remove discord_event_id, discord_message_id fields. Update OpCreator + LiveOp.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_OPRSVP',
        label: 'OpRsvp: replace discord_id → nexus_user_id',
        detail: 'Add user_id field. Remove discord_id. RSVP now linked via NexusUser.id instead of Discord identity.',
        priority: 'CRITICAL',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_FLEETBUILD',
        label: 'FleetBuild: replace created_by (discord_id) → nexus_user_id',
        detail: 'Add created_by_user_id. Keep created_by_callsign. Update FleetForge.',
        priority: 'HIGH',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P1_ENTITY_NEXUSUSER',
        label: 'NexusUser: deprecate discord-only fields',
        detail: 'Fields discord_id, discord_roles, roles_synced_at can remain but are no longer required or synced. Remove discord_id from required fields if present.',
        priority: 'HIGH',
        tags: ['ENTITY'],
      },
      {
        id: 'P1_ENTITY_NEXUSCONFIG',
        label: 'NexusConfig: remove discord_client_id, discord_guild_id fields',
        detail: 'These are no longer used since Discord OAuth is removed. Keep fleetyards_handle and rsi_org_sid.',
        priority: 'MEDIUM',
        tags: ['ENTITY'],
      },

      // 1B: Backend function changes
      {
        id: 'P1_FUNC_HERALD',
        label: 'Deactivate heraldBot function',
        detail: 'The entire heraldBot (1044 lines) is Discord-only. All 20+ actions (publishOp, rsvpUpdate, opGo, threatAlert, rescueAlert, etc.) route to Discord channels. Deactivate — do not delete yet (preserve for reference).',
        priority: 'CRITICAL',
        tags: ['BACKEND'],
      },
      {
        id: 'P1_FUNC_PUBLISH',
        label: 'Deactivate publishOpToDiscord function',
        detail: 'Thin wrapper that calls heraldBot publishOp. Remove or stub.',
        priority: 'CRITICAL',
        tags: ['BACKEND'],
      },
      {
        id: 'P1_FUNC_ROLESYNC',
        label: 'Deactivate discordRoleSync function + automation',
        detail: 'Background job that syncs Discord roles → NexusUser.nexus_rank. Rank management will be manual via Key Management. Disable the scheduled automation.',
        priority: 'CRITICAL',
        tags: ['BACKEND', 'AUTOMATION'],
      },
      {
        id: 'P1_FUNC_ORGHEALTH_DECOUPLE',
        label: 'orgHealthAgent: remove heraldBot Discord call',
        detail: 'Lines 138-155: remove the heraldBot invocation. The housekeeping and Claude briefing are valuable — store briefing in a new OrgBriefing entity or append to NexusConfig instead of posting to Discord.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P1_FUNC_ARMORY_DECOUPLE',
        label: 'armoryStockAlert: remove heraldBot call',
        detail: 'Lines 30-47: remove heraldBot invocation. Alert data is already returned in the response. Add an in-app notification entity or surface alerts in the Armory page directly.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P1_FUNC_REFINERY_DECOUPLE',
        label: 'refineryCompletionAlert: remove heraldBot call',
        detail: 'Lines 24-37: remove heraldBot invocation. Refinery READY status is already visible in the Refinery tab. Consider an in-app notification instead.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },

      // 1C: Auth removal
      {
        id: 'P1_AUTH_DISCORD_START',
        label: 'Remove auth/discord/start function',
        detail: 'Discord OAuth start endpoint. No longer needed — all auth uses issued key flow.',
        priority: 'HIGH',
        tags: ['BACKEND', 'AUTH'],
      },
      {
        id: 'P1_AUTH_DISCORD_CALLBACK',
        label: 'Remove auth/discord/callback function',
        detail: 'Discord OAuth callback handler (role mapping, session creation via Discord). Replace entirely with issued key flow.',
        priority: 'HIGH',
        tags: ['BACKEND', 'AUTH'],
      },
      {
        id: 'P1_AUTH_DISCORD_AUTOMATIONS',
        label: 'Remove the 2 Discord Role Sync automations',
        detail: 'Automation IDs: 69b77d7a6dda3f720d5d2cdb and 69c0a7c8aec3b6ee04b1a3f2. Both call discordRoleSync on schedule.',
        priority: 'HIGH',
        tags: ['AUTOMATION'],
      },

      // 1D: Frontend cleanup
      {
        id: 'P1_FE_ACCESSGATE',
        label: 'AccessGate: remove Discord OAuth login path',
        detail: 'If any Discord login button or redirect exists in AccessGate, remove it. Issued key login is the sole auth method.',
        priority: 'MEDIUM',
        tags: ['FRONTEND'],
      },
      {
        id: 'P1_FE_OPCREATOR',
        label: 'OpCreator: remove "Publish to Discord" button/flow',
        detail: 'Remove publishOpToDiscord invocation. Op publish should only update Op.status to PUBLISHED within NexusOS.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P1_FE_LIVEOP',
        label: 'LiveOp: remove Discord embed refresh, RSVP sync references',
        detail: 'Remove any code that calls heraldBot for rsvpUpdate, opGo, opActivate, phaseAdvance, threatAlert, opEnd, opWrapUp.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P1_FE_MATERIAL_OCR',
        label: 'Materials: remove OCR_DISCORD source_type option',
        detail: 'Keep OCR_UPLOAD and MANUAL. Remove any references to Discord channel image watching.',
        priority: 'MEDIUM',
        tags: ['FRONTEND'],
      },
      {
        id: 'P1_FE_SIDEBAR',
        label: 'Remove any Discord-related navigation entries from sidebar',
        detail: 'Verify NexusSidebar has no Discord links or integration references.',
        priority: 'LOW',
        tags: ['FRONTEND'],
      },

      // 1E: Secrets cleanup
      {
        id: 'P1_SECRETS_CLEANUP',
        label: 'Remove Discord-specific environment secrets',
        detail: 'The following secrets can be removed: DISCORD_OPS_BOARD_CHANNEL_ID, DISCORD_CHANNEL_OPS_RESULTS, DISCORD_CHANNEL_OPS_BOARD, DISCORD_REDIRECT_URI, DISCORD_GUILD_ID, DISCORD_BOT_TOKEN, DISCORD_CLIENT_SECRET, DISCORD_CLIENT_ID, and all DISCORD_TEST_* IDs. Keep SESSION_SIGNING_SECRET, APP_URL, SYSTEM_ADMIN_BOOTSTRAP_SECRET.',
        priority: 'MEDIUM',
        tags: ['CONFIG'],
      },
    ],
  },

  // ─── PHASE 2: IN-APP NOTIFICATION SYSTEM ────────────────────────────────────
  {
    phase: 'PHASE 2',
    title: 'IN-APP NOTIFICATIONS',
    description: 'Replace Discord notifications with a native NexusOS notification system.',
    color: '#C8A84B',
    items: [
      {
        id: 'P2_ENTITY_NOTIFICATION',
        label: 'Create NexusNotification entity',
        detail: 'Schema: { type, title, body, severity (INFO/WARN/CRITICAL), target_user_id (null=broadcast), source_module, source_id, read, created_at }. This replaces all heraldBot Discord posts.',
        priority: 'CRITICAL',
        tags: ['ENTITY'],
      },
      {
        id: 'P2_FUNC_NOTIFY',
        label: 'Create notifyUser backend function',
        detail: 'Accepts { type, title, body, severity, target_user_id } and creates a NexusNotification record. Called by orgHealthAgent, armoryStockAlert, refineryCompletionAlert, etc.',
        priority: 'CRITICAL',
        tags: ['BACKEND'],
      },
      {
        id: 'P2_FE_BELL',
        label: 'Add notification bell to NexusTopbar',
        detail: 'Display unread count badge. Clicking opens a dropdown with recent notifications. Use real-time subscription on NexusNotification entity.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P2_FE_CENTER',
        label: 'Create Notification Center page',
        detail: 'Full notification history with filters by type, severity, read/unread. Route: /app/notifications.',
        priority: 'MEDIUM',
        tags: ['FRONTEND'],
      },
      {
        id: 'P2_WIRE_ORGHEALTH',
        label: 'Wire orgHealthAgent → notifyUser (broadcast)',
        detail: 'Replace the heraldBot call with a notifyUser call. Store the Claude briefing as a notification with type=ORG_BRIEFING.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P2_WIRE_ARMORY',
        label: 'Wire armoryStockAlert → notifyUser',
        detail: 'Create ARMORY_LOW_STOCK notifications for each low-stock item.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P2_WIRE_REFINERY',
        label: 'Wire refineryCompletionAlert → notifyUser',
        detail: 'Create REFINERY_READY notification targeted to the user who submitted the order.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P2_WIRE_OP_ALERTS',
        label: 'Wire op lifecycle events → notifyUser',
        detail: 'Op PUBLISHED → broadcast, Op LIVE → broadcast, Phase Advance → broadcast, Threat Alert → broadcast, Op COMPLETE → broadcast.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P2_WIRE_SCOUT',
        label: 'Wire high-quality scout deposit → notifyUser',
        detail: 'On ScoutDeposit create with quality_score ≥ 800 (80%), create SCOUT_T2_DEPOSIT broadcast notification.',
        priority: 'MEDIUM',
        tags: ['BACKEND'],
      },
      {
        id: 'P2_WIRE_RESCUE',
        label: 'Wire rescue call → notifyUser',
        detail: 'On rescue call OPEN, create RESCUE_DISTRESS broadcast notification. Critical severity.',
        priority: 'MEDIUM',
        tags: ['BACKEND'],
      },
      {
        id: 'P2_BROWSER_PUSH',
        label: 'Preserve existing browser push notification support',
        detail: 'NexusShell already has notifyBrowser() for backgrounded tabs. Ensure this still fires from the real-time subscription instead of the old polling approach.',
        priority: 'LOW',
        tags: ['FRONTEND'],
      },
    ],
  },

  // ─── PHASE 3: DATA INTEGRITY & VALIDATION ──────────────────────────────────
  {
    phase: 'PHASE 3',
    title: 'DATA INTEGRITY & VALIDATION',
    description: 'Ensure all user inputs are validated server-side and data is consistent.',
    color: '#4A8C5C',
    items: [
      {
        id: 'P3_VALIDATE_MATERIAL',
        label: 'Server-side validation: Material creation',
        detail: 'Validate material_name (required, non-empty), material_type (valid enum), quantity_scu (≥0), quality_score (1-1000). Reject invalid entries at the backend.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P3_VALIDATE_REFINERY',
        label: 'Server-side validation: RefineryOrder creation',
        detail: 'Validate material_name, quantity_scu (>0), method (valid enum), station. Prevent duplicate active orders for same material+station+user.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P3_VALIDATE_CRAFT',
        label: 'Server-side validation: CraftQueue creation',
        detail: 'Validate blueprint_id exists, quantity (>0), status (valid enum). Verify blueprint ownership before allowing craft start.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P3_VALIDATE_OPRSVP',
        label: 'Server-side validation: OpRsvp creation',
        detail: 'Prevent duplicate RSVPs (same user + op). Validate role is a valid slot in the Op. Validate op is PUBLISHED or LIVE.',
        priority: 'HIGH',
        tags: ['BACKEND'],
      },
      {
        id: 'P3_VALIDATE_SCOUT',
        label: 'Server-side validation: ScoutDeposit creation',
        detail: 'Validate material_name, system_name, quality_score (1-1000). Prevent near-duplicate deposits (same material + system + location within 1 hour).',
        priority: 'MEDIUM',
        tags: ['BACKEND'],
      },
      {
        id: 'P3_QUALITY_NORMALIZATION',
        label: 'Normalize quality representation across all entities',
        detail: 'Some entities use quality_score (1-1000), others use quality_pct (0-100). Standardize on quality_score (1-1000) in entities, compute display % in frontend. Audit: Material, ScoutDeposit, ComponentHarvest, RefineryOrder.',
        priority: 'HIGH',
        tags: ['ENTITY', 'MIGRATION'],
      },
      {
        id: 'P3_CALLSIGN_CONSISTENCY',
        label: 'Ensure all *_callsign fields are auto-populated from session',
        detail: 'Frontend forms should auto-fill callsign fields from the session context, not allow freeform entry. Prevents misattribution.',
        priority: 'MEDIUM',
        tags: ['FRONTEND'],
      },
      {
        id: 'P3_SDK_VERSION',
        label: 'Upgrade all backend functions from SDK 0.8.20 → 0.8.21',
        detail: 'Multiple functions import npm:@base44/sdk@0.8.20. Update to 0.8.21 for consistency and latest fixes.',
        priority: 'MEDIUM',
        tags: ['BACKEND'],
      },
    ],
  },

  // ─── PHASE 4: STABILITY & ERROR HANDLING ────────────────────────────────────
  {
    phase: 'PHASE 4',
    title: 'STABILITY & ERROR HANDLING',
    description: 'Harden the app for production use under real conditions.',
    color: '#4A8FD0',
    items: [
      {
        id: 'P4_ERROR_BOUNDARY',
        label: 'Verify AppErrorBoundary covers all routes',
        detail: 'NexusShell wraps Outlet in AppErrorBoundary. Verify AccessGate, Onboarding, and standalone routes also have error boundaries.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P4_SESSION_EXPIRY',
        label: 'Handle session expiry gracefully in-app',
        detail: 'When auth/session returns 401, redirect user to AccessGate with a "Session expired" message instead of showing a broken state.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P4_LOADING_STATES',
        label: 'Audit all pages for loading/empty state handling',
        detail: 'Every page should show a loading skeleton while data loads, and a clear empty state when no data exists. Audit: IndustryHub, OpBoard, ScoutIntel, Armory, CofferLedger, MaterialLedger, FleetForge.',
        priority: 'MEDIUM',
        tags: ['FRONTEND'],
      },
      {
        id: 'P4_OPTIMISTIC_UPDATES',
        label: 'Add optimistic UI for critical write operations',
        detail: 'Material logging, RSVP toggling, craft queue submission — show immediate feedback before server confirms.',
        priority: 'LOW',
        tags: ['FRONTEND'],
      },
      {
        id: 'P4_RATE_LIMIT_UEX',
        label: 'Add retry/backoff to UEX API sync functions',
        detail: 'commodityPriceSync and gameDataSync hit external UEX API. Add exponential backoff on 429/5xx responses. Currently 17 failures on price sync.',
        priority: 'MEDIUM',
        tags: ['BACKEND'],
      },
      {
        id: 'P4_AUTOMATION_DEDUP',
        label: 'Remove duplicate patch digest automations',
        detail: 'Two automations both call patchDigestProcessor: "Daily Patch Digest Check" (24h) and "Patch Digest Monitor" (2h). Keep only the 2h one, disable the daily duplicate.',
        priority: 'HIGH',
        tags: ['AUTOMATION'],
      },
      {
        id: 'P4_PATCH_AGENT_OVERLAP',
        label: 'Deduplicate patch monitoring pipeline',
        detail: 'Three overlapping automations: patchFeedPoller (6h), patchDigestProcessor (2h + 24h), patchIntelligenceAgent (30m). Consolidate into a single pipeline to prevent duplicate PatchDigest records.',
        priority: 'HIGH',
        tags: ['AUTOMATION', 'BACKEND'],
      },
    ],
  },

  // ─── PHASE 5: FIELD TESTING READINESS ───────────────────────────────────────
  {
    phase: 'PHASE 5',
    title: 'FIELD TESTING READINESS',
    description: 'Prepare the app for live use with real org members.',
    color: '#9B59B6',
    items: [
      {
        id: 'P5_KEY_MGMT_BULK',
        label: 'Key Management: bulk issue keys for field test cohort',
        detail: 'Ensure Key Management page supports issuing 10-20 keys at once. Verify revoke and regenerate work reliably.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P5_ONBOARDING_FLOW',
        label: 'Verify onboarding flow end-to-end',
        detail: 'New user → AccessGate → issued key login → Onboarding page → consent → profile setup → redirect to /app/industry. Test with a fresh NexusUser.',
        priority: 'HIGH',
        tags: ['FRONTEND', 'AUTH'],
      },
      {
        id: 'P5_MOBILE_RESPONSIVE',
        label: 'Audit critical pages for mobile responsiveness',
        detail: 'AccessGate, IndustryHub overview, OpBoard, ScoutIntel, and Armory must be usable on mobile. The 220px fixed sidebar needs a mobile hamburger toggle.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P5_SIDEBAR_MOBILE',
        label: 'Implement mobile sidebar toggle (hamburger menu)',
        detail: 'NexusSidebar is fixed 220px — breaks on screens <768px. Add a hamburger button on mobile that toggles sidebar visibility with an overlay.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P5_ADMIN_RANK_MGMT',
        label: 'Admin: manual rank management in Key Management',
        detail: 'Admins need to set nexus_rank per user directly in Key Management since Discord role sync is removed. Add rank dropdown to user edit.',
        priority: 'CRITICAL',
        tags: ['FRONTEND'],
      },
      {
        id: 'P5_FEEDBACK_FORM',
        label: 'Add in-app feedback/bug report form',
        detail: 'Simple form accessible from the sidebar or topbar. Stores submissions in a Feedback entity with user, page, description, screenshot URL.',
        priority: 'MEDIUM',
        tags: ['FRONTEND', 'ENTITY'],
      },
      {
        id: 'P5_DATA_SEED',
        label: 'Seed test data for field testing',
        detail: 'Create sample Materials, Blueprints, an Op, and ScoutDeposits so testers see a populated app on first login.',
        priority: 'MEDIUM',
        tags: ['DATA'],
      },
      {
        id: 'P5_HANDBOOK_QUICKSTART',
        label: 'Write a quickstart guide in the Handbook',
        detail: 'Cover: how to log in, navigate, log materials, RSVP to ops, check refinery status. Users should not need external documentation.',
        priority: 'MEDIUM',
        tags: ['CONTENT'],
      },
    ],
  },

  // ─── PHASE 6: LAUNCH CHECKLIST ──────────────────────────────────────────────
  {
    phase: 'PHASE 6',
    title: 'V1.0 LAUNCH CHECKLIST',
    description: 'Final checks before declaring production-ready.',
    color: '#E8E4DC',
    items: [
      {
        id: 'P6_ENV_AUDIT',
        label: 'Audit all environment secrets',
        detail: 'Verify SESSION_SIGNING_SECRET, APP_URL, SYSTEM_ADMIN_BOOTSTRAP_SECRET are set correctly. Verify UEX_API_KEY and SC_API_KEY are valid. Remove all Discord-specific secrets.',
        priority: 'CRITICAL',
        tags: ['CONFIG'],
      },
      {
        id: 'P6_AUTOMATION_AUDIT',
        label: 'Audit all active automations',
        detail: 'Verify only needed automations are active: commodityPriceSync (30m), gameDataSync (6h), patchIntelligenceAgent (30m), orgHealthAgent (daily), armoryStockAlert (6h). Disable or remove any Discord-dependent automations.',
        priority: 'CRITICAL',
        tags: ['AUTOMATION'],
      },
      {
        id: 'P6_AUTH_SMOKE',
        label: 'Smoke test: full auth lifecycle',
        detail: 'Bootstrap → issue key → login → session persistence → logout → re-login → revoke → login fails → regenerate → login succeeds.',
        priority: 'CRITICAL',
        tags: ['AUTH'],
      },
      {
        id: 'P6_CRUD_SMOKE',
        label: 'Smoke test: CRUD on all core entities',
        detail: 'Create, read, update, delete for: Material, Blueprint, CraftQueue, RefineryOrder, ScoutDeposit, Op, OpRsvp, CargoLog, CofferLog, OrgShip, FleetBuild, ComponentHarvest.',
        priority: 'HIGH',
        tags: ['DATA'],
      },
      {
        id: 'P6_REALTIME_CHECK',
        label: 'Verify real-time subscriptions work across tabs',
        detail: 'Open NexusOS in two browser tabs. Create a Material in one, verify it appears in the other without refresh.',
        priority: 'HIGH',
        tags: ['FRONTEND'],
      },
      {
        id: 'P6_ZERO_DISCORD_CHECK',
        label: 'Verify zero Discord calls in production',
        detail: 'Search entire codebase for discord.com API calls, DISCORD_ env references, heraldBot invocations. Confirm none are active in any running function.',
        priority: 'CRITICAL',
        tags: ['AUDIT'],
      },
      {
        id: 'P6_VERSIONING',
        label: 'Set app version to 1.0.0',
        detail: 'Update any version display in the Topbar footer, BootScreen, and AccessGate footer from development/4.7.0 to 1.0.0.',
        priority: 'LOW',
        tags: ['CONFIG'],
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   UI CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const PRIORITY_STYLES = {
  CRITICAL: { color: '#C0392B', bg: 'rgba(192,57,43,0.08)', border: 'rgba(192,57,43,0.25)' },
  HIGH:     { color: '#C8A84B', bg: 'rgba(200,168,75,0.08)', border: 'rgba(200,168,75,0.25)' },
  MEDIUM:   { color: '#4A8FD0', bg: 'rgba(74,143,208,0.08)', border: 'rgba(74,143,208,0.25)' },
  LOW:      { color: '#9A9488', bg: 'transparent', border: 'rgba(200,170,100,0.12)' },
};

const TAG_COLORS = {
  ENTITY:     '#C8A84B',
  MIGRATION:  '#C0392B',
  BACKEND:    '#4A8FD0',
  FRONTEND:   '#4A8C5C',
  AUTOMATION: '#9B59B6',
  AUTH:       '#C0392B',
  CONFIG:     '#9A9488',
  DATA:       '#C8A84B',
  CONTENT:    '#E8E4DC',
  AUDIT:      '#C0392B',
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PERSISTENCE
   ═══════════════════════════════════════════════════════════════════════════════ */

function loadChecks() {
  try { return JSON.parse(safeLocalStorage.getItem(MANUAL_STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveChecks(checks) {
  safeLocalStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(checks));
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.LOW;
  return (
    <span style={{
      fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      color: s.color, border: `0.5px solid ${s.border}`, borderRadius: 2,
      padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0,
    }}>
      {priority}
    </span>
  );
}

function TagChip({ tag }) {
  const color = TAG_COLORS[tag] || '#9A9488';
  return (
    <span style={{
      fontSize: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
      color, border: `0.5px solid ${color}40`, borderRadius: 2,
      padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {tag}
    </span>
  );
}

function TodoItem({ item, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const ps = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.LOW;

  return (
    <div style={{
      background: checked ? 'transparent' : ps.bg,
      border: `0.5px solid ${checked ? 'rgba(200,170,100,0.06)' : ps.border}`,
      borderRadius: 2, overflow: 'hidden',
      opacity: checked ? 0.45 : 1, transition: 'opacity 0.15s',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(o => !o)}
      >
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggle(item.id); }}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
            color: checked ? '#4A8C5C' : '#5A5850', display: 'flex',
          }}
        >
          {checked ? <CheckCircle size={14} /> : <Circle size={14} />}
        </button>
        <span style={{
          flex: 1, color: checked ? 'var(--t2)' : '#E8E4DC',
          fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
          textDecoration: checked ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.label}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {(item.tags || []).map(t => <TagChip key={t} tag={t} />)}
        </div>
        <PriorityBadge priority={item.priority} />
        {expanded ? <ChevronDown size={11} style={{ color: '#5A5850', flexShrink: 0 }} /> : <ChevronRight size={11} style={{ color: '#5A5850', flexShrink: 0 }} />}
      </div>
      {expanded && (
        <div style={{ padding: '0 12px 10px 36px' }}>
          <div style={{ color: '#9A9488', fontSize: 11, lineHeight: 1.7, fontFamily: "'Barlow', sans-serif" }}>
            {item.detail}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseSection({ phase, checks, onToggle }) {
  const [collapsed, setCollapsed] = useState(false);
  const done = phase.items.filter(i => checks[i.id]).length;
  const total = phase.items.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const critLeft = phase.items.filter(i => i.priority === 'CRITICAL' && !checks[i.id]).length;

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{
          width: 32, height: 32,
          background: `${phase.color}18`, border: `0.5px solid ${phase.color}40`,
          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
          color: phase.color, letterSpacing: '0.05em',
        }}>
          {phase.phase.replace('PHASE ', '')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700,
              color: phase.color, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {phase.title}
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              color: '#9A9488', fontWeight: 400,
            }}>
              {done}/{total}
            </span>
            {critLeft > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#C0392B' }}>
                <AlertTriangle size={10} /> {critLeft} critical
              </span>
            )}
          </div>
          <div style={{ height: 3, background: 'rgba(200,170,100,0.10)', borderRadius: 1, marginTop: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 1, width: `${pct}%`,
              background: pct === 100 ? '#4A8C5C' : phase.color,
              transition: 'width 0.3s ease-out',
            }} />
          </div>
          <div style={{ color: '#5A5850', fontSize: 10, marginTop: 3, fontFamily: "'Barlow', sans-serif" }}>
            {phase.description}
          </div>
        </div>
        {collapsed ? <ChevronRight size={14} style={{ color: '#5A5850', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: '#5A5850', flexShrink: 0 }} />}
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 42, marginBottom: 20 }}>
          {phase.items.map(item => (
            <TodoItem key={item.id} item={item} checked={!!checks[item.id]} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function NexusTodo() {
  const [checks, setChecks] = useState(loadChecks);

  const toggle = useCallback((id) => {
    setChecks(prev => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecks(next);
      return next;
    });
  }, []);

  const allItems = useMemo(() => PHASES.flatMap(p => p.items), []);
  const totalDone = allItems.filter(i => checks[i.id]).length;
  const totalItems = allItems.length;
  const critLeft = allItems.filter(i => i.priority === 'CRITICAL' && !checks[i.id]).length;
  const highLeft = allItems.filter(i => i.priority === 'HIGH' && !checks[i.id]).length;

  const phaseSummary = PHASES.map(p => {
    const done = p.items.filter(i => checks[i.id]).length;
    return { phase: p.phase, done, total: p.items.length, complete: done === p.items.length };
  });
  const currentPhase = phaseSummary.find(p => !p.complete)?.phase || 'DONE';

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Target size={18} style={{ color: '#C0392B' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700,
            color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            V1.0 PRODUCTION ROADMAP
          </span>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
          fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", color: '#9A9488',
          marginBottom: 12,
        }}>
          <span>{totalDone}/{totalItems} complete</span>
          <span style={{ color: '#C0392B' }}>{critLeft} critical remaining</span>
          <span style={{ color: '#C8A84B' }}>{highLeft} high remaining</span>
          <span style={{ color: '#4A8FD0' }}>Current: {currentPhase}</span>
        </div>

        {/* Global progress */}
        <div style={{ height: 5, background: 'rgba(200,170,100,0.10)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${totalItems > 0 ? (totalDone / totalItems) * 100 : 0}%`,
            background: critLeft > 0 ? '#C0392B' : totalDone === totalItems ? '#4A8C5C' : '#C8A84B',
            transition: 'width 0.4s ease-out',
          }} />
        </div>

        {/* Phase summary chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {phaseSummary.map(p => (
            <span key={p.phase} style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              color: p.complete ? '#4A8C5C' : '#9A9488',
              background: p.complete ? 'rgba(74,140,92,0.12)' : 'rgba(200,170,100,0.06)',
              border: `0.5px solid ${p.complete ? 'rgba(74,140,92,0.3)' : 'rgba(200,170,100,0.12)'}`,
              borderRadius: 2, padding: '3px 8px', letterSpacing: '0.08em',
            }}>
              {p.phase}: {p.done}/{p.total}
            </span>
          ))}
        </div>
      </div>

      {/* PHASES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PHASES.map(phase => (
          <PhaseSection key={phase.phase} phase={phase} checks={checks} onToggle={toggle} />
        ))}
      </div>

      {/* FOOTER */}
      <div style={{
        color: '#5A5850', fontSize: 10, textAlign: 'center', padding: '24px 0 16px',
        fontFamily: "'Barlow', sans-serif",
      }}>
        Checkboxes persist locally in this browser · Progress is per-operator · Discord decoupling is Phase 1 prerequisite for all subsequent phases
      </div>
    </div>
  );
}