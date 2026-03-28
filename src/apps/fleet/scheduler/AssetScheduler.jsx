/**
 * AssetScheduler — operational scheduling module for org asset reservations.
 * Prevents double-booking, shows 24h timeline, and supports approval workflow.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useOutletContext } from 'react-router-dom';
import { CalendarDays, Plus, RefreshCw, Clock, Ship } from 'lucide-react';
import ReservationForm from './ReservationForm';
import ReservationRow from './ReservationRow';
import ReservationTimeline from './ReservationTimeline';

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER'];
const VIEW_TABS = [
  { id: 'timeline', label: 'TIMELINE', icon: Clock },
  { id: 'list', label: 'ALL RESERVATIONS', icon: CalendarDays },
  { id: 'my', label: 'MY BOOKINGS', icon: Ship },
];

export default function AssetScheduler() {
  const ctx = /** @type {any} */ (useOutletContext() || {});
  const callsign = ctx.callsign || 'UNKNOWN';
  const userId = ctx.sessionUserId || '';
  const rank = ctx.rank || 'VAGRANT';
  const isLeader = LEADER_RANKS.includes(rank);

  const [reservations, setReservations] = useState([]);
  const [ships, setShips] = useState([]);
  const [assets, setAssets] = useState([]);
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('timeline');
  const [showForm, setShowForm] = useState(false);
  const [editRes, setEditRes] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');

  const load = useCallback(async () => {
    const [res, sh, as, op] = await Promise.all([
      base44.entities.AssetReservation.list('-start_time', 200).catch(() => []),
      base44.entities.OrgShip.list('name', 200).catch(() => []),
      base44.entities.OrgAsset.list('asset_name', 300).catch(() => []),
      base44.entities.Op.list('-scheduled_at', 50).catch(() => []),
    ]);
    setReservations(res || []);
    setShips(sh || []);
    setAssets(as || []);
    setOps((op || []).filter(o => ['DRAFT', 'PUBLISHED', 'LIVE'].includes(o.status)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.AssetReservation.subscribe(() => load());
    return unsub;
  }, [load]);

  const filtered = useMemo(() => {
    let list = reservations;
    if (view === 'my') list = list.filter(r => (r.reserved_by_callsign || '').toUpperCase() === callsign.toUpperCase());
    if (statusFilter === 'active') list = list.filter(r => ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(r.status));
    else if (statusFilter === 'past') list = list.filter(r => ['COMPLETED', 'CANCELLED'].includes(r.status));
    return list;
  }, [reservations, view, statusFilter, callsign]);

  const pendingCount = reservations.filter(r => r.status === 'PENDING').length;
  const activeCount = reservations.filter(r => r.status === 'ACTIVE').length;

  const handleEdit = (r) => { setEditRes(r); setShowForm(true); };
  const handleNew = () => { setEditRes(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditRes(null); load(); };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={15} style={{ color: '#C0392B' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ASSET SCHEDULER
              </span>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 2 }}>
              Reserve ships and assets for trade runs, mining ops, and logistics
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={load} style={{
              padding: '6px 12px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: 2, color: '#5A5850', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            }}><RefreshCw size={10} /> REFRESH</button>
            <button onClick={handleNew} style={{
              padding: '6px 16px', background: '#C0392B', border: 'none', borderRadius: 2,
              color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}><Plus size={11} /> RESERVE</button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'ACTIVE', value: activeCount, color: '#4A8C5C' },
            { label: 'PENDING', value: pendingCount, color: '#C8A84B' },
            { label: 'TOTAL', value: reservations.filter(r => !['COMPLETED', 'CANCELLED'].includes(r.status)).length, color: '#9A9488' },
            { label: 'SHIPS AVAILABLE', value: ships.filter(s => s.status === 'AVAILABLE').length, color: '#3498DB' },
          ].map(k => (
            <div key={k.label} style={{
              padding: '6px 12px', background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 2, minWidth: 80,
            }}>
              <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 1 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: k.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* View tabs + status filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {VIEW_TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setView(t.id)} style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  borderBottom: view === t.id ? '2px solid #C0392B' : '2px solid transparent',
                  background: 'transparent', color: view === t.id ? '#E8E4DC' : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}><Icon size={10} /> {t.label}</button>
              );
            })}
          </div>
          {view !== 'timeline' && (
            <div style={{ display: 'flex', gap: 0 }}>
              {[{ id: 'active', label: 'ACTIVE' }, { id: 'past', label: 'PAST' }, { id: 'all', label: 'ALL' }].map(f => (
                <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                  padding: '5px 10px', border: 'none', cursor: 'pointer',
                  borderBottom: statusFilter === f.id ? '2px solid #C0392B' : '2px solid transparent',
                  background: 'transparent', fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600, fontSize: 9, color: statusFilter === f.id ? '#E8E4DC' : '#5A5850',
                  letterSpacing: '0.1em',
                }}>{f.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {view === 'timeline' ? (
          <div style={{ padding: '12px 16px' }}>
            <div style={{
              background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <ReservationTimeline reservations={reservations} ships={ships} assets={assets} />
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 16px' }}>
            <div style={{
              background: '#0F0F0D', borderLeft: '2px solid #C0392B',
              border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
              overflow: 'hidden',
            }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: '50px 20px', textAlign: 'center',
                  fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
                  fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em',
                }}>
                  {view === 'my' ? 'NO PERSONAL BOOKINGS' : 'NO RESERVATIONS FOUND'}
                </div>
              ) : (
                filtered.map(r => (
                  <ReservationRow key={r.id} reservation={r} isLeader={isLeader} callsign={callsign} onEdit={handleEdit} onRefresh={load} />
                ))
              )}
              <div style={{
                padding: '6px 14px', borderTop: '0.5px solid rgba(200,170,100,0.06)',
                fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                Showing {filtered.length} of {reservations.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ReservationForm
          ships={ships} assets={assets} ops={ops}
          reservations={reservations} callsign={callsign} userId={userId}
          editReservation={editRes}
          onClose={() => { setShowForm(false); setEditRes(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
