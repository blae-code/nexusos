import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import ArmoryCheckoutForm from '@/components/armory/ArmoryCheckoutForm';
import { RotateCcw } from 'lucide-react';
import { CategorySection } from './ArmoryWidgets';

export default function Armory() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const { callsign, discordId } = outletContext;

  const [items, setItems] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');

  const load = useCallback(async () => {
    try {
      const [itemsData, checkoutData] = await Promise.all([
        base44.entities.ArmoryItem.list('-quantity', 100),
        base44.entities.ArmoryCheckout.filter({ status: 'CHECKED_OUT' }),
      ]);
      setItems(itemsData || []);
      setCheckouts(checkoutData || []);
    } catch {
      // load failed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.ArmoryItem.subscribe(event => {
      if (event.type === 'update' || event.type === 'create') load();
    });
    return () => unsub();
  }, [load]);

  const fpsItems = items.filter(i => i.category === 'FPS');
  const shipItems = items.filter(i => i.category === 'SHIP');
  const consumableItems = items.filter(i => i.category === 'CONSUMABLE');
  const activeCheckouts = checkouts.filter(c => c.status === 'CHECKED_OUT');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  const TABS = [
    { id: 'inventory', label: 'INVENTORY' },
    { id: 'checkout', label: 'CHECKOUT' },
    { id: 'activity', label: 'ACTIVITY' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'pageEntrance 200ms ease-out' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', background: '#0A0908', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>ARMORY</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, padding: '0 20px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', background: 'transparent', border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #C0392B' : '2px solid transparent',
            color: activeTab === tab.id ? '#E8E4DC' : '#5A5850',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', transition: 'color 150ms',
          }}
          onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#9A9488'; }}
          onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#5A5850'; }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {activeTab === 'inventory' && (
          <>
            <CategorySection title="FPS WEAPONS & GEAR" items={fpsItems} onReturn={load} />
            <CategorySection title="SHIP COMPONENTS" items={shipItems} onReturn={load} />
            <CategorySection title="CONSUMABLES" items={consumableItems} onReturn={load} />
            {items.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 12 }}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.10 }}>
                  <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" />
                  <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" />
                  <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.6" />
                  <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
                </svg>
                <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em' }}>NO ITEMS IN ARMORY</span>
              </div>
            )}
          </>
        )}

        {activeTab === 'checkout' && (
          <>
            <ArmoryCheckoutForm items={items} callsign={callsign} discordId={discordId} onCheckoutComplete={load} />
            {activeCheckouts.length > 0 && (
              <section style={{ marginTop: 20 }}>
                <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>ITEMS IN CIRCULATION</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeCheckouts.map(checkout => (
                    <div key={checkout.id} style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ color: '#E8E4DC', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>{checkout.item_name}</div>
                        <div style={{ color: '#5A5850', fontSize: 9, marginTop: 2 }}>{checkout.checked_out_by_callsign} · {checkout.quantity} checked out</div>
                      </div>
                      <div style={{ flex: 1 }} />
                      <button onClick={async () => {
                        await base44.entities.ArmoryCheckout.update(checkout.id, { status: 'RETURNED', returned_at: new Date().toISOString(), returned_quantity: checkout.quantity });
                        const item = items.find(i => i.id === checkout.item_id);
                        if (item) await base44.entities.ArmoryItem.update(checkout.item_id, { quantity: item.quantity + checkout.quantity });
                        load();
                      }} style={{ padding: '4px 10px', background: 'rgba(74,140,92,0.12)', border: '0.5px solid rgba(74,140,92,0.3)', borderRadius: 2, color: '#4A8C5C', fontSize: 9, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <RotateCcw size={9} /> RETURN
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'activity' && (
          <section>
            <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>CHECKOUT HISTORY</div>
            {checkouts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12 }}>
                <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em' }}>NO CHECKOUT ACTIVITY</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...checkouts].reverse().map(checkout => (
                  <div key={checkout.id} style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: '10px 12px' }}>
                    <div style={{ color: '#E8E4DC', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, marginBottom: 4 }}>{checkout.item_name}</div>
                    <div style={{ display: 'flex', gap: 12, color: '#5A5850', fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif" }}>
                      <span>{checkout.checked_out_by_callsign}</span>
                      <span>{checkout.quantity}x</span>
                      <span>{checkout.status}</span>
                      {checkout.returned_at && <span>Returned {new Date(checkout.returned_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}