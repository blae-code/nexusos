import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { RotateCcw } from 'lucide-react';
import ArmoryCheckoutForm from '@/components/armory/ArmoryCheckoutForm';
import ArmoryStockPanel from '@/components/armory/ArmoryStockPanel';
import { VaultWheel } from '@/core/design/Illustrations';
import NexusToken from '@/core/design/NexusToken';
import { armoryItemToken } from '@/core/data/tokenMap';

export default function Armory() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const { callsign, sessionUserId } = outletContext;

  const [items, setItems] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState('checkout');

  const load = useCallback(async () => {
    try {
      const [itemsData, checkoutData] = await Promise.all([
        base44.entities.ArmoryItem.list('-quantity', 100),
        base44.entities.ArmoryCheckout.filter({ status: 'CHECKED_OUT' }),
      ]);
      setItems(itemsData || []);
      setCheckouts(checkoutData || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsubItems = base44.entities.ArmoryItem.subscribe(load);
    const unsubCheckouts = base44.entities.ArmoryCheckout.subscribe(load);
    return () => {
      unsubItems();
      unsubCheckouts();
    };
  }, [load]);

  const activeCheckouts = checkouts.filter((checkout) => checkout.status === 'CHECKED_OUT');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--danger)' }}>Failed to load armory — check your connection.</span>
        <button onClick={load} className="nexus-btn" style={{ padding: '6px 16px', fontSize: 10 }}>RETRY</button>
      </div>
    );
  }

  const tabs = [
    { id: 'checkout', label: 'CHECKOUT' },
    { id: 'activity', label: 'ACTIVITY' },
    { id: 'stock', label: 'STOCK' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'pageEntrance 200ms ease-out' }}>
      <div style={{ padding: '16px 20px 0', background: '#0A0908', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <VaultWheel size={80} opacity={0.09} style={{ position: 'absolute', right: 16, top: -8, pointerEvents: 'none' }} />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          ARMORY
        </div>
        <div style={{ fontSize: 11, color: '#5A5850', lineHeight: 1.5, maxWidth: 760, marginBottom: 12 }}>
          Armory is now focused on checkout operations, circulation tracking, and fleet support. Shared gear registration and stock editing live in Industry inventory.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, padding: '0 20px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #C0392B' : '2px solid transparent',
              color: activeTab === tab.id ? '#E8E4DC' : '#5A5850',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              transition: 'color 150ms',
            }}
            onMouseEnter={(event) => {
              if (activeTab !== tab.id) event.currentTarget.style.color = '#9A9488';
            }}
            onMouseLeave={(event) => {
              if (activeTab !== tab.id) event.currentTarget.style.color = '#5A5850';
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {activeTab === 'checkout' && (
          <>
            <ArmoryCheckoutForm items={items} callsign={callsign} sessionUserId={sessionUserId} onCheckoutComplete={load} />
            {activeCheckouts.length > 0 && (
              <section style={{ marginTop: 20 }}>
                <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
                  ITEMS IN CIRCULATION
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeCheckouts.map((checkout) => {
                    const itemCategory = items.find((item) => item.id === checkout.item_id)?.category;
                    return (
                      <div key={checkout.id} style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {itemCategory && <NexusToken src={armoryItemToken(itemCategory)} size={20} alt={itemCategory} title={itemCategory} />}
                        <div>
                          <div style={{ color: '#E8E4DC', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
                            {checkout.item_name}
                          </div>
                          <div style={{ color: '#5A5850', fontSize: 9, marginTop: 2 }}>
                            {checkout.checked_out_by_callsign} · {checkout.quantity} checked out
                          </div>
                        </div>
                        <div style={{ flex: 1 }} />
                        <button
                          type="button"
                          onClick={async () => {
                            await base44.entities.ArmoryCheckout.update(checkout.id, {
                              status: 'RETURNED',
                              returned_at: new Date().toISOString(),
                              returned_quantity: checkout.quantity,
                            });
                            const item = items.find((entry) => entry.id === checkout.item_id);
                            if (item) {
                              await base44.entities.ArmoryItem.update(checkout.item_id, { quantity: item.quantity + checkout.quantity });
                            }
                            load();
                          }}
                          style={{ padding: '4px 10px', background: 'rgba(74,140,92,0.12)', border: '0.5px solid rgba(74,140,92,0.3)', borderRadius: 2, color: '#4A8C5C', fontSize: 9, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                        >
                          <RotateCcw size={9} />
                          RETURN
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'activity' && (
          <section>
            <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
              CHECKOUT HISTORY
            </div>
            {checkouts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12 }}>
                <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em' }}>
                  NO CHECKOUT ACTIVITY
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...checkouts].reverse().map((checkout) => (
                  <div key={checkout.id} style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: '10px 12px' }}>
                    <div style={{ color: '#E8E4DC', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, marginBottom: 4 }}>
                      {checkout.item_name}
                    </div>
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

        {activeTab === 'stock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '10px 12px', background: 'rgba(122,174,204,0.08)', border: '0.5px solid rgba(122,174,204,0.18)', borderRadius: 2, color: '#7AAECC', fontSize: 10 }}>
              Stock is read-only here. Manage shared gear and components from{' '}
              <Link to="/app/industry?tab=inventory&inventoryScope=org&inventoryView=gear" style={{ color: '#E8E4DC', textDecoration: 'underline' }}>
                Industry → Inventory → Gear
              </Link>
              .
            </div>
            <ArmoryStockPanel
              readOnly
              title="ARMORY STOCK"
              description="Shared gear and ship components sourced from the same ArmoryItem records used by Industry inventory."
            />
          </div>
        )}
      </div>
    </div>
  );
}
