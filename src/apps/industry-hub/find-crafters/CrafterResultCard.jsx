import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Scroll, Package, Flame, Wrench, Send } from 'lucide-react';
import PresenceDot from '@/components/PresenceDot';
import MaterialRequisitionDialog from '@/components/requisition/MaterialRequisitionDialog';

const CAT_COLORS = {
  WEAPON: '#C0392B', ARMOR: '#3498DB', GEAR: '#4A8C5C', COMPONENT: '#9A9488',
  CONSUMABLE: '#E8A020', AMMO: '#C8A84B', SHIP_COMPONENT: '#8E44AD',
  FOCUSING_LENS: '#E67E22', OTHER: '#5A5850',
};

function Tag({ color, children }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
      color, background: `${color}18`, border: `0.5px solid ${color}40`,
      display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>{children}</span>
  );
}

function SectionHeader({ icon: Icon, label, count, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
      color: color || '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
      fontWeight: 600,
    }}>
      <Icon size={10} />
      {label} ({count})
    </div>
  );
}

export default function CrafterResultCard({ result, member, currentCallsign }) {
  const [expanded, setExpanded] = useState(false);
  const [reqDialog, setReqDialog] = useState(null);
  const { callsign, blueprints, materials, refinery, craftJobs } = result;

  const hasBp = blueprints.length > 0;
  const hasMat = materials.length > 0;
  const hasRef = refinery.length > 0;
  const hasJobs = craftJobs.length > 0;
  const totalScu = materials.reduce((s, m) => s + (m.quantity_scu || 0), 0);

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: `2px solid ${hasBp ? '#C8A84B' : hasMat ? '#4A8C5C' : '#5A5850'}`,
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'background 100ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PresenceDot lastSeenAt={member?.last_seen_at} size={7} />
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 15, color: '#E8E4DC', letterSpacing: '0.04em',
            }}>{callsign}</div>
            {member?.op_role && (
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                color: '#C8A84B', marginTop: 1,
              }}>{member.op_role}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasBp && <Tag color="#C8A84B"><Scroll size={8} /> {blueprints.length} BP</Tag>}
          {hasMat && <Tag color="#4A8C5C"><Package size={8} /> {totalScu.toFixed(1)} SCU</Tag>}
          {hasRef && <Tag color="#E8A020"><Flame size={8} /> {refinery.length} REFINING</Tag>}
          {hasJobs && <Tag color="#3498DB"><Wrench size={8} /> {craftJobs.length} CRAFTING</Tag>}
          {expanded ? <ChevronUp size={14} style={{ color: '#5A5850' }} /> : <ChevronDown size={14} style={{ color: '#5A5850' }} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '0 14px 14px',
          borderTop: '0.5px solid rgba(200,170,100,0.06)',
          display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12,
        }}>
          {/* Blueprints */}
          {hasBp && (
            <div>
              <SectionHeader icon={Scroll} label="OWNS BLUEPRINTS" count={blueprints.length} color="#C8A84B" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {blueprints.map(bp => (
                  <div key={bp.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', background: '#141410', borderRadius: 2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 2,
                        color: CAT_COLORS[bp.category] || '#5A5850',
                        background: `${CAT_COLORS[bp.category] || '#5A5850'}18`,
                      }}>{bp.category}</span>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 11, color: '#E8E4DC', fontWeight: 600,
                      }}>{bp.item_name}</span>
                    </div>
                    <span style={{
                      fontSize: 9, color: bp.tier === 'T2' ? '#C8A84B' : '#5A5850',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    }}>{bp.tier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materials held */}
          {hasMat && (
            <div>
              <SectionHeader icon={Package} label="HOLDS MATERIALS" count={materials.length} color="#4A8C5C" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {materials.map((m, i) => (
                  <div key={m.id || i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', background: '#141410', borderRadius: 2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 11, color: '#E8E4DC', fontWeight: 600,
                      }}>{m.material_name}</span>
                      {m.needed_for && (
                        <span style={{ fontSize: 9, color: '#5A5850' }}>for {m.needed_for}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 10, color: '#4A8C5C', fontVariantNumeric: 'tabular-nums',
                      }}>{m.quantity_scu} SCU</span>
                      {m.quality_score > 0 && (
                        <span style={{
                          fontSize: 9, color: m.quality_score >= 800 ? '#C8A84B' : '#5A5850',
                        }}>Q{m.quality_score}</span>
                      )}
                      {currentCallsign && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setReqDialog({
                            material_name: m.material_name,
                            material_type: m.material_type,
                            quantity_scu: m.quantity_scu,
                            blueprint_name: m.needed_for || '',
                            target_callsign: callsign,
                            source_module: 'FIND_CRAFTERS',
                          }); }}
                          style={{
                            padding: '2px 6px', borderRadius: 2, cursor: 'pointer',
                            background: 'rgba(192,57,43,0.10)', border: '0.5px solid rgba(192,57,43,0.3)',
                            color: '#C0392B', fontSize: 8, fontWeight: 600,
                            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
                            display: 'flex', alignItems: 'center', gap: 3,
                          }}
                          title="Request this material"
                        >
                          <Send size={7} /> REQ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refinery orders */}
          {hasRef && (
            <div>
              <SectionHeader icon={Flame} label="REFINING" count={refinery.length} color="#E8A020" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {refinery.map((ro, i) => (
                  <div key={ro.id || i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', background: '#141410', borderRadius: 2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 11, color: '#E8E4DC', fontWeight: 600,
                      }}>{ro.material_name}</span>
                      <span style={{ fontSize: 9, color: '#5A5850' }}>{ro.status}</span>
                    </div>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 10, color: '#E8A020', fontVariantNumeric: 'tabular-nums',
                    }}>{ro.quantity_scu} SCU</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active craft jobs */}
          {hasJobs && (
            <div>
              <SectionHeader icon={Wrench} label="CRAFTING" count={craftJobs.length} color="#3498DB" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {craftJobs.map((cq, i) => (
                  <div key={cq.id || i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', background: '#141410', borderRadius: 2,
                  }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 11, color: '#E8E4DC', fontWeight: 600,
                    }}>{cq.item_name || cq.blueprint_name || 'Unknown'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, color: '#3498DB' }}>{cq.status}</span>
                      <span style={{ fontSize: 9, color: '#5A5850' }}>×{cq.quantity || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requisition dialog */}
      {reqDialog && (
        <MaterialRequisitionDialog
          callsign={currentCallsign}
          prefill={reqDialog}
          onClose={() => setReqDialog(null)}
          onCreated={() => setReqDialog(null)}
        />
      )}
    </div>
  );
}