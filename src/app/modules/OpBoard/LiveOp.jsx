/**
 * LiveOp — stub placeholder for /app/ops/:id
 * Full live op view to be built in a subsequent session.
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function LiveOp() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        padding: '12px 16px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)',
      }}>
        <button
          onClick={() => navigate('/app/ops')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 4 }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>OP</span>
        <span style={{ color: 'var(--t3)', fontSize: 10 }}>/</span>
        <span style={{ color: 'var(--t0)', fontSize: 11, fontFamily: 'inherit', letterSpacing: '0.06em' }}>
          {id}
        </span>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '0.5px solid var(--b2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--b3)' }} />
        </div>
        <span style={{ color: 'var(--t2)', fontSize: 12, letterSpacing: '0.08em' }}>
          LIVE OP VIEW — COMING SOON
        </span>
        <span style={{ color: 'var(--t3)', fontSize: 10, fontFamily: 'inherit' }}>
          {id}
        </span>
        <button
          onClick={() => navigate('/app/ops')}
          className="nexus-btn"
          style={{ marginTop: 8, padding: '6px 16px', fontSize: 10 }}
        >
          ← BACK TO OPS
        </button>
      </div>
    </div>
  );
}
