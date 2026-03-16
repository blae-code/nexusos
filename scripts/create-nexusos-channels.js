#!/usr/bin/env node
/**
 * create-nexusos-channels.js
 *
 * Creates the NexusOS Discord channels under a dedicated category.
 * Safe to re-run — skips channels/categories that already exist.
 *
 * Required env vars (set in .env or export before running):
 *   HERALD_BOT_TOKEN  — your Discord bot token
 *   REDSCAR_GUILD_ID  — the Redscar Nomads server (guild) ID
 *
 * Usage:
 *   node scripts/create-nexusos-channels.js
 *
 * After running, copy the printed channel IDs into your .env:
 *   NEXUSOS_OPS_CHANNEL_ID=...
 *   NEXUSOS_OCR_CHANNEL_ID=...
 *   NEXUSOS_INTEL_CHANNEL_ID=...
 *   NEXUSOS_LOG_CHANNEL_ID=...
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load .env if present ────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '.env');

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
  console.log('[setup] Loaded env from .env');
}

// ── Config ──────────────────────────────────────────────────────────────────
const TOKEN    = process.env.HERALD_BOT_TOKEN;
const GUILD_ID = process.env.REDSCAR_GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('ERROR: HERALD_BOT_TOKEN and REDSCAR_GUILD_ID must be set.');
  process.exit(1);
}

const DISCORD_API = 'https://discord.com/api/v10';
const HEADERS = {
  Authorization: `Bot ${TOKEN}`,
  'Content-Type': 'application/json',
};

const CATEGORY_NAME = 'NexusOS';

const CHANNELS_TO_CREATE = [
  { name: 'nexusos-ops',   topic: 'Op embeds, RSVP, phase updates and wrap-ups',    env: 'NEXUSOS_OPS_CHANNEL_ID' },
  { name: 'nexusos-ocr',   topic: 'Screenshot OCR submissions via Herald Bot',       env: 'NEXUSOS_OCR_CHANNEL_ID' },
  { name: 'nexusos-intel', topic: 'Scout deposit pings and intel reports',           env: 'NEXUSOS_INTEL_CHANNEL_ID' },
  { name: 'nexusos-log',   topic: 'System log: refinery ready, blueprint drops …',  env: 'NEXUSOS_LOG_CHANNEL_ID' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
async function discordGet(path) {
  const res = await fetch(`${DISCORD_API}${path}`, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function discordPost(path, body) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n[setup] Fetching existing channels for guild ${GUILD_ID} …`);
  const existing = await discordGet(`/guilds/${GUILD_ID}/channels`);

  // ── Find or create the NexusOS category ──
  let category = existing.find(
    (ch) => ch.type === 4 && ch.name.toLowerCase() === CATEGORY_NAME.toLowerCase(),
  );

  if (category) {
    console.log(`[setup] Category "${CATEGORY_NAME}" already exists (id: ${category.id})`);
  } else {
    console.log(`[setup] Creating category "${CATEGORY_NAME}" …`);
    category = await discordPost(`/guilds/${GUILD_ID}/channels`, {
      name: CATEGORY_NAME,
      type: 4,
    });
    console.log(`[setup] Created category (id: ${category.id})`);
  }

  // ── Find or create each text channel ──
  const results = {};

  for (const spec of CHANNELS_TO_CREATE) {
    const found = existing.find(
      (ch) => ch.type === 0 && ch.name === spec.name && ch.parent_id === category.id,
    );

    if (found) {
      console.log(`[setup] #${spec.name} already exists (id: ${found.id})`);
      results[spec.env] = found.id;
    } else {
      console.log(`[setup] Creating #${spec.name} …`);
      const ch = await discordPost(`/guilds/${GUILD_ID}/channels`, {
        name: spec.name,
        type: 0,
        topic: spec.topic,
        parent_id: category.id,
      });
      console.log(`[setup] Created #${spec.name} (id: ${ch.id})`);
      results[spec.env] = ch.id;
    }
  }

  // ── Print .env snippet ──
  console.log('\n──────────────────────────────────────────────');
  console.log('Add these to your .env file:\n');
  for (const [key, id] of Object.entries(results)) {
    console.log(`${key}=${id}`);
  }
  console.log('──────────────────────────────────────────────\n');
})().catch((err) => {
  console.error('[setup] Fatal:', err.message);
  process.exit(1);
});
