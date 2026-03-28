/**
 * OpTimelineStep — Phase pipeline as horizontal node graph with connecting lines.
 */
import React, { useState } from 'react';

function PhaseNode({ phase, index, total, isEditing, onEdit, onUpdate, onRemove, onDone }) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const progress = total > 1 ? index / (total - 1) : 0;

  // Gradient from blue (start) to green (end)
  const r = Math.round(122 - progress * 48);
  const g = Math.round(174 - progress * 34);
  const b = Math.round(204 - progress * 112);
  const nodeColor = `rgb(${r},${g},${b})`;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      minWidth: 100, flex: 1,
      opacity: 0,
      animation: `nexus-fade-in 250ms ease-out both ${index * 80}ms`,
    }}>
      {/* Node */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `${nodeColor}18`,
        border: `2px solid ${nodeColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: nodeColor,
        fontFamily: "'Barlow Condensed', sans-serif",
        boxShadow: `0 0 12px ${nodeColor}33`,
        cursor: 'pointer', transition: 'all 200ms',
        position: 'relative',
      }}
      onClick={() => onEdit(index)}
      >
        {index + 1}
      </div>

      {/* Phase name */}
      {isEditing ? (
        <input
          className="nexus-input"
          autoFocus
          value={phase}
          onChange={e => onUpdate(index, e.target.value)}
          onBlur={onDone}
          onKeyDown={e => { if (e.key === 'Enter') onDone(); }}
          style={{
            width: 110, textAlign: 'center',
            fontSize: 10, padding: '4px 6px',
            background: '#141410',
            border: `1px solid ${nodeColor}44`,
            borderRadius: 2,
          }}
        />
      ) : (
        <div
          onClick={() => onEdit(index)}
          style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#9A9488', letterSpacing: '0.06em',
            textAlign: 'center', cursor: 'pointer',
            maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E4DC'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9A9488'; }}
        >
          {phase || 'Unnamed'}
        </div>
      )}

      {/* Remove button */}
      {total > 1 && (
        <button type="button" onClick={() => onRemove(index)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#3A3830', fontSize: 10, padding: 0,
          transition: 'color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#C0392B'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#3A3830'; }}
        >remove</button>
      )}
    </div>
  );
}

export default function OpTimelineStep({ phases, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null);

  const update = (i, val) => {
    const next = [...phases];
    next[i] = val;
    onChange(next);
  };
  const remove = (i) => {
    onChange(phases.filter((_, idx) => idx !== i));
    setEditingIndex(null);
  };
  const add = () => onChange([...phases, '']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>MISSION TIMELINE — {phases.length} PHASES</div>

      {/* Horizontal pipeline */}
      <div style={{
        position: 'relative', padding: '20px 0',
        overflowX: 'auto', overflowY: 'visible',
      }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute', top: 35, left: 50, right: 50,
          height: 2,
          background: 'linear-gradient(90deg, #7AAECC33, #4A8C5C33)',
          zIndex: 0,
        }} />

        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 0,
          position: 'relative', zIndex: 1,
          minWidth: phases.length * 120,
        }}>
          {phases.map((phase, i) => (
            <PhaseNode
              key={i}
              phase={phase}
              index={i}
              total={phases.length}
              isEditing={editingIndex === i}
              onEdit={setEditingIndex}
              onUpdate={update}
              onRemove={remove}
              onDone={() => setEditingIndex(null)}
            />
          ))}
        </div>
      </div>

      <button type="button" onClick={add} style={{
        width: '100%', padding: '12px 0',
        background: 'transparent', cursor: 'pointer',
        border: '1px dashed rgba(200,170,100,0.12)',
        borderRadius: 3,
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
        fontSize: 11, color: '#5A5850', letterSpacing: '0.12em',
        textTransform: 'uppercase',
        transition: 'border-color 200ms, color 200ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.30)'; e.currentTarget.style.color = '#9A9488'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.12)'; e.currentTarget.style.color = '#5A5850'; }}
      >+ ADD PHASE</button>

      <div style={{ fontSize: 9, color: '#3A3830' }}>
        Click a phase name to edit. Phases run sequentially during live ops.
      </div>
    </div>
  );
}