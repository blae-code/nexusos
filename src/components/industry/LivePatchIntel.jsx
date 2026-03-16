import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Zap } from 'lucide-react';

/**
 * Live Patch Intel — real-time patch data dashboard
 * Shows latest LIVE and PTU patches with industry impacts
 * Auto-refreshes every 5 minutes
 */

function PatchCard({ patch, isPtu }) {
  const isRecentHours = () => {
    const pubDate = new Date(patch.publishedAt);
    const diffMs = Date.now() - pubDate.getTime();
    return diffMs < 86400000; // Within 24 hours
  };

  const isRecent = isRecentHours();

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: `0.5px solid ${isRecent ? 'var(--warn-b)' : 'var(--b1)'}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 6,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isRecent ? 'var(--warn-b)' : 'var(--b1)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {isRecent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--warn)', fontSize: 9, letterSpacing: '0.08em', flexShrink: 0 }}>
            <Zap size={10} />
            NEW
          </div>
        )}
        <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          v{patch.version}
        </span>
        <span
          style={{
            color: isPtu ? 'var(--warn)' : 'var(--live)',
            fontSize: 9,
            padding: '1px 6px',
            border: `0.5px solid ${isPtu ? 'var(--warn-b)' : 'rgba(39,201,106,0.3)'}`,
            background: isPtu ? 'var(--warn-bg)' : 'rgba(39,201,106,0.06)',
            borderRadius: 3,
            letterSpacing: '0.08em',
            flexShrink: 0,
          }}
        >
          {isPtu ? 'PTU' : 'LIVE'}
        </span>
        <span style={{ color: 'var(--t2)', fontSize: 9, marginLeft: 'auto', flexShrink: 0 }}>
          {new Date(patch.publishedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Highlights */}
      {patch.highlights?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
          {patch.highlights.slice(0, 2).map((h, i) => (
            <div key={i} style={{ color: 'var(--t1)', fontSize: 10, lineHeight: 1.4 }}>
              • {h}
            </div>
          ))}
          {patch.highlights.length > 2 && (
            <div style={{ color: 'var(--t3)', fontSize: 9 }}>
              +{patch.highlights.length - 2} more changes
            </div>
          )}
        </div>
      )}

      {/* Affected systems */}
      {patch.affectedSystems?.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {patch.affectedSystems.slice(0, 4).map((sys: string) => (
            <span
              key={sys}
              style={{
                color: 'var(--t2)',
                fontSize: 8,
                background: 'var(--bg2)',
                border: '0.5px solid var(--b1)',
                borderRadius: 3,
                padding: '1px 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {sys}
            </span>
          ))}
          {patch.affectedSystems.length > 4 && (
            <span style={{ color: 'var(--t3)', fontSize: 8 }}>
              +{patch.affectedSystems.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Action link */}
      {patch.url && (
        <a
          href={patch.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 6,
            color: 'var(--info)',
            fontSize: 9,
            letterSpacing: '0.08em',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          → View Full Patch
        </a>
      )}
    </div>
  );
}

export default function LivePatchIntel() {
  const [livePatches, setLivePatches] = useState<any[]>([]);
  const [ptuPatches, setPtuPatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = async () => {
    try {
      const [live, ptu] = await Promise.all([
        base44.functions.invoke('getPatchData', { branch: 'LIVE', limit: 3 }),
        base44.functions.invoke('getPatchData', { branch: 'PTU', limit: 3 }),
      ]);

      setLivePatches(live.data?.patches || []);
      setPtuPatches(ptu.data?.patches || []);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.warn('Patch data fetch failed:', (e as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const allPatches = [...livePatches, ...ptuPatches];
  const hasNewPatches = allPatches.some(p => {
    const pubDate = new Date(p.publishedAt);
    return Date.now() - pubDate.getTime() < 86400000;
  });

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: `0.5px solid ${hasNewPatches ? 'var(--warn-b)' : 'var(--b1)'}`,
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {hasNewPatches && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--warn)' }}>
            <AlertTriangle size={11} />
          </div>
        )}
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 }}>
          Patch Intelligence
        </span>
        <span style={{ flex: 1 }} />
        {lastUpdated && (
          <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em' }}>
            Updated {lastUpdated}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--t2)', fontSize: 10, padding: '8px 0' }}>
          Loading patch data…
        </div>
      ) : allPatches.length === 0 ? (
        <div style={{ color: 'var(--t2)', fontSize: 10, padding: '8px 0' }}>
          No recent patches
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* LIVE column */}
          <div>
            <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' }}>
              LIVE Server
            </div>
            <div>
              {livePatches.length > 0 ? (
                livePatches.map((p, i) => <PatchCard key={i} patch={p} isPtu={false} />)
              ) : (
                <div style={{ color: 'var(--t3)', fontSize: 9, padding: '4px 0' }}>No recent LIVE patches</div>
              )}
            </div>
          </div>

          {/* PTU column */}
          <div>
            <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' }}>
              PTU Testing
            </div>
            <div>
              {ptuPatches.length > 0 ? (
                ptuPatches.map((p, i) => <PatchCard key={i} patch={p} isPtu={true} />)
              ) : (
                <div style={{ color: 'var(--t3)', fontSize: 9, padding: '4px 0' }}>No recent PTU patches</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}