/**
 * BlueprintOwnershipPanel — tracks org vs personal blueprint ownership
 * and provides a request mechanism for unowned blueprints.
 * Props: { blueprints, callsign, rank }
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { User, Building2, Star, Send, Check, FileText } from 'lucide-react';

const CATEGORY_COLORS = {
  WEAPON: '#ff6b35', ARMOR: '#7AAECC', GEAR: '#5297FF',
  COMPONENT: '#C8A84B', CONSUMABLE: '#2edb7a', FOCUSING_LENS: '#a855f7',
  SHIP_COMPONENT: '#D8BC70', OTHER: '#9A9488',
};

function OwnershipStat({ icon: Icon, label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{
      flex: 1,
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={12} style={{ color }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22,
        fontWeight: 700, color, lineHeight: 1,
      }}>{count}</div>
      <div style={{ marginTop: 6 }}>
        <div style={{
          height: 3, borderRadius: 2,
          background: 'rgba(200,170,100,0.06)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 2,
            background: color, transition: 'width 400ms ease',
          }} />
        </div>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', marginTop: 4, display: 'block',
        }}>{pct}% of {total} total</span>
      </div>
    </div>
  );
}

function BlueprintRequestRow({ blueprint, callsign, onRequest }) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const catColor = CATEGORY_COLORS[blueprint.category] || '#9A9488';

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await base44.entities.Requisition.create({
        requested_by_callsign: callsign,
        request_type: 'BLUEPRINT',
        item_name: blueprint.item_name,
        purpose: `Requesting blueprint: ${blueprint.item_name} (${blueprint.tier}) for org crafting coverage`,
        priority: blueprint.is_priority ? 'HIGH' : 'NORMAL',
        requested_at: new Date().toISOString(),
      });
      setRequested(true);
      onRequest?.();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 2,
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <span style={{
        fontSize: 9, padding: '1px 6px', borderRadius: 2,
        background: `${catColor}22`, border: `0.5px solid ${catColor}44`,
        color: catColor, fontFamily: "'Barlow Condensed', sans-serif",
      }}>{blueprint.category}</span>
      <span style={{
        flex: 1, fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, color: '#E8E4DC', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{blueprint.item_name}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: blueprint.tier === 'T2' ? '#7AAECC' : '#9A9488',
      }}>{blueprint.tier}</span>
      {blueprint.is_priority && <Star size={10} style={{ color: '#C8A84B' }} />}
      {blueprint.owned_by_callsign ? (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          color: '#2edb7a', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <User size={9} /> {blueprint.owned_by_callsign}
        </span>
      ) : requested ? (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#2edb7a', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Check size={10} /> REQUESTED
        </span>
      ) : (
        <button
          onClick={handleRequest}
          disabled={requesting}
          style={{
            background: 'none',
            border: '0.5px solid rgba(200,170,100,0.15)',
            borderRadius: 2, padding: '3px 8px',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#C8A84B', cursor: 'pointer',
            letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#C8A84B'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.15)'; }}
        >
          <Send size={9} /> REQUEST
        </button>
      )}
    </div>
  );
}

export default function BlueprintOwnershipPanel({ blueprints = [], callsign, rank }) {
  const [filter, setFilter] = useState('all'); // all | owned | unowned | priority

  const stats = useMemo(() => {
    const total = blueprints.length;
    const owned = blueprints.filter(b => b.owned_by_callsign).length;
    const unowned = total - owned;
    const priority = blueprints.filter(b => b.is_priority).length;
    const priorityOwned = blueprints.filter(b => b.is_priority && b.owned_by_callsign).length;
    return { total, owned, unowned, priority, priorityOwned };
  }, [blueprints]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'owned': return blueprints.filter(b => b.owned_by_callsign);
      case 'unowned': return blueprints.filter(b => !b.owned_by_callsign);
      case 'priority': return blueprints.filter(b => b.is_priority);
      default: return blueprints;
    }
  }, [blueprints, filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <OwnershipStat icon={FileText} label="TOTAL" count={stats.total} total={stats.total} color="#9A9488" />
        <OwnershipStat icon={User} label="OWNED" count={stats.owned} total={stats.total} color="#2edb7a" />
        <OwnershipStat icon={Building2} label="UNOWNED" count={stats.unowned} total={stats.total} color="#C8A84B" />
        <OwnershipStat icon={Star} label="PRIORITY" count={stats.priorityOwned} total={stats.priority} color="#C0392B" />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { id: 'all', label: 'ALL' },
          { id: 'owned', label: 'OWNED' },
          { id: 'unowned', label: 'UNOWNED' },
          { id: 'priority', label: 'PRIORITY' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '5px 12px', border: 'none', cursor: 'pointer',
              borderBottom: filter === f.id ? '2px solid #C0392B' : '2px solid transparent',
              background: 'transparent',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: filter === f.id ? '#E8E4DC' : '#5A5850',
              transition: 'color 150ms',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Blueprint list */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '24px 0', textAlign: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
          }}>No blueprints in this category</div>
        ) : (
          filtered.map(b => (
            <BlueprintRequestRow
              key={b.id}
              blueprint={b}
              callsign={callsign}
            />
          ))
        )}
      </div>
    </div>
  );
}