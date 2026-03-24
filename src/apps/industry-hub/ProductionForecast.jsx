/**
 * ProductionForecast — Predicts material needs based on craft queue + blueprints.
 * Shows what materials are needed, what's in stock, and gaps.
 * Props: { craftQueue, blueprints, materials }
 */
import React, { useMemo } from 'react';
import { AlertTriangle, Check, TrendingUp, Package } from 'lucide-react';

function GapBar({ required, available, materialName, color }) {
  const pct = required > 0 ? Math.min(100, (available / required) * 100) : 100;
  const isCovered = available >= required;
  const deficit = Math.max(0, required - available);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isCovered ? '#2edb7a' : '#C0392B', flexShrink: 0,
      }} />
      <span style={{
        flex: 1, fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, color: '#E8E4DC', fontWeight: 500, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{materialName}</span>
      <div style={{
        width: 80, height: 4, borderRadius: 2,
        background: 'rgba(200,170,100,0.06)', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: isCovered ? '#2edb7a' : pct > 50 ? '#C8A84B' : '#C0392B',
          transition: 'width 400ms ease',
        }} />
      </div>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: isCovered ? '#2edb7a' : '#C0392B',
        fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right',
      }}>
        {available.toFixed(1)} / {required.toFixed(1)}
      </span>
      {!isCovered && (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#C0392B', background: 'rgba(192,57,43,0.08)',
          border: '0.5px solid rgba(192,57,43,0.20)',
          padding: '1px 6px', borderRadius: 2,
        }}>
          -{deficit.toFixed(1)} SCU
        </span>
      )}
    </div>
  );
}

function ForecastStat({ icon: Icon, label, value, valueColor }) {
  return (
    <div style={{
      flex: 1, background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={11} style={{ color: valueColor || '#9A9488' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20,
        fontWeight: 700, color: valueColor || '#E8E4DC',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

export default function ProductionForecast({ craftQueue = [], blueprints = [], materials = [] }) {
  const forecast = useMemo(() => {
    // Only forecast for active queue items
    const activeQueue = craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status));

    // Calculate total material requirements from queue
    const requirements = {};
    activeQueue.forEach(qItem => {
      const bp = blueprints.find(b => b.id === qItem.blueprint_id || b.item_name === qItem.blueprint_name);
      if (!bp?.recipe_materials) return;

      const qty = qItem.quantity || 1;
      bp.recipe_materials.forEach(rm => {
        const name = rm.material_name || rm.material;
        if (!name) return;
        if (!requirements[name]) requirements[name] = { required: 0, minQuality: 0 };
        requirements[name].required += (rm.quantity_scu || 0) * qty;
        requirements[name].minQuality = Math.max(requirements[name].minQuality, rm.min_quality || 0);
      });
    });

    // Calculate available stock
    const stock = {};
    materials.filter(m => !m.is_archived).forEach(m => {
      const name = m.material_name;
      if (!name) return;
      if (!stock[name]) stock[name] = 0;
      stock[name] += m.quantity_scu || 0;
    });

    // Build gap analysis
    const gaps = Object.entries(requirements).map(([name, req]) => ({
      material: name,
      required: req.required,
      available: stock[name] || 0,
      minQuality: req.minQuality,
      covered: (stock[name] || 0) >= req.required,
    })).sort((a, b) => {
      // Sort: uncovered first, then by deficit size
      if (a.covered !== b.covered) return a.covered ? 1 : -1;
      return (b.required - b.available) - (a.required - a.available);
    });

    const totalMaterialsNeeded = Object.keys(requirements).length;
    const coveredCount = gaps.filter(g => g.covered).length;
    const criticalGaps = gaps.filter(g => !g.covered);

    // Estimated production value from active queue
    const estValue = activeQueue.reduce((s, q) => {
      const bp = blueprints.find(b => b.id === q.blueprint_id || b.item_name === q.blueprint_name);
      return s + ((bp?.aUEC_value_est || 0) * (q.quantity || 1));
    }, 0);

    return { gaps, totalMaterialsNeeded, coveredCount, criticalGaps, activeCount: activeQueue.length, estValue };
  }, [craftQueue, blueprints, materials]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px' }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        <ForecastStat icon={Package} label="QUEUED JOBS" value={forecast.activeCount} valueColor="#C8A84B" />
        <ForecastStat
          icon={Check}
          label="MATERIALS COVERED"
          value={`${forecast.coveredCount}/${forecast.totalMaterialsNeeded}`}
          valueColor={forecast.coveredCount === forecast.totalMaterialsNeeded ? '#2edb7a' : '#C8A84B'}
        />
        <ForecastStat
          icon={AlertTriangle}
          label="CRITICAL GAPS"
          value={forecast.criticalGaps.length}
          valueColor={forecast.criticalGaps.length > 0 ? '#C0392B' : '#2edb7a'}
        />
        <ForecastStat
          icon={TrendingUp}
          label="EST. PRODUCTION VALUE"
          value={`${(forecast.estValue / 1000).toFixed(0)}K`}
          valueColor="#2edb7a"
        />
      </div>

      {/* Gap analysis */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderLeft: '2px solid #C0392B',
        borderRadius: 2, padding: '12px 14px',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>MATERIAL REQUIREMENTS vs STOCK</div>

        {forecast.gaps.length === 0 ? (
          <div style={{
            padding: '20px 0', textAlign: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
          }}>No active craft jobs with defined recipes.</div>
        ) : (
          forecast.gaps.map(gap => (
            <GapBar
              key={gap.material}
              materialName={gap.material}
              required={gap.required}
              available={gap.available}
            />
          ))
        )}
      </div>

      {/* Critical gaps callout */}
      {forecast.criticalGaps.length > 0 && (
        <div style={{
          background: 'rgba(192,57,43,0.04)',
          border: '0.5px solid rgba(192,57,43,0.20)',
          borderLeft: '2px solid #C0392B',
          borderRadius: 2, padding: '12px 14px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#C0392B', letterSpacing: '0.15em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertTriangle size={10} /> SHORTFALL ALERT — {forecast.criticalGaps.length} MATERIAL{forecast.criticalGaps.length > 1 ? 'S' : ''} NEEDED
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {forecast.criticalGaps.slice(0, 5).map(gap => (
              <div key={gap.material} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              }}>
                <span style={{ color: '#E8E4DC', flex: 1 }}>{gap.material}</span>
                <span style={{ color: '#C0392B', fontVariantNumeric: 'tabular-nums' }}>
                  Need {(gap.required - gap.available).toFixed(1)} more SCU
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}