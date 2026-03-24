/**
 * SupplyChainBoard — Kanban-style real-time pipeline status.
 * Stages: Raw Materials → Refinery → Craft Queue → Finished Goods → Sold
 * Props: { materials, refineryOrders, craftQueue, cofferLogs }
 */
import React, { useMemo } from 'react';
import { Package, Flame, Wrench, ShoppingCart, DollarSign, ArrowRight } from 'lucide-react';

function fmtScu(n) { return n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1); }

function StageColumn({ icon: Icon, label, count, scu, color, items }) {
  return (
    <div style={{
      flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column',
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderTop: `2px solid ${color}`,
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon size={12} style={{ color }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          color, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
          flex: 1,
        }}>{label}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16,
          fontWeight: 700, color: '#E8E4DC', fontVariantNumeric: 'tabular-nums',
        }}>{count}</span>
      </div>

      {/* SCU summary */}
      {scu !== null && (
        <div style={{
          padding: '6px 14px', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          color: '#5A5850', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>VOLUME</span>
          <span style={{ color: '#9A9488', fontVariantNumeric: 'tabular-nums' }}>{fmtScu(scu)} SCU</span>
        </div>
      )}

      {/* Item list */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 280 }}>
        {items.length === 0 ? (
          <div style={{
            padding: '20px 14px', textAlign: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
          }}>EMPTY</div>
        ) : items.slice(0, 12).map((item, i) => (
          <div key={i} style={{
            padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '0.5px solid rgba(200,170,100,0.03)',
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', flex: 1, marginRight: 8,
            }}>{item.name}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#5A5850', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            }}>{item.detail}</span>
          </div>
        ))}
        {items.length > 12 && (
          <div style={{
            padding: '6px 14px', textAlign: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
          }}>+{items.length - 12} more</div>
        )}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 24, flexShrink: 0, color: '#5A5850',
    }}>
      <ArrowRight size={14} />
    </div>
  );
}

export default function SupplyChainBoard({ materials = [], refineryOrders = [], craftQueue = [], cofferLogs = [] }) {
  const stages = useMemo(() => {
    // Raw materials (not archived, not in refinery)
    const raw = materials.filter(m => !m.is_archived);
    const rawScu = raw.reduce((s, m) => s + (m.quantity_scu || 0), 0);

    // Active refinery orders
    const activeRef = refineryOrders.filter(r => r.status === 'ACTIVE');
    const readyRef = refineryOrders.filter(r => r.status === 'READY');
    const refScu = [...activeRef, ...readyRef].reduce((s, r) => s + (r.quantity_scu || 0), 0);

    // Craft queue items
    const activeCraft = craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status));
    const completedCraft = craftQueue.filter(c => c.status === 'COMPLETE');

    // Sales from coffer
    const salesLogs = cofferLogs.filter(c => c.entry_type === 'SALE' || c.entry_type === 'CRAFT_SALE');
    const salesTotal = salesLogs.reduce((s, c) => s + (c.amount_aUEC || 0), 0);

    return {
      raw: {
        count: raw.length, scu: rawScu,
        items: raw.slice(0, 15).map(m => ({
          name: m.material_name, detail: `${(m.quantity_scu || 0).toFixed(1)} SCU`,
        })),
      },
      refinery: {
        count: activeRef.length + readyRef.length, scu: refScu,
        items: [...activeRef, ...readyRef].map(r => ({
          name: r.material_name, detail: r.status === 'READY' ? 'READY' : 'ACTIVE',
        })),
      },
      craft: {
        count: activeCraft.length, scu: null,
        items: activeCraft.map(c => ({
          name: c.blueprint_name || 'Unknown', detail: c.status,
        })),
      },
      finished: {
        count: completedCraft.length, scu: null,
        items: completedCraft.slice(0, 15).map(c => ({
          name: c.blueprint_name || 'Unknown', detail: `×${c.quantity || 1}`,
        })),
      },
      sold: {
        count: salesLogs.length, scu: null,
        items: salesLogs.slice(0, 15).map(c => ({
          name: c.commodity || 'Sale', detail: `${(c.amount_aUEC || 0).toLocaleString()} aUEC`,
        })),
      },
    };
  }, [materials, refineryOrders, craftQueue, cofferLogs]);

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>SUPPLY CHAIN PIPELINE</div>

      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', overflow: 'auto' }}>
        <StageColumn icon={Package} label="RAW STOCK" count={stages.raw.count} scu={stages.raw.scu} color="#C8A84B" items={stages.raw.items} />
        <FlowArrow />
        <StageColumn icon={Flame} label="REFINERY" count={stages.refinery.count} scu={stages.refinery.scu} color="#C0392B" items={stages.refinery.items} />
        <FlowArrow />
        <StageColumn icon={Wrench} label="CRAFT QUEUE" count={stages.craft.count} scu={stages.craft.scu} color="#7AAECC" items={stages.craft.items} />
        <FlowArrow />
        <StageColumn icon={ShoppingCart} label="FINISHED" count={stages.finished.count} scu={stages.finished.scu} color="#2edb7a" items={stages.finished.items} />
        <FlowArrow />
        <StageColumn icon={DollarSign} label="SOLD" count={stages.sold.count} scu={stages.sold.scu} color="#D8BC70" items={stages.sold.items} />
      </div>
    </div>
  );
}