/**
 * ExchangeBoard — peer-to-peer barter exchange board.
 * Props: { materials, commodities, viewerId, viewerCallsign }
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { sendNexusNotification } from '@/core/data/nexus-notify';
import { formatCompactAuec } from '@/core/data/commerce-logistics';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { Plus } from 'lucide-react';
import PostExchangeForm from './PostExchangeForm';

const STATUS_STYLE = {
  OPEN: { color: 'var(--live)', bg: 'rgba(74,232,48,0.14)' },
  PENDING: { color: 'var(--warn)', bg: 'rgba(243,156,18,0.16)' },
  COMPLETE: { color: 'var(--t2)', bg: 'rgba(157,161,205,0.12)' },
  CANCELLED: { color: 'var(--danger)', bg: 'rgba(192,57,43,0.14)' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.CANCELLED;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function ValueRow({ label, value, unknownItems }) {
  const hasValue = value > 0;
  const hasUnknown = unknownItems && unknownItems.length > 0;
  if (!hasValue && !hasUnknown) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      {hasValue ? (
        <span style={{ fontSize: 10, color: 'var(--acc)', fontVariantNumeric: 'tabular-nums' }}>
          est. {formatCompactAuec(value)}
          {hasUnknown ? ` (+${unknownItems.length} unpriced)` : ''}
        </span>
      ) : (
        <span style={{ fontSize: 9, color: 'var(--warn)' }}>value unknown — verify before completing</span>
      )}
    </div>
  );
}

function ExchangeCard({ post, viewerId, viewerCallsign, onRefresh }) {
  const isOwn = post.poster_id === viewerId;
  const [busy, setBusy] = useState(false);

  const formatValue = (val) => (val > 0 ? `est. ${formatCompactAuec(val)}` : 'value unknown');

  const handleAccept = async () => {
    setBusy(true);
    try {
      await base44.entities.TradePost.update(post.id, {
        status: 'PENDING',
        accepted_by_id: viewerId,
        accepted_by_callsign: viewerCallsign,
      });

      const offerLabel = formatValue(post.offer_est_value);
      const requestLabel = formatValue(post.request_est_value);
      const bothUnknown = post.offer_est_value === 0 && post.request_est_value === 0;
      const unknownNote = bothUnknown ? ' Value unknown — verify before completing.' : '';

      await Promise.allSettled([
        sendNexusNotification({
          type: 'EXCHANGE_ACCEPTED',
          title: `Exchange accepted by ${viewerCallsign}`,
          body: `Your offer (${offerLabel}) \u2194 Their offer (${requestLabel}). Review and confirm.${unknownNote}`,
          severity: 'INFO',
          target_user_id: post.poster_id,
          source_module: 'EXCHANGE',
          source_id: post.id,
        }),
        sendNexusNotification({
          type: 'EXCHANGE_PENDING',
          title: 'Exchange pending confirmation',
          body: `You offered (${requestLabel}) \u2194 Their offer (${offerLabel}). Awaiting poster confirmation.${unknownNote}`,
          severity: 'INFO',
          target_user_id: viewerId,
          source_module: 'EXCHANGE',
          source_id: post.id,
        }),
      ]);
      onRefresh?.();
    } catch {
      setBusy(false);
    }
  };

  const handleConfirmComplete = async () => {
    setBusy(true);
    try {
      await base44.entities.TradePost.update(post.id, {
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
      });
      onRefresh?.();
    } catch {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await base44.entities.TradePost.update(post.id, { status: 'CANCELLED' });
      onRefresh?.();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 0',
        borderBottom: '0.5px solid var(--b0)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--t0)', fontWeight: 600 }}>{post.poster_callsign}</span>
        <StatusPill status={post.status} />
        {isOwn && (
          <span style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>YOUR LISTING</span>
        )}
        <span style={{ fontSize: 9, color: 'var(--t3)', marginLeft: 'auto' }}>
          {new Date(post.created_at || Date.now()).toLocaleString()}
        </span>
      </div>

      {/* Offer */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Offering</div>
          {post.offer_items && post.offer_items.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--t1)', lineHeight: 1.6 }}>
              {post.offer_items.map((item, i) => (
                <div key={i}>{item.raw || JSON.stringify(item)}</div>
              ))}
            </div>
          )}
          {post.offer_aUEC > 0 && (
            <div style={{ fontSize: 10, color: 'var(--acc)', fontVariantNumeric: 'tabular-nums' }}>
              + {formatCompactAuec(post.offer_aUEC)} aUEC
            </div>
          )}
          {post.offer_est_value > 0 && (
            <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>est. {formatCompactAuec(post.offer_est_value)}</div>
          )}
        </div>

        <div style={{ color: 'var(--t3)', fontSize: 14, alignSelf: 'center' }}>&#8596;</div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Seeking</div>
          <div style={{ fontSize: 10, color: 'var(--t1)', lineHeight: 1.6 }}>{post.request_description}</div>
          {post.request_items && post.request_items.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2, lineHeight: 1.6 }}>
              {post.request_items.map((item, i) => (
                <div key={i}>{item.raw || JSON.stringify(item)}</div>
              ))}
            </div>
          )}
          {post.request_aUEC > 0 && (
            <div style={{ fontSize: 10, color: 'var(--info)', fontVariantNumeric: 'tabular-nums' }}>
              + {formatCompactAuec(post.request_aUEC)} aUEC
            </div>
          )}
          {post.request_est_value > 0 && (
            <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>est. {formatCompactAuec(post.request_est_value)}</div>
          )}
        </div>
      </div>

      {post.notes && (
        <div style={{ fontSize: 9, color: 'var(--t3)', fontStyle: 'italic' }}>{post.notes}</div>
      )}

      {/* Accepted-by line */}
      {post.accepted_by_callsign && post.status === 'PENDING' && (
        <div style={{ fontSize: 9, color: 'var(--warn)' }}>
          Accepted by {post.accepted_by_callsign} — awaiting poster confirmation
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!isOwn && post.status === 'OPEN' && (
          <button
            className="nexus-btn primary"
            style={{ padding: '5px 12px', fontSize: 9 }}
            onClick={handleAccept}
            disabled={busy}
          >
            {busy ? '...' : 'Accept Exchange'}
          </button>
        )}
        {isOwn && post.status === 'PENDING' && (
          <button
            className="nexus-btn primary"
            style={{ padding: '5px 12px', fontSize: 9 }}
            onClick={handleConfirmComplete}
            disabled={busy}
          >
            {busy ? '...' : 'Confirm Complete'}
          </button>
        )}
        {isOwn && ['OPEN', 'PENDING'].includes(post.status) && (
          <button
            className="nexus-btn"
            style={{ padding: '5px 12px', fontSize: 9, color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.4)' }}
            onClick={handleCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function ExchangeBoard({ materials, commodities, viewerId, viewerCallsign }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [entityMissing, setEntityMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await base44.entities.TradePost.list('-created_at', 100);
      setPosts(Array.isArray(result) ? result : []);
      setEntityMissing(false);
    } catch {
      setPosts([]);
      setEntityMissing(true);
    } finally {
      setLoading(false);
    }
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);

  useEffect(() => {
    try {
      const unsub = base44.entities.TradePost.subscribe(scheduleRefresh);
      return () => typeof unsub === 'function' && unsub();
    } catch {
      return undefined;
    }
  }, [scheduleRefresh]);

  const myPosts = posts.filter((p) => p.poster_id === viewerId);
  const openPosts = posts.filter((p) => p.status === 'OPEN' && p.poster_id !== viewerId);

  if (entityMissing) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>
        Exchange board coming online — TradePost entity not yet provisioned.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>
          Post barter listings and connect with other members for peer-to-peer item exchanges.
          Estimated values are shown to both parties when items are involved.
        </div>
        {!showForm && (
          <button
            className="nexus-btn primary"
            style={{ padding: '7px 12px', flexShrink: 0, marginLeft: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setShowForm(true)}
          >
            <Plus size={12} />
            Post Exchange
          </button>
        )}
      </div>

      {showForm && (
        <PostExchangeForm
          materials={materials}
          commodities={commodities}
          viewerId={viewerId}
          viewerCallsign={viewerCallsign}
          onDone={() => { setShowForm(false); void refreshNow(); }}
        />
      )}

      {/* Open posts from other members */}
      <div className={`nexus-card nexus-bg-dimable${showForm ? ' nexus-bg-dimmed' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
          Open Listings
        </div>
        {loading ? (
          <div style={{ padding: '12px 0', fontSize: 11, color: 'var(--t3)' }}>Loading...</div>
        ) : openPosts.length === 0 ? (
          <div style={{ padding: '12px 0', fontSize: 11, color: 'var(--t3)' }}>No open listings — be the first to post.</div>
        ) : (
          openPosts.map((post) => (
            <ExchangeCard
              key={post.id}
              post={post}
              viewerId={viewerId}
              viewerCallsign={viewerCallsign}
              onRefresh={refreshNow}
            />
          ))
        )}
      </div>

      {/* My posts */}
      {myPosts.length > 0 && (
        <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
            My Listings
          </div>
          {myPosts.map((post) => (
            <ExchangeCard
              key={post.id}
              post={post}
              viewerId={viewerId}
              viewerCallsign={viewerCallsign}
              onRefresh={refreshNow}
            />
          ))}
        </div>
      )}
    </div>
  );
}
