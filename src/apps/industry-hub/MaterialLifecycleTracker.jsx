/**
 * MaterialLifecycleTracker — visual pipeline showing material flow:
 * Deposit → Mined → Refined → Crafted → Sold
 * Props: { materials, refineryOrders, craftQueue, cofferLogs, scoutDeposits }
 */
import React, { useMemo } from 'react';
import { Search, Pickaxe, FlaskConical, Hammer, Coins } from 'lucide-react';

const STAGES = [
  { id: 'scouted', label: 'SCOUTED', icon: Search, color: '#2edb7a' },
  { id: 'mined', label: 'MINED', icon: Pickaxe, color: '#7AAECC' },
  { id: 'refining', label: 'REFINING', icon: FlaskConical, color: '#C8A84B' },
  { id: 'crafting', label: 'CRAFTING', icon: Hammer, color: '#D8BC70' },
  { id: 'sold', label: 'SOLD', icon: Coins, color: '#4A8C5C' },
];

function PipelineNode({ stage, count, totalSCU, isActive }) {
  const Icon = stage.icon;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      opacity: count > 0 ? 1 : 0.4,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: count > 0 ? `${stage.color}15` : '#141410',
        border: `1px solid ${count > 0 ? `${stage.color}44` : 'rgba(200,170,100,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 300ms',
        animation: isActive ? 'node-pulse 2s ease-in-out infinite' : 'none',
      }}>
        <Icon size={16} style={{ color: count > 0 ? stage.color : '#5A5850' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
          fontWeight: 700, color: count > 0 ? stage.color : '#5A5850',
          fontVariantNumeric: 'tabular-nums',
        }}>{count}</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{stage.label}</div>
        {totalSCU > 0 && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#9A9488', marginTop: 2,
          }}>{totalSCU.toFixed(1)} SCU</div>
        )}
      </div>
    </div>
  );
}

function PipelineConnector({ hasFlow }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      paddingBottom: 28,
    }}>
      <div style={{
        width: 32, height: 1,
        background: hasFlow
          ? 'linear-gradient(90deg, rgba(200,168,75,0.4), rgba(200,168,75,0.15))'
          : 'rgba(200,170,100,0.06)',
      }} />
      {hasFlow && (
        <div style={{
          width: 0, height: 0,
          borderTop: '3px solid transparent',
          borderBottom: '3px solid transparent',
          borderLeft: '5px solid rgba(200,168,75,0.4)',
        }} />
      )}
    </div>
  );
}

function MaterialBreakdown({ materials }) {
  // Group by material type
  const groups = {};
  (materials || []).forEach(m => {
    const type = m.material_type || 'OTHER';
    if (!groups[type]) groups[type] = { count: 0, scu: 0 };
    groups[type].count += 1;
    groups[type].scu += m.quantity_scu || 0;
  });

  const entries = Object.entries(groups).sort((a, b) => b[1].scu - a[1].scu);
  if (entries.length === 0) return null;

  const maxSCU = Math.max(...entries.map(([, v]) => v.scu), 1);

  const TYPE_COLORS = {
    CMR: '#C0392B', CMP: '#C8A84B', CMS: '#D8BC70',
    CM_REFINED: '#4A8C5C', ORE: '#7AAECC', DISMANTLED_SCRAP: '#9A9488',
    OTHER: '#5A5850',
  };

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '12px 14px',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>MATERIAL BREAKDOWN BY TYPE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(([type, data]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: TYPE_COLORS[type] || '#9A9488', width: 90,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{type.replace(/_/g, ' ')}</span>
            <div style={{
              flex: 1, height: 4, borderRadius: 2,
              background: 'rgba(200,170,100,0.06)', overflow: 'hidden',
            }}>
              <div style={{
                width: `${(data.scu / maxSCU) * 100}%`,
                height: '100%', borderRadius: 2,
                background: TYPE_COLORS[type] || '#9A9488',
                transition: 'width 400ms ease',
              }} />
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#9A9488', fontVariantNumeric: 'tabular-nums',
              minWidth: 56, textAlign: 'right',
            }}>{data.scu.toFixed(1)} SCU</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
              color: '#5A5850', minWidth: 20, textAlign: 'right',
            }}>({data.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MaterialLifecycleTracker({
  materials = [], refineryOrders = [], craftQueue = [],
  cofferLogs = [], scoutDeposits = [],
}) {
  const metrics = useMemo(() => {
    const scoutedCount = scoutDeposits.length;
    const scoutedSCU = 0; // deposits don't have SCU

    const minedCount = materials.filter(m => !m.is_archived).length;
    const minedSCU = materials.filter(m => !m.is_archived).reduce((s, m) => s + (m.quantity_scu || 0), 0);

    const refiningCount = refineryOrders.filter(r => r.status === 'ACTIVE').length;
    const refiningSCU = refineryOrders.filter(r => r.status === 'ACTIVE').reduce((s, r) => s + (r.quantity_scu || 0), 0);

    const craftingCount = craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status)).length;
    const craftingSCU = 0;

    const salesLogs = cofferLogs.filter(e => ['SALE', 'CRAFT_SALE'].includes(e.entry_type));
    const soldCount = salesLogs.length;
    const soldTotal = salesLogs.reduce((s, e) => s + (e.amount_aUEC || 0), 0);

    return [
      { count: scoutedCount, scu: scoutedSCU },
      { count: minedCount, scu: minedSCU },
      { count: refiningCount, scu: refiningSCU },
      { count: craftingCount, scu: craftingSCU },
      { count: soldCount, scu: soldTotal },
    ];
  }, [materials, refineryOrders, craftQueue, cofferLogs, scoutDeposits]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Pipeline visualization */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderLeft: '2px solid #C0392B',
        borderRadius: 2, padding: '20px 16px',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 16,
        }}>MATERIAL LIFECYCLE PIPELINE</div>

        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {STAGES.map((stage, i) => (
            <React.Fragment key={stage.id}>
              <PipelineNode
                stage={stage}
                count={metrics[i].count}
                totalSCU={metrics[i].scu}
                isActive={metrics[i].count > 0 && i < 4}
              />
              {i < STAGES.length - 1 && (
                <PipelineConnector hasFlow={metrics[i].count > 0 && metrics[i + 1].count > 0} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Material breakdown */}
      <MaterialBreakdown materials={materials} />

      <style>{`
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 2px transparent; }
          50% { box-shadow: 0 0 0 4px rgba(200,168,75,0.15); }
        }
      `}</style>
    </div>
  );
}