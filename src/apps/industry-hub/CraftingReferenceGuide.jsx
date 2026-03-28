import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Search, Wrench, XCircle } from 'lucide-react';
import { qualityPercentFromRecord } from '@/core/data/quality';
import OperationalReferenceStrip from '@/core/design/OperationalReferenceStrip';

const TIER_OPTIONS = ['ALL', 'T2', 'T1'];
const OWNERSHIP_OPTIONS = ['ALL', 'OWNED', 'UNOWNED', 'PRIORITY'];
const GUIDE_MODE_OPTIONS = ['live', 'minimum', 'custom'];

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function formatNumber(value) {
  const numeric = Number(value) || 0;
  return numeric >= 100 ? numeric.toFixed(0) : numeric.toFixed(1);
}

function recipeMaterialName(item) {
  return String(item?.material_name || item?.material || '').trim();
}

function recipeQuantity(item) {
  return Number(item?.quantity_scu || item?.quantity || 0) || 0;
}

function recipeMinQuality(item) {
  return Number(item?.min_quality || item?.minimum_quality || 0) || 0;
}

function blueprintOwned(blueprint) {
  return Boolean(blueprint?.owned_by_user_id || blueprint?.owned_by || blueprint?.owned_by_callsign);
}

function inventoryLookup(materials) {
  const lookup = new Map();

  (Array.isArray(materials) ? materials : [])
    .filter((item) => !item?.is_archived)
    .forEach((item) => {
      const name = normalizeText(item?.material_name);
      if (!name) return;

      const existing = lookup.get(name) || {
        name: String(item?.material_name || '').trim(),
        totalScu: 0,
        bestQuality: 0,
        avgQuality: 0,
        samples: 0,
      };

      const quality = qualityPercentFromRecord(item);
      existing.totalScu += Number(item?.quantity_scu || 0) || 0;
      existing.bestQuality = Math.max(existing.bestQuality, quality);
      existing.avgQuality += quality;
      existing.samples += 1;
      lookup.set(name, existing);
    });

  lookup.forEach((value, key) => {
    lookup.set(key, {
      ...value,
      avgQuality: value.samples > 0 ? value.avgQuality / value.samples : 0,
    });
  });

  return lookup;
}

function createPrototypeDefaults(blueprint, inventory, quantity) {
  const recipe = Array.isArray(blueprint?.recipe_materials) ? blueprint.recipe_materials : [];

  return Object.fromEntries(recipe.map((item, index) => {
    const name = recipeMaterialName(item);
    const key = `${name.toLowerCase()}::${index}`;
    const live = inventory.get(normalizeText(name));
    const requiredScu = recipeQuantity(item) * quantity;
    const minQuality = recipeMinQuality(item);

    return [key, {
      quantity_scu: live ? Number(live.totalScu.toFixed(2)) : requiredScu,
      quality_pct: live ? Math.round(live.bestQuality || live.avgQuality || minQuality || 0) : (minQuality || 80),
    }];
  }));
}

function createMinimumPrototype(blueprint, quantity) {
  const recipe = Array.isArray(blueprint?.recipe_materials) ? blueprint.recipe_materials : [];

  return Object.fromEntries(recipe.map((item, index) => {
    const name = recipeMaterialName(item);
    const key = `${name.toLowerCase()}::${index}`;
    return [key, {
      quantity_scu: Number((recipeQuantity(item) * quantity).toFixed(2)),
      quality_pct: recipeMinQuality(item) || 80,
    }];
  }));
}

function SummaryCard({ label, value, detail, color = 'var(--t0)' }) {
  return (
    <div className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 96, padding: '16px' }}>
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color, fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 999,
        background: ok ? 'rgba(74,232,48,0.14)' : 'rgba(192,57,43,0.14)',
        color: ok ? 'var(--live)' : 'var(--danger)',
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

function BlueprintListItem({ blueprint, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(blueprint.id)}
      className="nexus-card-2"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        textAlign: 'left',
        cursor: 'pointer',
        borderColor: active ? 'rgba(192,57,43,0.38)' : 'var(--b1)',
        background: active ? 'rgba(192,57,43,0.08)' : 'var(--bg2)',
        padding: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {blueprint.item_name || 'Unnamed blueprint'}
        </div>
        <span style={{ color: blueprint.tier === 'T2' ? 'var(--warn)' : 'var(--t2)', fontSize: 9, letterSpacing: '0.06em' }}>
          {blueprint.tier || 'T1'}
        </span>
      </div>
      <div style={{ color: 'var(--t3)', fontSize: 9, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span>{blueprint.category || 'UNCATEGORIZED'}</span>
        <span>{blueprintOwned(blueprint) ? 'OWNED' : 'UNOWNED'}</span>
        {blueprint.is_priority ? <span style={{ color: 'var(--acc)' }}>PRIORITY</span> : null}
      </div>
      <div style={{ color: 'var(--t2)', fontSize: 9, lineHeight: 1.5, minHeight: 28 }}>
        {(blueprint.recipe_materials || []).slice(0, 3).map((item) => recipeMaterialName(item)).filter(Boolean).join(', ') || 'No recipe recorded'}
      </div>
    </button>
  );
}

export default function CraftingReferenceGuide({ blueprints = [], materials = [] }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prototypeValues, setPrototypeValues] = useState({});

  const inventory = useMemo(() => inventoryLookup(materials), [materials]);

  const categories = useMemo(() => {
    return ['ALL', ...new Set(
      blueprints
        .map((blueprint) => String(blueprint?.category || '').trim())
        .filter(Boolean),
    )];
  }, [blueprints]);

  const guideSearch = searchParams.get('guide_q') || '';
  const tierFilter = TIER_OPTIONS.includes(searchParams.get('guide_tier')) ? searchParams.get('guide_tier') : 'ALL';
  const rawCategoryFilter = searchParams.get('guide_category') || 'ALL';
  const categoryFilter = categories.includes(rawCategoryFilter) ? rawCategoryFilter : 'ALL';
  const ownershipFilter = OWNERSHIP_OPTIONS.includes(searchParams.get('guide_ownership')) ? searchParams.get('guide_ownership') : 'ALL';
  const quantity = Math.max(1, Math.min(50, Number(searchParams.get('guide_qty')) || 1));
  const selectedBlueprintId = searchParams.get('guide_bp') || '';
  const comparisonMode = GUIDE_MODE_OPTIONS.includes(searchParams.get('guide_mode')) ? searchParams.get('guide_mode') : 'live';

  const setGuideParams = useCallback((updates) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === false || value === 'ALL' || (key === 'guide_qty' && Number(value) === 1) || (key === 'guide_mode' && value === 'live')) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const filteredBlueprints = useMemo(() => {
    const query = guideSearch.trim().toLowerCase();

    return blueprints.filter((blueprint) => {
      if (tierFilter !== 'ALL' && String(blueprint?.tier || 'T1').toUpperCase() !== tierFilter) {
        return false;
      }

      if (categoryFilter !== 'ALL' && String(blueprint?.category || '').trim() !== categoryFilter) {
        return false;
      }

      if (ownershipFilter === 'OWNED' && !blueprintOwned(blueprint)) {
        return false;
      }

      if (ownershipFilter === 'UNOWNED' && blueprintOwned(blueprint)) {
        return false;
      }

      if (ownershipFilter === 'PRIORITY' && !blueprint?.is_priority) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        blueprint?.item_name,
        blueprint?.category,
        blueprint?.owned_by_callsign,
        ...(Array.isArray(blueprint?.recipe_materials) ? blueprint.recipe_materials.flatMap((item) => [item?.material_name, item?.material]) : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    }).sort((left, right) => {
      const leftFocused = left.id === selectedBlueprintId ? -1 : 0;
      const rightFocused = right.id === selectedBlueprintId ? -1 : 0;
      if (leftFocused !== rightFocused) {
        return leftFocused - rightFocused;
      }

      if (String(left?.tier || 'T1') !== String(right?.tier || 'T1')) {
        return String(left?.tier || 'T1') === 'T2' ? -1 : 1;
      }

      return String(left?.item_name || '').localeCompare(String(right?.item_name || ''));
    });
  }, [blueprints, categoryFilter, guideSearch, ownershipFilter, selectedBlueprintId, tierFilter]);

  useEffect(() => {
    if (!filteredBlueprints.length) {
      if (selectedBlueprintId) {
        setGuideParams({ guide_bp: null });
      }
      return;
    }

    if (!filteredBlueprints.some((blueprint) => blueprint.id === selectedBlueprintId)) {
      setGuideParams({ guide_bp: filteredBlueprints[0].id });
    }
  }, [filteredBlueprints, selectedBlueprintId, setGuideParams]);

  const selectedBlueprint = filteredBlueprints.find((blueprint) => blueprint.id === selectedBlueprintId) || null;

  useEffect(() => {
    if (!selectedBlueprint) {
      setPrototypeValues({});
      return;
    }

    if (comparisonMode === 'minimum') {
      setPrototypeValues(createMinimumPrototype(selectedBlueprint, quantity));
      return;
    }

    const liveDefaults = createPrototypeDefaults(selectedBlueprint, inventory, quantity);

    if (comparisonMode === 'live') {
      setPrototypeValues(liveDefaults);
      return;
    }

    setPrototypeValues((current) => {
      const merged = { ...liveDefaults, ...current };

      Object.keys(merged).forEach((key) => {
        if (!liveDefaults[key]) {
          delete merged[key];
        }
      });

      return merged;
    });
  }, [comparisonMode, inventory, quantity, selectedBlueprint]);

  const recipeRows = useMemo(() => {
    if (!selectedBlueprint) {
      return [];
    }

    return (Array.isArray(selectedBlueprint.recipe_materials) ? selectedBlueprint.recipe_materials : []).map((item, index) => {
      const materialName = recipeMaterialName(item);
      const key = `${materialName.toLowerCase()}::${index}`;
      const live = inventory.get(normalizeText(materialName)) || { totalScu: 0, bestQuality: 0, avgQuality: 0 };
      const requiredScu = recipeQuantity(item) * quantity;
      const minQuality = recipeMinQuality(item);
      const prototype = prototypeValues[key] || createPrototypeDefaults(selectedBlueprint, inventory, quantity)[key] || { quantity_scu: requiredScu, quality_pct: minQuality || 80 };
      const prototypeScu = Number(prototype.quantity_scu || 0) || 0;
      const prototypeQuality = Number(prototype.quality_pct || 0) || 0;
      const liveQtyOk = live.totalScu >= requiredScu - 0.01;
      const liveQualityOk = minQuality === 0 || live.bestQuality >= minQuality;
      const prototypeQtyOk = prototypeScu >= requiredScu - 0.01;
      const prototypeQualityOk = minQuality === 0 || prototypeQuality >= minQuality;

      return {
        key,
        materialName,
        requiredScu,
        minQuality,
        liveScu: live.totalScu,
        liveQuality: live.bestQuality || live.avgQuality || 0,
        liveQtyOk,
        liveQualityOk,
        prototypeScu,
        prototypeQuality,
        prototypeQtyOk,
        prototypeQualityOk,
      };
    });
  }, [inventory, prototypeValues, quantity, selectedBlueprint]);

  const summary = useMemo(() => {
    const total = recipeRows.length;
    const liveReady = recipeRows.filter((row) => row.liveQtyOk && row.liveQualityOk).length;
    const prototypeReady = recipeRows.filter((row) => row.prototypeQtyOk && row.prototypeQualityOk).length;
    const prototypeShort = recipeRows.filter((row) => !row.prototypeQtyOk || !row.prototypeQualityOk).length;
    const qualitySensitive = recipeRows.filter((row) => row.minQuality > 0).length;

    return {
      total,
      liveReady,
      prototypeReady,
      prototypeShort,
      qualitySensitive,
      livePass: total > 0 && liveReady === total,
      prototypePass: total > 0 && prototypeReady === total,
    };
  }, [recipeRows]);

  const setPrototypeField = (rowKey, field, value) => {
    if (comparisonMode !== 'custom') {
      setGuideParams({ guide_mode: 'custom' });
    }

    setPrototypeValues((current) => ({
      ...current,
      [rowKey]: {
        ...(current[rowKey] || {}),
        [field]: value,
      },
    }));
  };

  const openBlueprintRegistry = () => {
    if (!selectedBlueprint) return;
    navigate(`/app/industry?tab=blueprints&blueprint=${encodeURIComponent(selectedBlueprint.id)}`);
  };

  const openProduction = () => {
    if (!selectedBlueprint) return;
    navigate(`/app/industry?tab=production&blueprint=${encodeURIComponent(selectedBlueprint.id)}&quantity=${quantity}`);
  };

  const openCraftQueue = () => {
    navigate('/app/industry?tab=craft');
  };

  const guideActions = selectedBlueprint ? [
    { label: 'Open Blueprint Registry', onClick: openBlueprintRegistry, tone: 'info' },
    { label: 'Launch Fabrication', onClick: openProduction, tone: 'live', disabled: !summary.prototypePass || !selectedBlueprint.recipe_materials?.length },
    { label: 'Review Craft Queue', onClick: openCraftQueue, tone: 'neutral' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '14px 16px', gap: 14 }}>
      <OperationalReferenceStrip
        sectionLabel="CRAFTING GUIDE"
        title="Searchable Blueprint Reference And Prototype Lab"
        description="Search blueprint recipes by item, material, tier, or ownership state, compare them against live org stock, and turn a prototype straight into a fabrication handoff. Prototype inputs are local planning values only and never mutate shared inventory."
        statusPills={[
          { label: summary.livePass ? 'live stock ready' : 'live stock partial', tone: summary.livePass ? 'live' : 'warn' },
          { label: comparisonMode === 'minimum' ? 'minimum mode' : comparisonMode === 'custom' ? 'custom mode' : 'live-stock mode', tone: comparisonMode === 'custom' ? 'info' : 'neutral' },
        ]}
        notes={[
          { label: 'When To Use', value: 'Reference + Prototype', detail: 'Use this before queueing fabrication, moving stock, or asking logistics for missing materials.' },
          { label: 'Data Depends On', value: 'Blueprint + Material', detail: 'Recipe accuracy comes from blueprint records, while live readiness comes from current Material logs and quality history.' },
          { label: 'Next Step', value: selectedBlueprint ? 'Blueprint -> Fabrication' : 'Select A Blueprint', detail: selectedBlueprint ? 'Open the blueprint registry for recipe context or launch the fabrication flow with this exact batch size.' : 'Choose a blueprint from the reference list to inspect its recipe and plan a batch.' },
        ]}
        actions={guideActions}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.92fr) minmax(0, 1.8fr)', gap: 14, flex: 1, minHeight: 0 }}>
        <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12, borderBottom: '0.5px solid var(--b1)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
              <input
                className="nexus-input"
                value={guideSearch}
                onChange={(event) => setGuideParams({ guide_q: event.target.value })}
                placeholder="Search blueprints or recipe materials..."
                style={{ paddingLeft: 30, height: 34, fontSize: 11 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGuideParams({ guide_tier: option })}
                  className="nexus-btn"
                  style={{
                    padding: '6px 10px',
                    background: tierFilter === option ? 'rgba(192,57,43,0.14)' : 'transparent',
                    borderColor: tierFilter === option ? 'rgba(192,57,43,0.38)' : 'var(--b1)',
                    color: tierFilter === option ? 'var(--t0)' : 'var(--t2)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {OWNERSHIP_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGuideParams({ guide_ownership: option })}
                  className="nexus-btn"
                  style={{
                    padding: '6px 10px',
                    background: ownershipFilter === option ? 'rgba(74,143,208,0.14)' : 'transparent',
                    borderColor: ownershipFilter === option ? 'rgba(74,143,208,0.34)' : 'var(--b1)',
                    color: ownershipFilter === option ? 'var(--info)' : 'var(--t2)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGuideParams({ guide_category: option })}
                  className="nexus-btn"
                  style={{
                    padding: '6px 10px',
                    background: categoryFilter === option ? 'rgba(200,168,75,0.12)' : 'transparent',
                    borderColor: categoryFilter === option ? 'rgba(200,168,75,0.34)' : 'var(--b1)',
                    color: categoryFilter === option ? 'var(--acc)' : 'var(--t2)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            <div style={{ color: 'var(--t3)', fontSize: 10, lineHeight: 1.6 }}>
              {filteredBlueprints.length} blueprint{filteredBlueprints.length === 1 ? '' : 's'} match the current filters.
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
            {filteredBlueprints.length === 0 ? (
              <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6, padding: '12px 4px' }}>
                No blueprints match this filter. Try searching by a material name or clear one of the filters above.
              </div>
            ) : (
              filteredBlueprints.map((blueprint) => (
                <BlueprintListItem
                  key={blueprint.id}
                  blueprint={blueprint}
                  active={blueprint.id === selectedBlueprintId}
                  onSelect={(blueprintId) => setGuideParams({ guide_bp: blueprintId })}
                />
              ))
            )}
          </div>
        </div>

        <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!selectedBlueprint ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--t2)', gap: 10 }}>
              <Wrench size={28} style={{ opacity: 0.25 }} />
              <div>Select a blueprint to inspect its recipe and prototype a craft plan.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '0.5px solid var(--b1)' }}>
                <div>
                  <div className="nexus-section-header">BLUEPRINT REFERENCE</div>
                  <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700 }}>{selectedBlueprint.item_name || 'Unnamed blueprint'}</div>
                  <div style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.08em', marginTop: 4 }}>
                    {(selectedBlueprint.tier || 'T1')} · {selectedBlueprint.category || 'UNCATEGORIZED'} · {blueprintOwned(selectedBlueprint) ? 'OWNED' : 'UNOWNED'} · {(selectedBlueprint.recipe_materials || []).length} recipe item{(selectedBlueprint.recipe_materials || []).length === 1 ? '' : 's'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <StatusPill ok={summary.livePass} label={summary.livePass ? 'Live Stock Ready' : 'Live Stock Short'} />
                  <StatusPill ok={summary.prototypePass} label={summary.prototypePass ? 'Prototype Pass' : 'Prototype Needs Work'} />
                </div>
              </div>

              <div style={{ paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <SummaryCard label="Output" value={`x${selectedBlueprint.output_quantity || 1}`} detail="Crafted output per fabrication run." color="var(--info)" />
                <SummaryCard label="Prototype Batch" value={`x${quantity}`} detail="Adjust the batch count to scale every recipe requirement." color="var(--warn)" />
                <SummaryCard label="Ownership" value={blueprintOwned(selectedBlueprint) ? 'Tracked' : 'Missing'} detail={blueprintOwned(selectedBlueprint) ? 'Blueprint holder is recorded for fabrication handoff.' : 'Ownership is not recorded yet for this blueprint.'} color={blueprintOwned(selectedBlueprint) ? 'var(--live)' : 'var(--t2)'} />
                <SummaryCard label="Quality Gates" value={`${summary.qualitySensitive}/${summary.total || 0}`} detail="Recipe rows with minimum quality thresholds." color={summary.qualitySensitive > 0 ? 'var(--acc)' : 'var(--t2)'} />
              </div>

              <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="nexus-section-header">PROTOTYPE LAB</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
                    Set custom SCU and quality values per ingredient to test a hypothetical craft plan before you commit stock.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.08em' }}>BATCHES</label>
                  <input
                    className="nexus-input"
                    type="number"
                    min="1"
                    max="50"
                    value={quantity}
                    onChange={(event) => setGuideParams({ guide_qty: Math.max(1, Math.min(50, Number(event.target.value) || 1)) })}
                    style={{ width: 86, height: 32, fontSize: 11 }}
                  />
                  <button type="button" className="nexus-btn" onClick={() => setGuideParams({ guide_mode: 'live' })}>Use Org Stock</button>
                  <button type="button" className="nexus-btn" onClick={() => setGuideParams({ guide_mode: 'minimum' })}>Use Minimums</button>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflow: 'auto', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recipeRows.length === 0 ? (
                  <div className="nexus-card-2" style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>
                    This blueprint does not have recipe data yet, so it can’t be prototyped. Add recipe materials to turn it into a usable reference entry.
                  </div>
                ) : (
                  recipeRows.map((row) => (
                    <div key={row.key} className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{row.materialName}</div>
                          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em', marginTop: 3 }}>
                            NEED {formatNumber(row.requiredScu)} SCU {row.minQuality ? `· MIN ${row.minQuality}% QUALITY` : '· NO QUALITY GATE'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <StatusPill ok={row.liveQtyOk && row.liveQualityOk} label={row.liveQtyOk && row.liveQualityOk ? 'Live Pass' : 'Live Short'} />
                          <StatusPill ok={row.prototypeQtyOk && row.prototypeQualityOk} label={row.prototypeQtyOk && row.prototypeQualityOk ? 'Prototype Pass' : 'Prototype Short'} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        <div>
                          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 6 }}>LIVE STOCK</div>
                          <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.7 }}>
                            <div>SCU: <strong style={{ color: row.liveQtyOk ? 'var(--live)' : 'var(--warn)' }}>{formatNumber(row.liveScu)}</strong></div>
                            <div>QUALITY: <strong style={{ color: row.liveQualityOk ? 'var(--live)' : 'var(--warn)' }}>{Math.round(row.liveQuality)}%</strong></div>
                          </div>
                        </div>

                        <div>
                          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 6 }}>PROTOTYPE SCU</div>
                          <input
                            className="nexus-input"
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.prototypeScu}
                            onChange={(event) => setPrototypeField(row.key, 'quantity_scu', Math.max(0, Number(event.target.value) || 0))}
                            style={{ height: 34, fontSize: 11 }}
                          />
                        </div>

                        <div>
                          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 6 }}>PROTOTYPE QUALITY %</div>
                          <input
                            className="nexus-input"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={row.prototypeQuality}
                            onChange={(event) => setPrototypeField(row.key, 'quality_pct', Math.max(0, Math.min(100, Number(event.target.value) || 0)))}
                            style={{ height: 34, fontSize: 11 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row.prototypeQtyOk ? <CheckCircle2 size={12} style={{ color: 'var(--live)' }} /> : <XCircle size={12} style={{ color: 'var(--danger)' }} />}
                          Quantity {row.prototypeQtyOk ? 'meets requirement' : `short by ${formatNumber(row.requiredScu - row.prototypeScu)} SCU`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row.prototypeQualityOk ? <CheckCircle2 size={12} style={{ color: 'var(--live)' }} /> : <XCircle size={12} style={{ color: 'var(--danger)' }} />}
                          Quality {row.prototypeQualityOk ? 'meets threshold' : `short by ${Math.max(0, row.minQuality - row.prototypeQuality).toFixed(0)}%`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
