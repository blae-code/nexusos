/**
 * LiveEventLog — Real-time event feed for live ops.
 * Subscribes to OpEvent entity for live sync.
 * Replaces old SessionLog in the LiveOp panel.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { ChevronDown } from 'lucide-react';
import EventEntry from './EventEntry';
import EventInputBar from './EventInputBar';
import PinnedEvents from './PinnedEvents';
import LootSummaryBar from './LootSummaryBar';
import { isOpsLeader } from '../rankPolicies';

export default function LiveEventLog({ op, callsign, rank, currentPhase, onSessionLogSync }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPill, setShowNewPill] = useState(false);
  const scrollRef = useRef(null);
  const prevCountRef = useRef(0);

  const isLive = op?.status === 'LIVE';
  const opId = op?.id;
  const canPost = isOpsLeader(rank);

  const fetchEvents = useCallback(async () => {
    if (!opId) return;
    const data = await base44.entities.OpEvent.filter({ op_id: opId }, '-logged_at', 200);
    // Reverse so oldest first for feed display
    setEvents((data || []).reverse());
    setLoading(false);
  }, [opId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Real-time subscription
  useEffect(() => {
    if (!opId) return;
    const unsub = base44.entities.OpEvent.subscribe((evt) => {
      if (evt.type === 'create' && evt.data?.op_id === opId) {
        setEvents(prev => [...prev, evt.data]);
      } else if (evt.type === 'update' && evt.data?.op_id === opId) {
        setEvents(prev => prev.map(e => e.id === evt.id ? evt.data : e));
      } else if (evt.type === 'delete') {
        setEvents(prev => prev.filter(e => e.id !== evt.id));
      }
    });
    return unsub;
  }, [opId]);

  // Auto-scroll logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (events.length > prevCountRef.current) {
      if (isNearBottom) {
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 0);
        setShowNewPill(false);
      } else {
        setShowNewPill(true);
      }
    }
    prevCountRef.current = events.length;
  }, [events.length]);

  // Sync loot entries back to Op session_log for legacy compatibility
  useEffect(() => {
    if (!onSessionLogSync) return;
    const lootEntries = events
      .filter(e => e.event_type === 'LOOT')
      .map(e => ({
        t: e.logged_at || e.created_date,
        type: 'MATERIAL',
        text: e.message,
        material_name: e.material_name,
        quantity_scu: e.quantity_scu,
        quality_pct: e.quality_score ? Math.round(e.quality_score / 10) : 0,
      }));
    const sessionEntries = events
      .filter(e => e.event_type !== 'LOOT')
      .map(e => ({
        t: e.logged_at || e.created_date,
        type: e.event_type === 'KEY_EVENT' ? 'PING' : e.event_type === 'PHASE_ADVANCE' ? 'PHASE_ADVANCE' : e.event_type === 'THREAT' ? 'THREAT' : 'MANUAL',
        text: e.message,
      }));
    onSessionLogSync([...sessionEntries, ...lootEntries].sort((a, b) => new Date(a.t) - new Date(b.t)));
  }, [events, onSessionLogSync]);

  const handleScrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowNewPill(false);
    }
  };

  const handleEventCreated = useCallback(() => {
    // Subscription handles real-time add, just scroll
    setTimeout(() => {
      if (scrollRef.current) {
        const el = scrollRef.current;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (isNearBottom) el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }, []);

  const pinned = events.filter(e => e.pinned);
  const lootEvents = events.filter(e => e.event_type === 'LOOT');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t3)' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      {/* Pinned events */}
      {pinned.length > 0 && <PinnedEvents events={pinned} />}

      {/* Loot summary bar */}
      {lootEvents.length > 0 && <LootSummaryBar events={lootEvents} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Event Feed
        </span>
        <span style={{
          fontSize: 9, color: 'var(--t3)', background: 'var(--bg3)',
          padding: '2px 6px', borderRadius: 3, fontVariantNumeric: 'tabular-nums',
        }}>
          {events.length}
        </span>
        {isLive && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--live)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
            LIVE
          </span>
        )}
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 8 }}>
        {events.length === 0 ? (
          <div style={{ color: 'var(--t3)', fontSize: 11, textAlign: 'center', padding: '24px 0' }}>
            No events logged yet — {canPost ? 'use the input below to start logging' : 'waiting for crew input'}
          </div>
        ) : (
          events.map((e, i) => <EventEntry key={e.id || i} event={e} />)
        )}
      </div>

      {/* New entries pill */}
      {showNewPill && (
        <div style={{ position: 'absolute', bottom: canPost ? 60 : 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <button onClick={handleScrollToBottom} className="nexus-btn" style={{ fontSize: 9, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronDown size={10} /> New events
          </button>
        </div>
      )}

      {/* Input bar */}
      {canPost && (
        <EventInputBar
          opId={opId}
          callsign={callsign}
          currentPhase={currentPhase}
          onCreated={handleEventCreated}
        />
      )}
    </div>
  );
}
