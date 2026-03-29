/**
 * PriceAlertPanel — manage price threshold alerts for commodities.
 * Shown in the Prices tab when a commodity is selected.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { useSession } from '@/core/data/SessionContext';
import { showToast } from '@/components/NexusToast';
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

const ALERT_TYPES = [
  { id: 'SELL_ABOVE', label: 'SELL ≥', icon: TrendingUp, color: '#4A8C5C', desc: 'Sell price rises to or above target' },
  { id: 'SELL_BELOW', label: 'SELL ≤', icon: TrendingDown, color: '#C0392B', desc: 'Sell price drops to or below target' },
  { id: 'BUY_ABOVE', label: 'BUY ≥', icon: TrendingUp, color: '#C8A84B', desc: 'Buy price rises to or above target' },
  { id: 'BUY_BELOW', label: 'BUY ≤', icon: TrendingDown, color: '#3498DB', desc: 'Buy price drops to or below target' },
  { id: 'MARGIN_ABOVE', label: 'MARGIN ≥', icon: ArrowUpDown, color: '#8E44AD', desc: 'Profit margin reaches target %' },
];

function AlertRow({ alert, onToggle, onDelete }) {
  const cfg = ALERT_TYPES.find(t => t.id === alert.alert_type) || ALERT_TYPES[0];
  const Icon = cfg.icon;
  const isMargin = alert.alert_type === 'MARGIN_ABOVE';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
      background: '#141410', borderRadius: 2, border: '0.5px solid rgba(200,170,100,0.08)',
      opacity: alert.is_active ? 1 : 0.5,
    }}>
      <Icon size={11} style={{ color: cfg.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#E8E4DC', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: cfg.color, fontSize: 9, fontWeight: 600 }}>{cfg.label}</span>
          <span>{alert.threshold_aUEC.toLocaleString()}{isMargin ? '%' : ' aUEC'}</span>
        </div>
        <div style={{ fontSize: 9, color: '#5A5850', marginTop: 1 }}>
          {alert.trigger_count > 0 ? `Triggered ${alert.trigger_count}×` : 'Not yet triggered'}
          {alert.notify_all ? ' · Org-wide' : ''}
          {alert.notes ? ` · ${alert.notes}` : ''}
        </div>
      </div>
      <button onClick={() => onToggle(alert)} title={alert.is_active ? 'Pause' : 'Activate'} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 3,
        color: alert.is_active ? '#C8A84B' : '#5A5850',
      }}>
        {alert.is_active ? <Bell size={11} /> : <BellOff size={11} />}
      </button>
      <button onClick={() => onDelete(alert)} title="Delete" style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#5A5850',
      }}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export default function PriceAlertPanel({ commodityName }) {
  const { user } = useSession();
  const callsign = user?.callsign || 'UNKNOWN';
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('SELL_ABOVE');
  const [formThreshold, setFormThreshold] = useState('');
  const [formNotifyAll, setFormNotifyAll] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const all = await base44.entities.PriceAlert.list('-created_date', 200).catch(() => []);
    setAlerts(all || []);
    setLoading(false);
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);

  useEffect(() => {
    const unsub = base44.entities.PriceAlert.subscribe(scheduleRefresh);
    return unsub;
  }, [scheduleRefresh]);

  const filtered = useMemo(() =>
    alerts.filter(a => (a.commodity_name || '').toUpperCase() === (commodityName || '').toUpperCase()),
    [alerts, commodityName]
  );

  const handleCreate = async () => {
    const val = parseFloat(formThreshold);
    if (!val || val <= 0 || !commodityName) return;
    setSaving(true);
    try {
      await base44.entities.PriceAlert.create({
        commodity_name: commodityName,
        alert_type: formType,
        threshold_aUEC: val,
        is_active: true,
        created_by_callsign: callsign,
        trigger_count: 0,
        notify_all: formNotifyAll,
        notes: formNotes || undefined,
      });
      showToast('Price alert created', 'success');
      setShowForm(false);
      setFormThreshold('');
      setFormNotes('');
      await refreshNow();
    } catch (err) {
      showToast(err?.message || 'Failed to create alert', 'error');
    }
    setSaving(false);
  };

  const handleToggle = async (alert) => {
    await base44.entities.PriceAlert.update(alert.id, { is_active: !alert.is_active });
    await refreshNow();
  };

  const handleDelete = async (alert) => {
    await base44.entities.PriceAlert.delete(alert.id);
    await refreshNow();
    showToast('Alert deleted', 'info');
  };

  if (!commodityName) return null;

  const LABEL = {
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
    letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
  };

  return (
    <div style={{
      background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
      borderLeft: '2px solid #C8A84B', borderRadius: 2, padding: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 9, color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>PRICE ALERTS — {commodityName}</div>
        <button onClick={() => setShowForm(s => !s)} style={{
          padding: '3px 10px', borderRadius: 2, cursor: 'pointer',
          background: showForm ? 'rgba(200,168,75,0.10)' : '#141410',
          border: `0.5px solid ${showForm ? '#C8A84B' : 'rgba(200,170,100,0.12)'}`,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: showForm ? '#C8A84B' : '#9A9488',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {showForm ? <Bell size={9} /> : <Plus size={9} />}
          {showForm ? 'CANCEL' : 'ADD ALERT'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{
          padding: '12px', background: '#141410', borderRadius: 2,
          border: '0.5px solid rgba(200,170,100,0.10)', marginBottom: 10,
          display: 'flex', flexDirection: 'column', gap: 10,
          animation: 'nexus-fade-in 150ms ease-out both',
        }}>
          <div>
            <span style={LABEL}>ALERT TYPE</span>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {ALERT_TYPES.map(t => (
                <button key={t.id} onClick={() => setFormType(t.id)} title={t.desc} style={{
                  padding: '4px 8px', borderRadius: 2, cursor: 'pointer',
                  background: formType === t.id ? `${t.color}18` : '#0F0F0D',
                  border: `0.5px solid ${formType === t.id ? `${t.color}55` : 'rgba(200,170,100,0.08)'}`,
                  color: formType === t.id ? t.color : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <t.icon size={9} /> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>THRESHOLD {formType === 'MARGIN_ABOVE' ? '(%)' : '(aUEC)'}</span>
              <input className="nexus-input" type="number" min="0" step="0.01" value={formThreshold}
                onChange={e => setFormThreshold(e.target.value)}
                placeholder={formType === 'MARGIN_ABOVE' ? '15' : '25.00'}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>NOTE (OPTIONAL)</span>
              <input className="nexus-input" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                placeholder="Reminder" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488',
            }}>
              <input type="checkbox" checked={formNotifyAll} onChange={e => setFormNotifyAll(e.target.checked)}
                style={{ width: 12, height: 12, accentColor: '#C8A84B', cursor: 'pointer' }} />
              Notify entire org
            </label>
            <button onClick={handleCreate} disabled={!formThreshold || saving} style={{
              padding: '6px 14px', borderRadius: 2,
              background: !formThreshold || saving ? '#5A5850' : '#C8A84B',
              border: 'none', color: '#0F0F0D',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', cursor: !formThreshold || saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Bell size={10} /> {saving ? 'SAVING...' : 'CREATE ALERT'}
            </button>
          </div>
        </div>
      )}

      {/* Alerts list */}
      {loading ? (
        <div className="nexus-loading-dots" style={{ color: '#9A9488', padding: 12, textAlign: 'center' }}>
          <span /><span /><span />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '16px 0', textAlign: 'center',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
        }}>
          No alerts set for this commodity
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(a => (
            <AlertRow key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
