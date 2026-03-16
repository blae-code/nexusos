import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = base44.entities.ArmoryItem.subscribe(event => {
      if (event.type === 'update' || event.type === 'create') {
        load();
      }
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
        <div className="nexus-loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '0 16px',
          borderBottom: '0.5px solid var(--b1)',
          background: 'var(--bg1)',
          flexShrink: 0,
        }}
      >
        {[
          { id: 'inventory', label: 'INVENTORY' },
          { id: 'checkout', label: 'CHECKOUT' },
          { id: 'activity', label: 'ACTIVITY' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--acc2)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
        <div className="nexus-fade-in" style={{ paddingTop: 12, paddingBottom: 20 }}>
          {activeTab === 'inventory' && (
            <>
              <CategorySection title="FPS WEAPONS & GEAR" items={fpsItems} onReturn={load} />
              <CategorySection title="SHIP COMPONENTS" items={shipItems} onReturn={load} />
              <CategorySection title="CONSUMABLES" items={consumableItems} onReturn={load} />
              {items.length === 0 && (
                <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
                  Armory is empty. Add items to get started.
                </div>
              )}
            </>
          )}

          {activeTab === 'checkout' && (
            <>
              <ArmoryCheckoutForm items={items} callsign={callsign} discordId={discordId} onCheckoutComplete={load} />
              {activeCheckouts.length > 0 && (
                <section style={{ marginTop: 20 }}>
                  <div className="nexus-section-header">ITEMS IN CIRCULATION</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {activeCheckouts.map(checkout => (
                      <div
                        key={checkout.id}
                        style={{
                          background: 'var(--bg1)',
                          border: '0.5px solid var(--b0)',
                          borderRadius: 6,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500 }}>
                            {checkout.item_name}
                          </div>
                          <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                            {checkout.checked_out_by_callsign} · {checkout.quantity} checked out
                          </div>
                        </div>
                        <div style={{ flex: 1 }} />
                        <button
                          onClick={async () => {
                            await base44.entities.ArmoryCheckout.update(checkout.id, {
                              status: 'RETURNED',
                              returned_at: new Date().toISOString(),
                              returned_quantity: checkout.quantity,
                            });
                            const item = items.find(i => i.id === checkout.item_id);
                            if (item) {
                              await base44.entities.ArmoryItem.update(checkout.item_id, {
                                quantity: item.quantity + checkout.quantity,
                              });
                            }
                            load();
                          }}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(39,201,106,0.12)',
                            border: '0.5px solid var(--live)',
                            borderRadius: 4,
                            color: 'var(--live)',
                            fontSize: 9,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
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
              <div className="nexus-section-header">CHECKOUT HISTORY</div>
              <div style={{ marginTop: 12 }}>
                {checkouts.length === 0 ? (
                  <div style={{ color: 'var(--t2)', fontSize: 12, paddingTop: 20 }}>
                    No checkout activity yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[...checkouts].reverse().map(checkout => (
                      <div
                        key={checkout.id}
                        style={{
                          background: 'var(--bg1)',
                          border: '0.5px solid var(--b0)',
                          borderRadius: 6,
                          padding: '10px 12px',
                          fontSize: 9,
                        }}
                      >
                        <div style={{ color: 'var(--t0)', fontWeight: 500, marginBottom: 4 }}>
                          {checkout.item_name}
                        </div>
                        <div style={{ display: 'flex', gap: 12, color: 'var(--t2)', fontSize: 8 }}>
                          <span>{checkout.checked_out_by_callsign}</span>
                          <span>{checkout.quantity}x</span>
                          <span>{checkout.status}</span>
                          {checkout.returned_at && <span>Returned {new Date(checkout.returned_at).toLocaleDateString()}</span>}
                        </div>
                        {checkout.notes && (
                          <div style={{ marginTop: 4, color: 'var(--t3)', fontStyle: 'italic' }}>
                            {checkout.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
