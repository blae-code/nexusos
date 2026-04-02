/**
 * InventorySearchPanel — unified search across Material, PersonalAsset, OrgAsset, OrgShip.
 * Uses data already loaded by AssetInventoryTab — no additional API calls.
 */
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

const TYPE_STYLES = {
  MATERIAL:     { color: '#C8A84B', bg: 'rgba(200,170,100,0.08)', border: 'rgba(200,170,100,0.25)' },
  PERSONAL:     { color: '#4A8C5C', bg: 'rgba(74,140,92,0.08)',   border: 'rgba(74,140,92,0.25)' },
  ORG_ASSET:    { color: '#3498DB', bg: 'rgba(52,152,219,0.08)',  border: 'rgba(52,152,219,0.25)' },
  SHIP:         { color: '#8E44AD', bg: 'rgba(142,68,173,0.08)',  border: 'rgba(142,68,173,0.25)' },
};

function TypeBadge({ type }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.MATERIAL;
  return (
    <span style={{
      fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 2, flexShrink: 0,
      color: s.color, background: s.bg, border: `0.5px solid ${s.border}`,
      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em',
    }}>
      {type.replace('_', ' ')}
    </span>
  );
}

function ResultRow({ result }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '80px 1.8fr 1fr 1fr 0.8fr',
      gap: 10,
      padding: '6px 0',
      borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      alignItems: 'center',
      fontSize: 10,
    }}>
      <TypeBadge type={result.type} />
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E8E4DC' }}>
        {result.name}
      </div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#9A9488', fontSize: 9 }}>
        {result.holder || result.custodian || '—'}
      </div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5A5850', fontSize: 9 }}>
        {result.location || result.system || '—'}
      </div>
      <div style={{ color: result.statusColor || '#5A5850', fontSize: 9, textAlign: 'right' }}>
        {result.quantity != null ? result.quantity : result.status || ''}
      </div>
    </div>
  );
}

function buildSearchIndex(materials, personalAssets, orgAssets, orgShips) {
  const rows = [];

  for (const m of materials || []) {
    if (m.is_archived) continue;
    rows.push({
      id: m.id,
      type: 'MATERIAL',
      name: m.material_name || m.item_name || '',
      holder: m.custodian_callsign || m.logged_by_callsign || '',
      location: m.storage_location || '',
      system: m.system || '',
      quantity: `${Number(m.quantity_scu || 0).toFixed(1)} SCU`,
      status: m.material_type || '',
      statusColor: '#C8A84B',
      searchText: [m.material_name, m.item_name, m.custodian_callsign, m.logged_by_callsign, m.storage_location, m.material_type, m.system].filter(Boolean).join(' ').toLowerCase(),
    });
  }

  for (const a of personalAssets || []) {
    rows.push({
      id: a.id,
      type: 'PERSONAL',
      name: a.item_name || '',
      holder: a.owner_callsign || '',
      location: a.storage_location || '',
      system: '',
      quantity: null,
      status: a.category || a.status || '',
      statusColor: '#4A8C5C',
      searchText: [a.item_name, a.owner_callsign, a.storage_location, a.category, a.status, a.serial_number].filter(Boolean).join(' ').toLowerCase(),
    });
  }

  for (const a of orgAssets || []) {
    rows.push({
      id: a.id,
      type: 'ORG_ASSET',
      name: a.name || a.serial_number || '',
      holder: a.assigned_to_callsign || '',
      location: a.storage_location || '',
      system: '',
      quantity: null,
      status: a.status || a.condition || '',
      statusColor: '#3498DB',
      searchText: [a.name, a.serial_number, a.assigned_to_callsign, a.storage_location, a.status, a.category, a.condition].filter(Boolean).join(' ').toLowerCase(),
    });
  }

  for (const s of orgShips || []) {
    rows.push({
      id: s.id,
      type: 'SHIP',
      name: s.name || '',
      holder: s.assigned_to_callsign || '',
      location: '',
      system: '',
      quantity: null,
      status: s.status || '',
      statusColor: s.status === 'AVAILABLE' ? '#4A8C5C' : s.status === 'MAINTENANCE' ? '#C8A84B' : '#5A5850',
      custodian: s.assigned_to_callsign || '',
      searchText: [s.name, s.model, s.manufacturer, s.assigned_to_callsign, s.status, s.class].filter(Boolean).join(' ').toLowerCase(),
    });
  }

  return rows;
}

const COLUMN_HEADERS = ['TYPE', 'NAME', 'HOLDER / CUSTODY', 'LOCATION', 'QTY / STATUS'];
const HEADER_STYLE = { fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', fontFamily: "'Barlow Condensed', sans-serif" };

export default function InventorySearchPanel({
  materials = [],
  personalAssets = [],
  orgAssets = [],
  orgShips = [],
}) {
  const [query, setQuery] = useState('');

  const index = useMemo(
    () => buildSearchIndex(materials, personalAssets, orgAssets, orgShips),
    [materials, personalAssets, orgAssets, orgShips]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return index.filter((row) => row.searchText.includes(q)).slice(0, 100);
  }, [index, query]);

  const counts = useMemo(() => {
    const c = {};
    for (const r of results) c[r.type] = (c[r.type] || 0) + 1;
    return c;
  }, [results]);

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
        <input
          className="nexus-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all materials, personal assets, org assets, and ships..."
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 30, height: 32, fontSize: 11 }}
        />
        {query.length >= 2 && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#5A5850' }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
            {Object.entries(counts).map(([type, count]) => (
              <span key={type} style={{ marginLeft: 8, color: TYPE_STYLES[type]?.color || '#5A5850' }}>
                {type.replace('_', ' ')} {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {query.length >= 2 && results.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 10, color: '#5A5850' }}>
          No results for <span style={{ color: '#9A9488' }}>"{query}"</span> across {index.length} inventory records.
        </div>
      )}

      {query.length < 2 && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 10, color: '#5A5850' }}>
          Type at least 2 characters to search {index.length.toLocaleString()} inventory records spanning materials, personal assets, org assets, and ships.
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1.8fr 1fr 1fr 0.8fr',
            gap: 10, padding: '4px 0 6px',
            borderBottom: '0.5px solid rgba(200,170,100,0.10)',
            marginBottom: 2,
          }}>
            {COLUMN_HEADERS.map((h) => (
              <div key={h} style={HEADER_STYLE}>{h}</div>
            ))}
          </div>
          {results.map((r) => (
            <ResultRow key={`${r.type}-${r.id}`} result={r} />
          ))}
        </>
      )}
    </div>
  );
}
