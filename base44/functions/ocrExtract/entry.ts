import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  buildMaterialRecord,
  buildRefineryOrderRecord,
} from '../_shared/nexusWriteValidation/entry.ts';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

/**
 * OCR Extract — Takes a screenshot URL from upload,
 * sends to Claude via InvokeLLM with vision, extracts structured data,
 * then creates the appropriate entity records.
 *
 * Handles: inventory screenshots → Material records
 *          mining scan → ScoutDeposit hint (user confirms)
 *          refinery order → RefineryOrder record
 *          transaction receipt → CofferLog record
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const session = await resolveIssuedKeySession(req);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user;

    const { file_url, source_type, callsign } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are an OCR extraction assistant for a Star Citizen org management tool.

Analyze this Star Citizen screenshot and extract structured data.

Determine the screenshot type:
1. INVENTORY — ship/hangar inventory showing commodities with quantities and quality
2. MINING_SCAN — mining deposit scan showing material, quality %, location
3. REFINERY_ORDER — refinery terminal showing order details, method, yield, cost, time
4. TRANSACTION — purchase/sale receipt showing commodity, quantity, price, station

Extract ALL visible data and return structured JSON matching the type.

For INVENTORY: extract each line item as { material_name, quantity_scu, quality_pct, material_type }
For MINING_SCAN: extract { material_name, quality_pct, system_name, location_detail, volume_estimate }
For REFINERY_ORDER: extract { material_name, quantity_scu, method, yield_pct, cost_aUEC, station, completes_at_hours }
For TRANSACTION: extract { entry_type (SALE/EXPENSE), amount_aUEC, commodity, quantity_scu, station }

Return null for any field you cannot read clearly.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          screenshot_type: { type: 'string', enum: ['INVENTORY', 'MINING_SCAN', 'REFINERY_ORDER', 'TRANSACTION', 'CRAFT_QUEUE', 'SHIP_STATUS'] },
          items: { type: 'array', items: { type: 'object' } },
          confidence: { type: 'number' },
          notes: { type: 'string' },
        },
      },
    });

    if (!extracted?.screenshot_type) {
      return Response.json({ success: false, error: 'Could not determine screenshot type' });
    }

    const resolvedCallsign = callsign || user.callsign || 'unknown';
    const resolvedUserId = user.id || null;
    const resolvedSourceType = source_type || 'OCR_UPLOAD';
    const now = new Date().toISOString();
    const created = [];

    if (extracted.screenshot_type === 'INVENTORY') {
      for (const item of extracted.items || []) {
        if (!item.material_name) continue;
        const record = await base44.asServiceRole.entities.Material.create(buildMaterialRecord({
          ...item,
          source_type: resolvedSourceType,
          screenshot_ref: file_url,
          logged_at: now,
        }, { ...user, id: resolvedUserId, callsign: resolvedCallsign }));
        created.push({ entity: 'Material', id: record.id });
      }
    }

    if (extracted.screenshot_type === 'REFINERY_ORDER') {
      const item = extracted.items?.[0] || {};
      const completes = item.completes_at_hours
        ? new Date(Date.now() + item.completes_at_hours * 3600000).toISOString()
        : null;

      const record = await base44.asServiceRole.entities.RefineryOrder.create(buildRefineryOrderRecord({
        ...item,
        started_at: now,
        completes_at: completes,
        status: 'ACTIVE',
        source_type: resolvedSourceType,
      }, { ...user, id: resolvedUserId, callsign: resolvedCallsign }));
      created.push({ entity: 'RefineryOrder', id: record.id });
    }

    if (extracted.screenshot_type === 'TRANSACTION') {
      const item = extracted.items?.[0] || {};
      const record = await base44.asServiceRole.entities.CofferLog.create({
        entry_type: item.entry_type || 'SALE',
        amount_aUEC: item.amount_aUEC || 0,
        commodity: item.commodity || null,
        quantity_scu: item.quantity_scu || null,
        station: item.station || null,
        logged_by_user_id: resolvedUserId,
        logged_by_callsign: resolvedCallsign,
        source_type: resolvedSourceType,
        screenshot_ref: file_url,
        logged_at: now,
      });
      created.push({ entity: 'CofferLog', id: record.id });
    }

    if (extracted.screenshot_type === 'MINING_SCAN') {
      return Response.json({
        success: true,
        screenshot_type: 'MINING_SCAN',
        pending_confirmation: extracted.items?.[0] || {},
        message: 'Mining scan detected — confirm deposit details before logging',
      });
    }

    if (extracted.screenshot_type === 'CRAFT_QUEUE') {
      return Response.json({
        success: true,
        screenshot_type: 'CRAFT_QUEUE',
        pending_confirmation: extracted.items || [],
        message: 'Craft queue detected — confirm before updating queue',
      });
    }

    if (extracted.screenshot_type === 'SHIP_STATUS') {
      return Response.json({
        success: true,
        screenshot_type: 'SHIP_STATUS',
        pending_confirmation: extracted.items?.[0] || {},
        message: 'Ship component state detected — confirm before updating fleet build',
      });
    }

    return Response.json({
      success: true,
      screenshot_type: extracted.screenshot_type,
      records_created: created.length,
      created_records: created,
      confidence: extracted.confidence,
      notes: extracted.notes,
    });
  } catch (error) {
    console.error('ocrExtract error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
