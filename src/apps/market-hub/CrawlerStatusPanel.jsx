/**
 * CrawlerStatusPanel — Shows sync status, last run, and manual trigger button.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, Check, AlertTriangle, Clock, Wifi, Database } from 'lucide-react';
import { showToast } from '@/components/NexusToast';

function timeSince(iso) {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

export default function CrawlerStatusPanel({ onSynced }) {
  const [syncs, setSyncs] = useState([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSyncs = useCallback(async () => {
    const data = await base44.entities.MarketSync.list('-synced_at', 5).catch(() => []);
    setSyncs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSyncs(); }, [loadSyncs]);

  const runCrawl = async () => {
    setRunning(true);
    showToast('Starting Stanton price crawl...', 'info', 3000);
    try {
      const res = await base44.functions.invoke('uexStantonCrawler', {});
      const data = res?.data || res;
      showToast(
        `Crawl complete: ${data.commodities_synced || 0} commodities, ${data.routes_synced || 0} routes, ${data.alerts_triggered || 0} alerts`,
        data.errors ? 'warning' : 'success'
      );
      await loadSyncs();
      if (onSynced) onSynced();
    } catch (err) {
      showToast(`Crawl failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  const latest = syncs[0];
  const statusColor = !latest ? '#5A5850' : latest.status === 'SUCCESS' ? '#4AE830' : latest.status === 'PARTIAL' ? '#C8A84B' : '#C0392B';
  const StatusIcon = !latest ? Clock : latest.status === 'SUCCESS' ? Check : AlertTriangle;

  return (
    <div style={{
      background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
      borderLeft: `2px solid ${statusColor}`, borderRadius: 2, padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wifi size={12} style={{ color: statusColor }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, color: '#E8E4DC', letterSpacing: '0.06em' }}>
            UEX STANTON CRAWLER
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
            color: statusColor, background: `${statusColor}15`, padding: '2px 6px', borderRadius: 2,
            border: `0.5px solid ${statusColor}30`, letterSpacing: '0.08em',
          }}>
            {latest ? latest.status : 'NO DATA'}
          </span>
        </div>
        <button onClick={runCrawl} disabled={running} style={{
          background: running ? '#141410' : 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)',
          border: running ? '0.5px solid rgba(200,170,100,0.12)' : '1px solid rgba(192,57,43,0.6)',
          borderRadius: 2, padding: '6px 14px', cursor: running ? 'not-allowed' : 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
          color: running ? '#5A5850' : '#F0EDE5', letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <RefreshCw size={10} style={{ animation: running ? 'spin 1s linear infinite' : 'none' }} />
          {running ? 'CRAWLING...' : 'RUN CRAWL NOW'}
        </button>
      </div>

      {/* Recent syncs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {loading ? (
          <span style={{ color: '#5A5850', fontSize: 10 }}>Loading...</span>
        ) : syncs.length === 0 ? (
          <span style={{ color: '#5A5850', fontSize: 10 }}>No sync history yet — run the crawler to populate market data.</span>
        ) : syncs.slice(0, 3).map((s, i) => {
          const sc = s.status === 'SUCCESS' ? '#4AE830' : s.status === 'PARTIAL' ? '#C8A84B' : '#C0392B';
          return (
            <div key={s.id || i} style={{
              flex: '1 1 160px', padding: '8px 10px',
              background: '#141410', borderRadius: 2, border: `0.5px solid rgba(200,170,100,0.06)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: sc }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: sc, fontWeight: 600 }}>{s.status}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', marginLeft: 'auto' }}>
                  {timeSince(s.synced_at)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Database size={8} style={{ color: '#5A5850' }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488' }}>
                  {s.records_synced || 0} records · {s.duration_ms || 0}ms
                </span>
              </div>
              {s.error_message && (
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#C0392B', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.error_message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850',
        marginTop: 8, letterSpacing: '0.06em',
      }}>
        AUTO-SYNC: Every 15 minutes · Prices + Routes + Alerts · Stanton system
      </div>
    </div>
  );
}