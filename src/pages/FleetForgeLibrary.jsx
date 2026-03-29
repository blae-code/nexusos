import React, { useMemo, useState } from 'react';
import shipComponents from '@/apps/armory/assets/ships/index.jsx';

const SHIP_GLYPH_MAP = {
  prospector: shipComponents.Prospector,
  mole: shipComponents.Mole,
  caterpillar: shipComponents.Caterpillar,
  'c2-hercules': shipComponents.C2Hercules,
  'hull-c': shipComponents.HullC,
  arrow: shipComponents.Arrow,
  gladius: shipComponents.Gladius,
  'cutlass-black': shipComponents.CutlassBlack,
  carrack: shipComponents.Carrack,
  pisces: shipComponents.Pisces,
  razor: shipComponents.Razor,
};

function ShipGlyph({ assetKey, size = 44 }) {
  const normalized = String(assetKey || '').toLowerCase();
  const Glyph = SHIP_GLYPH_MAP[normalized]
    || Object.entries(SHIP_GLYPH_MAP).find(([key]) => normalized.includes(key) || key.includes(normalized))?.[1];
  if (!Glyph) {
    return <div style={{ width: size, height: size, border: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: 9 }}>SHIP</div>;
  }
  return <Glyph size={size} colour="var(--acc)" showHardpoints={false} />;
}

const LEVELS = ['ALL', 'PERSONAL', 'SQUAD', 'WING', 'FLEET'];

export default function FleetForgeLibrary({ builds = [] }) {
  const [level, setLevel] = useState('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return builds
      .filter((build) => level === 'ALL' || String(build?.canonical_level || 'PERSONAL').toUpperCase() === level)
      .filter((build) => !query.trim() || `${build?.ship_name || ''} ${build?.build_name || ''} ${build?.created_by_callsign || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((left, right) => String(right?.updated_at || '').localeCompare(String(left?.updated_at || '')));
  }, [builds, level, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: 14, gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>BUILD LIBRARY</div>
          <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700 }}>{filtered.length} saved fits</div>
        </div>
        <input className="nexus-input" placeholder="Search builds, ships, or creators" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 260 }} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {LEVELS.map((entry) => (
          <button key={entry} type="button" className="nexus-btn" onClick={() => setLevel(entry)} style={{ background: level === entry ? 'var(--bg3)' : 'var(--bg2)' }}>
            {entry}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map((build) => {
          const deltaStats = build?.delta_stats_json || {};
          const currentStats = deltaStats?.current || {};
          return (
            <div key={build.id} className="nexus-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShipGlyph assetKey={build?.viewer_asset_key || build?.ship_slug || build?.ship_name} size={44} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{build?.build_name || 'Untitled Build'}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10 }}>{build?.ship_name || 'Unknown Ship'} · {String(build?.canonical_level || 'PERSONAL').toUpperCase()}</div>
                </div>
                {build?.is_org_canonical ? <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'var(--live-b)', background: 'var(--live-bg)' }}>STANDARD</span> : null}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', padding: 8 }}>
                  <div style={{ color: 'var(--t3)', fontSize: 9 }}>Shield</div>
                  <div style={{ color: 'var(--t0)', fontSize: 12 }}>{currentStats?.shield || 0}</div>
                </div>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', padding: 8 }}>
                  <div style={{ color: 'var(--t3)', fontSize: 9 }}>Speed</div>
                  <div style={{ color: 'var(--t0)', fontSize: 12 }}>{currentStats?.speed || 0}</div>
                </div>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', padding: 8 }}>
                  <div style={{ color: 'var(--t3)', fontSize: 9 }}>Cargo</div>
                  <div style={{ color: 'var(--t0)', fontSize: 12 }}>{currentStats?.cargo || 0}</div>
                </div>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', padding: 8 }}>
                  <div style={{ color: 'var(--t3)', fontSize: 9 }}>Quantum</div>
                  <div style={{ color: 'var(--t0)', fontSize: 12 }}>{currentStats?.quantum || 0}</div>
                </div>
              </div>

              <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                By {build?.created_by_callsign || 'UNKNOWN'} · {build?.updated_at ? new Date(build.updated_at).toLocaleString() : 'No timestamp'}
              </div>
            </div>
          );
        })}

        {!filtered.length ? (
          <div className="nexus-card" style={{ padding: 16, color: 'var(--t2)', fontSize: 11 }}>
            No saved fits match the active filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
