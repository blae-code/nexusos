/**
 * PersonalWalletPanel — member wallet tracking + contribution history.
 * Displays aUEC balance, recent op payouts, and update mechanism.
 * Props: { user }
 */
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { Coins, TrendingUp, TrendingDown, Save, History } from 'lucide-react';

function fmtAuec(n) {
  if (!n || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}

function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      flex: 1, background: '#0F0F0D',
      border: `0.5px solid ${color}22`,
      borderRadius: 2, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Icon size={10} style={{ color }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
        fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

export default function PersonalWalletPanel() {
  const { user, patchUser } = useSession();
  const callsign = user?.callsign || 'UNKNOWN';
  const currentBalance = user?.aUEC_balance || 0;

  const [newBalance, setNewBalance] = useState(String(currentBalance));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setNewBalance(String(user?.aUEC_balance || 0));
  }, [user?.aUEC_balance]);

  const loadHistory = useCallback(async () => {
    if (!callsign) return;
    // Get op splits + transfers for this member
    const [splits, transfers] = await Promise.all([
      base44.entities.CofferLog.filter({ logged_by_callsign: callsign }),
      base44.entities.OrgTransfer.filter({ from_callsign: callsign }),
    ]);
    const items = [];
    (splits || []).forEach(s => {
      items.push({
        id: s.id,
        type: s.entry_type,
        amount: s.amount_aUEC || 0,
        date: s.logged_at || s.created_date,
        label: s.entry_type === 'OP_SPLIT' ? 'Op Payout' : s.entry_type,
        direction: 'IN',
      });
    });
    (transfers || []).forEach(t => {
      const isContribution = t.transfer_type?.includes('CONTRIBUTE');
      items.push({
        id: t.id,
        type: t.transfer_type,
        amount: t.amount_aUEC || 0,
        date: t.transfer_at || t.created_date,
        label: isContribution ? 'Org Contribution' : 'Withdrawal',
        direction: isContribution ? 'OUT' : 'IN',
      });
    });
    items.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return (timeB || 0) - (timeA || 0);
    });
    setHistory(items.slice(0, 15));
  }, [callsign]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSave = async () => {
    const val = parseInt(newBalance) || 0;
    if (val === currentBalance) return;
    setSaving(true);
    await base44.entities.NexusUser.update(user.id, { aUEC_balance: val });
    patchUser({ aUEC_balance: val });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const totalIn = history.filter(h => h.direction === 'IN').reduce((s, h) => s + h.amount, 0);
  const totalOut = history.filter(h => h.direction === 'OUT').reduce((s, h) => s + h.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Balance + Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatBox icon={Coins} label="BALANCE" value={`${fmtAuec(currentBalance)} aUEC`} color="#C8A84B" />
        <StatBox icon={TrendingUp} label="EARNED" value={`${fmtAuec(totalIn)} aUEC`} color="#2edb7a" />
        <StatBox icon={TrendingDown} label="CONTRIBUTED" value={`${fmtAuec(totalOut)} aUEC`} color="#7AAECC" />
      </div>

      {/* Update balance */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '12px 14px',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>UPDATE WALLET BALANCE</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="nexus-input"
            type="number"
            value={newBalance}
            onChange={e => setNewBalance(e.target.value)}
            style={{ flex: 1, fontSize: 14, fontWeight: 600 }}
          />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
          }}>aUEC</span>
          <button
            onClick={handleSave}
            disabled={saving || parseInt(newBalance) === currentBalance}
            className="nexus-btn primary"
            style={{
              padding: '7px 14px', fontSize: 10,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Save size={10} />
            {saved ? 'SAVED ✓' : saving ? 'SAVING...' : 'UPDATE'}
          </button>
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', marginTop: 6,
        }}>Manually sync your in-game wallet balance for org tracking.</div>
      </div>

      {/* Transaction history */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '12px 14px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        }}>
          <History size={10} style={{ color: '#5A5850' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>RECENT ACTIVITY</span>
        </div>

        {history.length === 0 ? (
          <div style={{
            padding: '16px 0', textAlign: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
          }}>No recorded activity yet.</div>
        ) : (
          history.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: item.direction === 'IN' ? '#2edb7a' : '#C0392B', flexShrink: 0,
              }} />
              <span style={{
                flex: 1, fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, color: '#E8E4DC',
              }}>{item.label}</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                color: item.direction === 'IN' ? '#2edb7a' : '#C0392B',
                fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              }}>
                {item.direction === 'IN' ? '+' : '-'}{fmtAuec(item.amount)}
              </span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
              }}>{item.date ? new Date(item.date).toLocaleDateString() : '—'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}