/**
 * ArmoryWidgets — ArmoryItemCard and CategorySection sub-components for Armory.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const CATEGORY_COLORS = {
  FPS: 'var(--info)',
  SHIP: 'var(--warn)',
  CONSUMABLE: 'var(--live)',
};

const RARITY_COLORS = {
  COMMON: 'var(--t2)',
  UNCOMMON: 'var(--live)',
  RARE: 'var(--info)',
  VERY_RARE: 'var(--warn)',
};

export function ArmoryItemCard({ item, onReturn }) {
  const isLowStock = item.quantity <= item.min_threshold;

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: `0.5px solid ${isLowStock ? 'rgba(232,160,32,0.4)' : 'var(--b0)'}`,
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        transition: 'all 0.12s',
      }}
    >
      {/* Stock indicator */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'var(--bg3)',
          border: `0.5px solid ${isLowStock ? 'rgba(232,160,32,0.4)' : 'var(--b2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isLowStock ? 'var(--warn)' : 'var(--t1)',
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
        }}
      >
        {item.quantity}
      </div>

      {/* Item info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500 }}>
            {item.item_name}
          </span>
          {isLowStock && <AlertTriangle size={10} style={{ color: 'var(--warn)', flexShrink: 0 }} />}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 8,
              padding: '1px 5px',
              background: CATEGORY_COLORS[item.category] + '20',
              border: `0.5px solid ${CATEGORY_COLORS[item.category]}40`,
              borderRadius: 3,
              color: CATEGORY_COLORS[item.category],
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {item.category}
          </span>
          {item.rarity !== 'COMMON' && (
            <span
              style={{
                fontSize: 8,
                padding: '1px 5px',
                background: RARITY_COLORS[item.rarity] + '20',
                border: `0.5px solid ${RARITY_COLORS[item.rarity]}40`,
                borderRadius: 3,
                color: RARITY_COLORS[item.rarity],
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {item.rarity}
            </span>
          )}
        </div>

        {item.description && (
          <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 4 }}>
            {item.description}
          </div>
        )}

        {item.location && (
          <div style={{ fontSize: 8, color: 'var(--t3)' }}>
            📍 {item.location}
          </div>
        )}
      </div>

      {/* Action */}
      {isLowStock && (
        <button
          onClick={() => onReturn?.(item)}
          style={{
            padding: '4px 8px',
            background: 'var(--warn-bg)',
            border: '0.5px solid var(--warn-b)',
            borderRadius: 4,
            color: 'var(--warn)',
            fontSize: 9,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          RESTOCK
        </button>
      )}
    </div>
  );
}

export function CategorySection({ title, items, onReturn }) {
  if (items.length === 0) return null;

  return (
    <section style={{ marginBottom: 20 }}>
      <div className="nexus-section-header">{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {items.map(item => (
          <ArmoryItemCard key={item.id} item={item} onReturn={onReturn} />
        ))}
      </div>
    </section>
  );
}
