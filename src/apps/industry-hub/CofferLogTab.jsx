import React, { useMemo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const ENTRY_COLOURS = {
  SALE:        { color: 'var(--live)',  icon: ArrowUp },
  CRAFT_SALE:  { color: 'var(--live)',  icon: ArrowUp },
  OP_SPLIT:    { color: 'var(--info)',  icon: ArrowUp },
  EXPENSE:     { color: 'var(--danger)', icon: ArrowDown },
  DEPOSIT:     { color: 'var(--live)',  icon: ArrowUp },
};

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CofferLogTab({ logs }) {
  const { total, entries } = useMemo(() => {
    const t = (logs || []).reduce((sum, log) => {
      if (['SALE', 'CRAFT_SALE', 'OP_SPLIT', 'DEPOSIT'].includes(log.entry_type)) {
        return sum + (log.amount_aUEC || 0);
      } else if (log.entry_type === 'EXPENSE') {
        return sum - (log.amount_aUEC || 0);
      }
      return sum;
    }, 0);
    return { total: t, entries: logs || [] };
  }, [logs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Summary */}
      <div style={{ padding: '16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}>
        <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>
          TOTAL BALANCE
        </div>
        <div style={{ color: total >= 0 ? 'var(--live)' : 'var(--danger)', fontSize: 18, fontWeight: 500, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
          {total.toLocaleString()} aUEC
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)', position: 'sticky', top: 0 }}>
              {['Type', 'Amount aUEC', 'Commodity', 'Quantity SCU', 'Station', 'Logged By', 'Logged At'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: 'var(--t2)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                    borderBottom: '0.5px solid var(--b1)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const typeInfo = ENTRY_COLOURS[entry.entry_type] || ENTRY_COLOURS.DEPOSIT;
              const Icon = typeInfo.icon;
              const isIncome = ['SALE', 'CRAFT_SALE', 'OP_SPLIT', 'DEPOSIT'].includes(entry.entry_type);
              
              return (
                <tr key={entry.id} style={{ borderBottom: '0.5px solid var(--b0)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={11} style={{ color: typeInfo.color }} />
                      <span style={{ color: 'var(--t1)', fontSize: 10 }}>
                        {entry.entry_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td style={{
                    padding: '8px 12px',
                    color: isIncome ? 'var(--live)' : 'var(--danger)',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {isIncome ? '+' : '−'}{(entry.amount_aUEC || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>
                    {entry.commodity || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
                    {entry.quantity_scu ? entry.quantity_scu.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>
                    {entry.station || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>
                    {entry.logged_by_callsign || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t2)', fontSize: 9, fontFamily: 'monospace' }}>
                    {relativeTime(entry.logged_at)}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)' }}>
                  No transactions logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}