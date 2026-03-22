/**
 * startFabricationJob — validates material availability against a blueprint's recipe,
 * subtracts the required materials from the stockpile, and creates a FabricationJob.
 *
 * Payload: { blueprint_id, quantity (default 1), notes, fabricator_location }
 * Returns: { job, materials_consumed }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function norm(s) { return (s || '').toLowerCase().trim(); }

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { blueprint_id, quantity = 1, notes, fabricator_location } = body;

  if (!blueprint_id) {
    return Response.json({ error: 'blueprint_id is required' }, { status: 400 });
  }
  if (quantity < 1 || quantity > 50) {
    return Response.json({ error: 'quantity must be between 1 and 50' }, { status: 400 });
  }

  // 1. Fetch blueprint
  let bp = null;
  try {
    const blueprints = await base44.asServiceRole.entities.Blueprint.filter({ id: blueprint_id });
    bp = blueprints?.[0];
  } catch { /* invalid id */ }
  if (!bp) return Response.json({ error: 'Blueprint not found' }, { status: 404 });

  const recipe = bp.recipe_materials || [];
  if (recipe.length === 0) {
    return Response.json({ error: 'Blueprint has no recipe materials defined' }, { status: 400 });
  }

  // 2. Fetch all non-archived materials
  const allMaterials = await base44.asServiceRole.entities.Material.list('-quality_pct', 500);
  const activeMaterials = (allMaterials || []).filter(m => !m.is_archived);

  // 3. Validate material availability for the requested quantity
  const materialsToConsume = []; // { material, quantity_scu_needed, material_records: [{id, scu_to_take}] }

  for (const req of recipe) {
    const needed = (req.quantity_scu || 0) * quantity;
    const minQuality = req.min_quality || bp.min_material_quality || 0;
    const matching = activeMaterials
      .filter(m => norm(m.material_name) === norm(req.material) && (m.quality_pct || 0) >= minQuality)
      .sort((a, b) => (a.quality_pct || 0) - (b.quality_pct || 0)); // use lowest quality first

    let remaining = needed;
    const records = [];

    for (const m of matching) {
      if (remaining <= 0) break;
      const available = m.quantity_scu || 0;
      const take = Math.min(available, remaining);
      records.push({ id: m.id, scu_to_take: take, original_scu: available });
      remaining -= take;
    }

    if (remaining > 0.01) {
      return Response.json({
        error: `Insufficient ${req.material}: need ${needed.toFixed(1)} SCU (quality ≥${minQuality}%), have ${(needed - remaining).toFixed(1)} SCU`,
      }, { status: 409 });
    }

    materialsToConsume.push({
      material: req.material,
      quantity_scu_needed: needed,
      records,
    });
  }

  // 4. Subtract materials from stockpile
  const consumed = [];
  for (const entry of materialsToConsume) {
    const materialIds = [];
    for (const rec of entry.records) {
      const newScu = rec.original_scu - rec.scu_to_take;
      if (newScu <= 0.01) {
        // Delete material record if fully consumed
        await base44.asServiceRole.entities.Material.delete(rec.id);
      } else {
        await base44.asServiceRole.entities.Material.update(rec.id, { quantity_scu: newScu });
      }
      materialIds.push(rec.id);
    }
    consumed.push({
      material: entry.material,
      quantity_scu: entry.quantity_scu_needed,
      material_ids: materialIds,
    });
  }

  // 5. Calculate estimated completion time
  const craftTimePerUnit = bp.crafting_time_min || 30; // default 30 min if not set
  const totalCraftTime = craftTimePerUnit * quantity;
  const now = new Date();
  const estimatedCompletion = new Date(now.getTime() + totalCraftTime * 60000);

  // 6. Resolve callsign from NexusUser
  let callsign = 'Unknown';
  try {
    const users = await base44.asServiceRole.entities.NexusUser.filter({ discord_id: user.email });
    if (users?.[0]) callsign = users[0].callsign;
  } catch { /* fallback */ }

  // 7. Create fabrication job
  const job = await base44.asServiceRole.entities.FabricationJob.create({
    blueprint_id,
    blueprint_name: bp.item_name,
    category: bp.category,
    tier: bp.tier,
    quantity,
    output_per_craft: bp.output_quantity || 1,
    materials_consumed: consumed,
    crafting_time_min: totalCraftTime,
    started_at: now.toISOString(),
    estimated_completion: estimatedCompletion.toISOString(),
    fabricator_location: fabricator_location || bp.fabricator_location || '',
    started_by: user.email,
    started_by_callsign: callsign,
    status: 'ACTIVE',
    notes: notes || '',
  });

  return Response.json({ job, materials_consumed: consumed });
});