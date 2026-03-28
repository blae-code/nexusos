/**
 * GET /migrateQuality
 * One-time migration: convert quality_pct → quality_score for ScoutDeposit and Material records.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const results = { deposits_migrated: 0, materials_migrated: 0, deposit_records: [], material_records: [] };

  // Migrate ScoutDeposit
  const deposits = (await base44.asServiceRole.entities.ScoutDeposit.list('-reported_at', 500)) || [];
  for (const d of deposits) {
    if ((d.quality_score == null || d.quality_score === 0) && d.quality_pct != null && d.quality_pct > 0) {
      const newScore = Math.round(d.quality_pct * 10);
      await base44.asServiceRole.entities.ScoutDeposit.update(d.id, { quality_score: newScore });
      results.deposit_records.push({ id: d.id, material_name: d.material_name, old: d.quality_pct, new: newScore });
      results.deposits_migrated++;
    }
  }

  // Migrate Material
  const materials = (await base44.asServiceRole.entities.Material.list('-logged_at', 500)) || [];
  for (const m of materials) {
    if ((m.quality_score == null || m.quality_score === 0) && m.quality_pct != null && m.quality_pct > 0) {
      const newScore = Math.round(m.quality_pct * 10);
      await base44.asServiceRole.entities.Material.update(m.id, { quality_score: newScore });
      results.material_records.push({ id: m.id, material_name: m.material_name, old: m.quality_pct, new: newScore });
      results.materials_migrated++;
    }
  }

  return Response.json(results);
});