/**
 * opResourceReport — Scans active deposits in an op's system, calculates total
 * potential yield based on quality scores & market prices, and generates an
 * automated post-op profit split report.
 *
 * Payload: { op_id }
 * Returns: { report }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Volume estimate → approximate SCU multiplier
const VOLUME_SCU = { SMALL: 8, MEDIUM: 24, LARGE: 64, MASSIVE: 150 };

// Tier rarity multiplier (affects price premium)
const TIER_MULT = { COMMON: 1.0, UNCOMMON: 1.3, RARE: 1.8, EPIC: 2.5, LEGENDARY: 4.0 };

// Refinery yield factor by quality band
function yieldFactor(qualityScore) {
  const q = qualityScore || 500;
  if (q >= 800) return 0.92;
  if (q >= 600) return 0.78;
  if (q >= 400) return 0.62;
  return 0.45;
}

function qualityLabel(q) {
  if (q >= 800) return 'T2-ELIGIBLE';
  if (q >= 600) return 'HIGH';
  if (q >= 400) return 'MEDIUM';
  return 'LOW';
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { op_id } = body;
  if (!op_id) return Response.json({ error: 'op_id required' }, { status: 400 });

  // ── Load op ──
  const ops = await base44.asServiceRole.entities.Op.filter({ id: op_id });
  const op = Array.isArray(ops) && ops.length > 0 ? ops[0] : null;
  if (!op) return Response.json({ error: 'op_not_found' }, { status: 404 });

  const systemName = (op.system || op.system_name || '').toUpperCase().trim();

  // ── Load deposits for this system (non-stale) ──
  const allDeposits = await base44.asServiceRole.entities.ScoutDeposit.list('-reported_at', 500);
  const systemDeposits = (allDeposits || []).filter(d =>
    !d.is_stale &&
    (d.system_name || '').toUpperCase().trim() === systemName
  );

  // ── Load materials logged during this op ──
  const allMaterials = await base44.asServiceRole.entities.Material.list('-logged_at', 500);
  const opMaterials = (allMaterials || []).filter(m =>
    m.session_id === op_id && !m.is_archived
  );

  // ── Load latest price snapshots for valuation ──
  const priceSnaps = await base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 200);
  const priceMap = {};
  for (const snap of (priceSnaps || [])) {
    const name = (snap.commodity_name || '').toLowerCase().trim();
    if (!priceMap[name] || new Date(snap.snapped_at) > new Date(priceMap[name].snapped_at)) {
      priceMap[name] = snap;
    }
  }

  // ── Load RSVPs for crew manifest ──
  const allRsvps = await base44.asServiceRole.entities.OpRsvp.list('-created_date', 200);
  const confirmedCrew = (allRsvps || []).filter(r =>
    r.op_id === op_id && r.status === 'CONFIRMED'
  );

  // ── Analyze deposits ──
  const depositAnalysis = systemDeposits.map(d => {
    const matName = (d.material_name || 'Unknown').toLowerCase().trim();
    const price = priceMap[matName];
    const sellPrice = price?.curr_sell_avg || price?.best_sell_price || 0;
    const volumeScu = VOLUME_SCU[d.volume_estimate] || 16;
    const quality = d.quality_score || 500;
    const tierMult = TIER_MULT[d.mineral_tier] || 1.0;
    const yieldPct = yieldFactor(quality);
    const refinedScu = volumeScu * yieldPct;
    const estimatedValue = Math.round(refinedScu * sellPrice * tierMult);

    return {
      material: d.material_name,
      location: d.location_detail || '—',
      quality_score: quality,
      quality_label: qualityLabel(quality),
      tier: d.mineral_tier || 'COMMON',
      volume_estimate: d.volume_estimate || 'MEDIUM',
      volume_scu: volumeScu,
      yield_pct: Math.round(yieldPct * 100),
      refined_scu: Math.round(refinedScu * 10) / 10,
      sell_price_per_scu: sellPrice,
      best_sell_station: price?.best_sell_station || null,
      tier_multiplier: tierMult,
      estimated_value_aUEC: estimatedValue,
      deposit_id: d.id,
      reported_by: d.reported_by_callsign || 'Unknown',
      risk: d.risk_level || 'UNKNOWN',
    };
  });

  // Sort by estimated value descending
  depositAnalysis.sort((a, b) => b.estimated_value_aUEC - a.estimated_value_aUEC);

  // ── Analyze harvested materials ──
  const harvestedAnalysis = opMaterials.map(m => {
    const matName = (m.material_name || '').toLowerCase().trim();
    const price = priceMap[matName];
    const sellPrice = price?.curr_sell_avg || price?.best_sell_price || 0;
    const actualValue = Math.round((m.quantity_scu || 0) * sellPrice);
    return {
      material: m.material_name,
      type: m.material_type,
      quantity_scu: m.quantity_scu || 0,
      quality_score: m.quality_score || 0,
      sell_price_per_scu: sellPrice,
      estimated_value_aUEC: actualValue,
      logged_by: m.logged_by_callsign || 'Unknown',
    };
  });

  // ── Totals ──
  const totalPotentialYieldScu = depositAnalysis.reduce((s, d) => s + d.refined_scu, 0);
  const totalPotentialValue = depositAnalysis.reduce((s, d) => s + d.estimated_value_aUEC, 0);
  const totalHarvestedScu = harvestedAnalysis.reduce((s, m) => s + m.quantity_scu, 0);
  const totalHarvestedValue = harvestedAnalysis.reduce((s, m) => s + m.estimated_value_aUEC, 0);
  const t2EligibleCount = depositAnalysis.filter(d => d.quality_score >= 800).length;

  // ── Profit split projection ──
  const payoutConfig = op.payout_config || {};
  const orgCutPct = payoutConfig.org_cut_pct || 0;
  const includeTax = payoutConfig.include_transfer_tax !== false;
  const taxRate = 0.005;
  const crewCount = confirmedCrew.length || 1;

  const grossRevenue = totalHarvestedValue > 0 ? totalHarvestedValue : totalPotentialValue;
  const orgCut = Math.round(grossRevenue * (orgCutPct / 100));
  const netPool = grossRevenue - orgCut;
  const perMemberGross = Math.round(netPool / crewCount);
  const taxPerMember = includeTax ? Math.round(perMemberGross * taxRate) : 0;
  const perMemberNet = perMemberGross - taxPerMember;

  const crewPayouts = confirmedCrew.map(c => ({
    callsign: c.callsign || c.member_callsign || 'Unknown',
    role: c.role || '—',
    gross: perMemberGross,
    tax: taxPerMember,
    net: perMemberNet,
  }));

  // ── Build report ──
  const report = {
    op_id: op.id,
    op_name: op.name || 'Unnamed Op',
    system: systemName,
    generated_at: new Date().toISOString(),
    generated_by: user.callsign || user.full_name || 'System',

    // Deposit intel
    deposits: {
      total_count: depositAnalysis.length,
      t2_eligible_count: t2EligibleCount,
      total_potential_scu: Math.round(totalPotentialYieldScu * 10) / 10,
      total_potential_value_aUEC: totalPotentialValue,
      items: depositAnalysis,
    },

    // Harvested materials
    harvested: {
      total_scu: Math.round(totalHarvestedScu * 10) / 10,
      total_value_aUEC: totalHarvestedValue,
      items: harvestedAnalysis,
    },

    // Profit split
    profit_split: {
      basis: totalHarvestedValue > 0 ? 'HARVESTED' : 'PROJECTED',
      gross_revenue: grossRevenue,
      org_cut_pct: orgCutPct,
      org_cut_aUEC: orgCut,
      net_pool: netPool,
      crew_count: crewCount,
      include_tax: includeTax,
      tax_rate_pct: includeTax ? 0.5 : 0,
      per_member_gross: perMemberGross,
      per_member_tax: taxPerMember,
      per_member_net: perMemberNet,
      crew: crewPayouts,
    },

    // Summary stats
    summary: {
      efficiency_pct: totalPotentialValue > 0
        ? Math.round((totalHarvestedValue / totalPotentialValue) * 100)
        : 0,
      avg_quality: depositAnalysis.length > 0
        ? Math.round(depositAnalysis.reduce((s, d) => s + d.quality_score, 0) / depositAnalysis.length)
        : 0,
      top_material: depositAnalysis[0]?.material || null,
      top_material_value: depositAnalysis[0]?.estimated_value_aUEC || 0,
    },
  };

  // ── Persist report to op ──
  const existingLog = Array.isArray(op.session_log) ? op.session_log : [];
  const logEntry = {
    type: 'RESOURCE_REPORT',
    timestamp: report.generated_at,
    by: report.generated_by,
    data: {
      deposit_count: report.deposits.total_count,
      potential_value: report.deposits.total_potential_value_aUEC,
      harvested_value: report.harvested.total_value_aUEC,
      per_member_net: report.profit_split.per_member_net,
    },
  };
  await base44.asServiceRole.entities.Op.update(op.id, {
    session_log: [...existingLog, logEntry],
  });

  return Response.json({ report });
});