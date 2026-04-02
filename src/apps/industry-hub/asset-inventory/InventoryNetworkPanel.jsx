import React, { useMemo } from 'react';
import { Boxes, MapPin, Users } from 'lucide-react';
import { isT2Eligible, qualityPercentFromRecord } from '@/core/data/quality';

function MetricCard({ label, value, color = '#E8E4DC' }) {
  return (
    <div style={{
      minWidth: 120,
      padding: '10px 12px',
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2,
    }}>
      <div style={{
        fontSize: 9,
        color: '#5A5850',
        letterSpacing: '0.1em',
        marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 16,
        fontWeight: 700,
        color,
      }}>{value}</div>
    </div>
  );
}

function MaterialLine({ material }) {
  const qualityPct = qualityPercentFromRecord(material);
  const craftReady = isT2Eligible(material) || Boolean(material.t2_eligible);
  const location = material.held_in || material.location || material.container || 'Location not set';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 68px 60px 150px',
      gap: 8,
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '0.5px solid rgba(200,170,100,0.05)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: '#E8E4DC',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{material.material_name}</div>
        <div style={{
          fontSize: 9,
          color: '#5A5850',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{location}</div>
      </div>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#C8A84B',
        textAlign: 'right',
      }}>{Number(material.quantity_scu || 0).toFixed(1)} SCU</div>
      <div style={{
        fontSize: 10,
        color: craftReady ? '#C8A84B' : '#9A9488',
        textAlign: 'right',
      }}>{qualityPct.toFixed(0)}%</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: 8,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 2,
          color: craftReady ? '#C8A84B' : '#5A5850',
          background: craftReady ? 'rgba(200,168,75,0.10)' : 'rgba(154,148,136,0.08)',
          border: `0.5px solid ${craftReady ? 'rgba(200,168,75,0.25)' : 'rgba(154,148,136,0.15)'}`,
          letterSpacing: '0.08em',
        }}>{craftReady ? 'CRAFT READY' : 'REFINE / LOW Q'}</span>
      </div>
    </div>
  );
}

export default function InventoryNetworkPanel({ materials, search }) {
  const query = (search || '').trim().toLowerCase();

  const filtered = useMemo(() => {
    return (materials || []).filter((material) => {
      if (material.is_archived || Number(material.quantity_scu || 0) <= 0) return false;
      if (!query) return true;
      const haystack = [
        material.material_name,
        material.material_type,
        material.custodian_callsign,
        material.logged_by_callsign,
        material.held_in,
        material.location,
        material.container,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [materials, query]);

  const grouped = useMemo(() => {
    const groups = new Map();

    for (const material of filtered) {
      const holder = (material.custodian_callsign || material.logged_by_callsign || 'UNASSIGNED').toUpperCase();
      const current = groups.get(holder) || {
        holder,
        totalScu: 0,
        craftReady: 0,
        locations: new Set(),
        items: [],
      };
      current.totalScu += Number(material.quantity_scu || 0);
      if (isT2Eligible(material) || material.t2_eligible) current.craftReady += Number(material.quantity_scu || 0);
      current.locations.add(material.held_in || material.location || material.container || 'Unknown');
      current.items.push(material);
      groups.set(holder, current);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => Number(b.quantity_scu || 0) - Number(a.quantity_scu || 0)),
        topLocations: [...group.locations].slice(0, 3),
      }))
      .sort((a, b) => b.totalScu - a.totalScu || a.holder.localeCompare(b.holder));
  }, [filtered]);

  const summary = useMemo(() => {
    const holders = new Set(grouped.map((group) => group.holder)).size;
    const totalScu = filtered.reduce((sum, material) => sum + Number(material.quantity_scu || 0), 0);
    const craftReadyScu = filtered.reduce((sum, material) => {
      return sum + ((isT2Eligible(material) || material.t2_eligible) ? Number(material.quantity_scu || 0) : 0);
    }, 0);
    const uniqueMaterials = new Set(filtered.map((material) => material.material_name).filter(Boolean)).size;
    return { holders, totalScu, craftReadyScu, uniqueMaterials };
  }, [filtered, grouped]);

  if (filtered.length === 0) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11,
        color: '#5A5850',
      }}>
        <Boxes size={28} style={{ opacity: 0.15, marginBottom: 8 }} />
        <div>{search ? 'No org materials match this search' : 'No org materials logged yet'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <MetricCard label="ORG SCU" value={summary.totalScu.toFixed(1)} color="#C8A84B" />
        <MetricCard label="CRAFT READY" value={summary.craftReadyScu.toFixed(1)} color="#4A8C5C" />
        <MetricCard label="HOLDERS" value={summary.holders} color="#3498DB" />
        <MetricCard label="MATERIALS" value={summary.uniqueMaterials} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {grouped.map((group) => (
          <div key={group.holder} style={{
            background: '#0F0F0D',
            borderLeft: '2px solid #3498DB',
            border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(52,152,219,0.05)',
              borderBottom: '0.5px solid rgba(52,152,219,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={12} style={{ color: '#3498DB' }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#E8E4DC',
                  letterSpacing: '0.06em',
                }}>{group.holder}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: '#C8A84B' }}>{group.totalScu.toFixed(1)} SCU</span>
                <span style={{ fontSize: 10, color: '#4A8C5C' }}>{group.craftReady.toFixed(1)} ready</span>
                <span style={{ fontSize: 10, color: '#9A9488' }}>{group.items.length} line{group.items.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                {group.topLocations.map((location) => (
                  <div key={location} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={10} style={{ color: '#5A5850' }} />
                    <span style={{ fontSize: 9, color: '#5A5850' }}>{location}</span>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 68px 60px 150px',
                gap: 8,
                paddingBottom: 6,
                borderBottom: '0.5px solid rgba(200,170,100,0.08)',
              }}>
                <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em' }}>MATERIAL</div>
                <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', textAlign: 'right' }}>QTY</div>
                <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', textAlign: 'right' }}>QUALITY</div>
                <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', textAlign: 'right' }}>STATE</div>
              </div>

              <div>
                {group.items.map((material) => (
                  <MaterialLine key={material.id} material={material} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
