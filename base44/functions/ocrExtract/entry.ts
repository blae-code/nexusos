import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * OCR Extract — Vision-AI screenshot extraction with auto-routing.
 * 
 * Handles:
 *   INVENTORY / CARGO_MANIFEST → Material records
 *   MINING_SCAN               → ScoutDeposit (pending confirmation)
 *   REFINERY_ORDER            → RefineryOrder record
 *   TRANSACTION               → CofferLog + wallet + inventory adjustments
 *   WALLET                    → NexusUser.aUEC_balance sync
 *   CRAFT_QUEUE / SHIP_STATUS → Pending confirmation
 */

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    acc[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
    return acc;
  }, {});
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function signValue(value, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return btoa(Array.from(new Uint8Array(signature), (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function resolveSession(req, base44) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  const cookies = parseCookies(req);
  const token = cookies['nexus_member_session'];
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await signValue(body, secret);
  if (sig !== expected) return null;
  const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  if (!decoded.exp || decoded.exp < Date.now()) return null;
  if (!decoded.user_id) return null;
  const users = await base44.asServiceRole.entities.NexusUser.filter({ id: decoded.user_id });
  const user = users?.[0];
  if (!user || user.key_revoked) return null;
  return user;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await resolveSession(req, base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, source_type, callsign } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are an OCR extraction assistant for a Star Citizen org management tool.

Analyze this Star Citizen screenshot and extract ALL visible structured data.
Determine the screenshot type:

1. INVENTORY — commodities with quantities, quality. Extract: { material_name, quantity_scu, quality_score (1-1000), material_type (CMR/CMP/CMS/ORE/CM_REFINED/OTHER), location }
2. MINING_SCAN — mining scan results. Extract: { material_name, quality_pct (0-100), system_name, location_detail, volume_estimate (SMALL/MEDIUM/LARGE/MASSIVE) }
3. REFINERY_ORDER — refinery terminal. Extract: { material_name, quantity_scu, method, yield_pct, cost_aUEC, station, completes_at_hours, input_subtype }
4. TRANSACTION — trade terminal receipts. Extract EACH line: { transaction_type (BUY/SELL), commodity_name, quantity_scu, price_per_unit, total_aUEC, station }
5. WALLET — mobiGlas balance. Extract: { balance_aUEC, recent_transactions: [{ description, amount, type (CREDIT/DEBIT) }] }
6. CRAFT_QUEUE — fabricator queue. Extract: { item_name, status, materials_used }
7. SHIP_STATUS — ship loadout. Extract: { ship_name, components: [{ name, type, size, health_pct }] }
8. CARGO_MANIFEST — cargo grid. Extract: { commodity_name, quantity_scu, quality_score, destination }

Be precise. Use null for unclear fields. If quality is 0-100%, multiply by 10 for 1-1000 scale.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          screenshot_type: { type: 'string', enum: ['INVENTORY', 'MINING_SCAN', 'REFINERY_ORDER', 'TRANSACTION', 'WALLET', 'CRAFT_QUEUE', 'SHIP_STATUS', 'CARGO_MANIFEST'] },
          items: { type: 'array', items: { type: 'object' } },
          confidence: { type: 'number' },
          notes: { type: 'string' },
        },
      },
    });

    if (!extracted?.screenshot_type) {
      return Response.json({ success: false, error: 'Could not determine screenshot type' });
    }

    const cs = callsign || user.callsign || 'unknown';
    const uid = user.id || null;
    const src = source_type || 'OCR_UPLOAD';
    const now = new Date().toISOString();
    const created = [];
    const sideEffects = [];

    // ─── INVENTORY / CARGO ────────────────────────────────────────────
    if (extracted.screenshot_type === 'INVENTORY' || extracted.screenshot_type === 'CARGO_MANIFEST') {
      for (const item of extracted.items || []) {
        const name = item.material_name || item.commodity_name;
        if (!name) continue;
        const record = await base44.asServiceRole.entities.Material.create({
          material_name: name,
          material_type: item.material_type || 'OTHER',
          quantity_scu: item.quantity_scu || 0,
          quality_score: item.quality_score || null,
          location: item.location || item.destination || null,
          container: item.container || null,
          logged_by: uid,
          logged_by_callsign: cs,
          source_type: src,
          screenshot_ref: file_url,
          logged_at: now,
        });
        created.push({ entity: 'Material', id: record.id, name });
      }
      sideEffects.push({ type: 'INVENTORY_UPDATED', count: created.length });
    }

    // ─── REFINERY_ORDER ───────────────────────────────────────────────
    if (extracted.screenshot_type === 'REFINERY_ORDER') {
      const item = extracted.items?.[0] || {};
      const completes = item.completes_at_hours
        ? new Date(Date.now() + item.completes_at_hours * 3600000).toISOString()
        : null;
      const record = await base44.asServiceRole.entities.RefineryOrder.create({
        material_name: item.material_name || 'Unknown',
        quantity_scu: item.quantity_scu || 0,
        method: item.method || null,
        input_subtype: item.input_subtype || null,
        yield_pct: item.yield_pct || null,
        cost_aUEC: item.cost_aUEC || null,
        station: item.station || null,
        submitted_by: uid,
        submitted_by_callsign: cs,
        started_at: now,
        completes_at: completes,
        status: 'ACTIVE',
        source_type: src,
      });
      created.push({ entity: 'RefineryOrder', id: record.id });
    }

    // ─── TRANSACTION — coffer + wallet + inventory ────────────────────
    if (extracted.screenshot_type === 'TRANSACTION') {
      let walletDelta = 0;
      const inventoryChanges = [];

      for (const item of extracted.items || []) {
        const isSell = (item.transaction_type || '').toUpperCase() === 'SELL';
        const isBuy = (item.transaction_type || '').toUpperCase() === 'BUY';
        const total = item.total_aUEC || 0;
        const commodity = item.commodity_name || item.commodity || null;
        const qty = item.quantity_scu || 0;

        // Log to CofferLog
        const cofferRec = await base44.asServiceRole.entities.CofferLog.create({
          entry_type: isSell ? 'SALE' : 'EXPENSE',
          amount_aUEC: Math.abs(total),
          commodity,
          quantity_scu: qty || null,
          station: item.station || null,
          logged_by: uid,
          logged_by_callsign: cs,
          source_type: src,
          screenshot_ref: file_url,
          logged_at: now,
        });
        created.push({ entity: 'CofferLog', id: cofferRec.id, name: commodity });

        // Wallet delta
        if (isSell) walletDelta += Math.abs(total);
        else if (isBuy) walletDelta -= Math.abs(total);

        // Inventory adjustment
        if (commodity && qty > 0) {
          if (isSell) {
            inventoryChanges.push({ action: 'SOLD', name: commodity, quantity: qty, aUEC: total });
            // Archive matching material records
            const mats = await base44.asServiceRole.entities.Material.filter({ material_name: commodity, is_archived: false }, '-logged_at', 10);
            let rem = qty;
            for (const mat of mats || []) {
              if (rem <= 0) break;
              if ((mat.quantity_scu || 0) <= rem) {
                await base44.asServiceRole.entities.Material.update(mat.id, { is_archived: true });
                rem -= (mat.quantity_scu || 0);
              } else {
                await base44.asServiceRole.entities.Material.update(mat.id, { quantity_scu: (mat.quantity_scu || 0) - rem });
                rem = 0;
              }
            }
          } else if (isBuy) {
            const matRec = await base44.asServiceRole.entities.Material.create({
              material_name: commodity,
              material_type: item.material_type || 'OTHER',
              quantity_scu: qty,
              quality_score: item.quality_score || null,
              location: item.station || null,
              logged_by: uid,
              logged_by_callsign: cs,
              source_type: src,
              screenshot_ref: file_url,
              logged_at: now,
            });
            created.push({ entity: 'Material', id: matRec.id, name: commodity });
            inventoryChanges.push({ action: 'PURCHASED', name: commodity, quantity: qty, aUEC: total });
          }
        }
      }

      // Update wallet
      if (walletDelta !== 0) {
        const users = await base44.asServiceRole.entities.NexusUser.filter({ callsign: cs });
        const nu = users?.[0];
        if (nu) {
          const prev = nu.aUEC_balance || 0;
          const next = Math.max(0, prev + walletDelta);
          await base44.asServiceRole.entities.NexusUser.update(nu.id, { aUEC_balance: next });
          sideEffects.push({ type: 'WALLET_UPDATED', previous: prev, delta: walletDelta, new_balance: next });
        }
      }
      if (inventoryChanges.length > 0) {
        sideEffects.push({ type: 'INVENTORY_ADJUSTED', changes: inventoryChanges });
      }
    }

    // ─── WALLET — direct balance sync ─────────────────────────────────
    if (extracted.screenshot_type === 'WALLET') {
      const item = extracted.items?.[0] || {};
      const balance = item.balance_aUEC;
      if (balance != null) {
        const users = await base44.asServiceRole.entities.NexusUser.filter({ callsign: cs });
        const nu = users?.[0];
        if (nu) {
          const prev = nu.aUEC_balance || 0;
          await base44.asServiceRole.entities.NexusUser.update(nu.id, { aUEC_balance: balance });
          sideEffects.push({ type: 'WALLET_SYNCED', previous: prev, new_balance: balance, delta: balance - prev });
        }
      }
      for (const txn of item.recent_transactions || []) {
        if (!txn.amount) continue;
        await base44.asServiceRole.entities.CofferLog.create({
          entry_type: txn.type === 'CREDIT' ? 'SALE' : 'EXPENSE',
          amount_aUEC: Math.abs(txn.amount),
          description: txn.description || null,
          logged_by: uid,
          logged_by_callsign: cs,
          source_type: src,
          screenshot_ref: file_url,
          logged_at: now,
        });
        created.push({ entity: 'CofferLog', name: txn.description });
      }
    }

    // ─── Pending confirmation types ───────────────────────────────────
    if (['MINING_SCAN', 'CRAFT_QUEUE', 'SHIP_STATUS'].includes(extracted.screenshot_type)) {
      return Response.json({
        success: true,
        screenshot_type: extracted.screenshot_type,
        pending_confirmation: extracted.screenshot_type === 'CRAFT_QUEUE' ? (extracted.items || []) : (extracted.items?.[0] || {}),
        confidence: extracted.confidence,
        notes: extracted.notes,
        side_effects: sideEffects,
        message: `${extracted.screenshot_type} detected — confirm before logging`,
      });
    }

    return Response.json({
      success: true,
      screenshot_type: extracted.screenshot_type,
      records_created: created.length,
      created_records: created,
      confidence: extracted.confidence,
      notes: extracted.notes,
      side_effects: sideEffects,
    });
  } catch (error) {
    console.error('ocrExtract error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});