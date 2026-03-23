import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Plus, Search, MapPin, Package, AlertCircle, Trash2 } from 'lucide-react';

const COMPONENT_TYPES = [
  { value: 'weapon', label: 'Weapon System' },
  { value: 'shield', label: 'Shield Generator' },
  { value: 'engine', label: 'Engine' },
  { value: 'cooler', label: 'Cooler' },
  { value: 'power_plant', label: 'Power Plant' },
  { value: 'armor_set', label: 'Armor Set' },
  { value: 'gps', label: 'GPS Unit' },
  { value: 'scanner', label: 'Scanner' },
  { value: 'other', label: 'Other Component' },
];

export default function InventoryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVessel, setFilterVessel] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [vessels, setVessels] = useState([]);
  const [formData, setFormData] = useState({
    item_name: '',
    component_type: 'weapon',
    vessel_location: '',
    description: '',
    quantity: '1',
    condition: 'operational',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load armory items
      const armoryItems = await base44.entities.ArmoryItem.list('-last_restocked_at', 200);
      
      // Load fleet vessels
      const fleetRes = await base44.functions.invoke('fleetyardsSync', { action: 'ships' });
      const shipList = (Array.isArray(fleetRes?.data?.ships) ? fleetRes.data.ships : []).map(s => s.name || s.label);
      
      setItems(armoryItems || []);
      setVessels(shipList);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
      console.error('[InventoryManager]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.ArmoryItem.create({
        item_name: formData.item_name,
        category: 'SHIP',
        quantity: parseInt(formData.quantity) || 1,
        description: formData.description,
        location: formData.vessel_location,
        rarity: formData.condition === 'operational' ? 'COMMON' : 'RARE',
      });

      setFormData({
        item_name: '',
        component_type: 'weapon',
        vessel_location: '',
        description: '',
        quantity: '1',
        condition: 'operational',
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this component?')) return;
    try {
      await base44.entities.ArmoryItem.delete(itemId);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete item');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVessel = filterVessel === 'all' || item.location === filterVessel;
    return matchesSearch && matchesVessel;
  });

  const vesselGroups = {};
  filteredItems.forEach((item) => {
    const vessel = item.location || 'Unknown Location';
    if (!vesselGroups[vessel]) {
      vesselGroups[vessel] = [];
    }
    vesselGroups[vessel].push(item);
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--bg1)',
          borderBottom: '0.5px solid var(--b1)',
          padding: '16px',
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>Inventory Manager</div>
              <div style={{ color: 'var(--t2)', fontSize: 11, marginTop: 2 }}>
                Track ship components and armor sets across fleet vessels
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '8px 14px',
                background: 'var(--live)',
                border: 'none',
                borderRadius: 3,
                color: 'var(--bg0)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} />
              Register Component
            </button>
          </div>

          {/* Add Form */}
          {showForm && (
            <div
              style={{
                background: 'var(--bg2)',
                border: '0.5px solid var(--b1)',
                borderRadius: 3,
                padding: '12px',
                marginTop: 12,
              }}
            >
              <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Component name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  required
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg1)',
                    border: '0.5px solid var(--b0)',
                    borderRadius: 3,
                    color: 'var(--t1)',
                    fontSize: 10,
                    fontFamily: 'inherit',
                    }}
                    />
                    <select
                    value={formData.component_type}
                  onChange={(e) => setFormData({ ...formData, component_type: e.target.value })}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg1)',
                    border: '0.5px solid var(--b0)',
                    borderRadius: 3,
                    color: 'var(--t1)',
                    fontSize: 10,
                    fontFamily: 'inherit',
                  }}
                >
                  {COMPONENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.vessel_location}
                  onChange={(e) => setFormData({ ...formData, vessel_location: e.target.value })}
                  required
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg1)',
                    border: '0.5px solid var(--b0)',
                    borderRadius: 3,
                    color: 'var(--t1)',
                    fontSize: 10,
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="">Select vessel</option>
                  {vessels.map((vessel) => (
                    <option key={vessel} value={vessel}>
                      {vessel}
                    </option>
                  ))}
                  <option value="Storage">Storage</option>
                </select>
                <input
                  type="number"
                  placeholder="Qty"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="1"
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg1)',
                    border: '0.5px solid var(--b0)',
                    borderRadius: 3,
                    color: 'var(--t1)',
                    fontSize: 10,
                    fontFamily: 'inherit',
                    }}
                    />
                    <textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg1)',
                    border: '0.5px solid var(--b0)',
                    borderRadius: 3,
                    color: 'var(--t1)',
                    fontSize: 10,
                    fontFamily: 'inherit',
                    gridColumn: '1 / 3',
                    minHeight: 40,
                    resize: 'vertical',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 14px',
                    background: 'var(--live)',
                    border: 'none',
                    borderRadius: 3,
                    color: 'var(--bg0)',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    }}
                    >
                    Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg1)',
                    border: '0.5px solid var(--b1)',
                    borderRadius: 3,
                    color: 'var(--t1)',
                    fontSize: 10,
                    cursor: 'pointer',
                    }}
                    >
                    Cancel
                </button>
              </form>
            </div>
          )}

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: 'var(--t2)' }} />
              <input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b0)',
                  borderRadius: 3,
                  color: 'var(--t1)',
                  fontSize: 10,
                  fontFamily: 'inherit',
                  }}
                  />
                  </div>
                  <select
                  value={filterVessel}
              onChange={(e) => setFilterVessel(e.target.value)}
              style={{
                padding: '8px 10px',
                background: 'var(--bg2)',
                border: '0.5px solid var(--b0)',
                borderRadius: 3,
                color: 'var(--t1)',
                fontSize: 10,
                fontFamily: 'inherit',
                minWidth: 140,
              }}
            >
              <option value="all">All Locations</option>
              {vessels.map((vessel) => (
                <option key={vessel} value={vessel}>
                  {vessel}
                </option>
              ))}
              <option value="Storage">Storage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            margin: '12px 16px 0',
            padding: '10px 12px',
            background: 'rgba(var(--danger-rgb), 0.1)',
            border: '0.5px solid rgba(var(--danger-rgb), 0.2)',
            borderRadius: 3,
            color: 'var(--danger)',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {Object.entries(vesselGroups).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--t2)', paddingTop: 60 }}>
              <Package size={32} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div>No components registered yet</div>
            </div>
          ) : (
            Object.entries(vesselGroups).map(([vessel, vesselItems]) => (
              <div key={vessel} style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    padding: '8px 12px',
                    background: 'var(--bg2)',
                    borderRadius: 3,
                  }}
                >
                  <MapPin size={14} style={{ color: 'var(--live)' }} />
                  <span style={{ color: 'var(--t0)', fontWeight: 600, fontSize: 12 }}>
                    {vessel}
                  </span>
                  <span style={{ color: 'var(--t2)', fontSize: 10, marginLeft: 'auto' }}>
                    {vesselItems.length} component{vesselItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {vesselItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--bg1)',
                        border: '0.5px solid var(--b1)',
                        borderRadius: 3,
                        padding: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>
                            {item.item_name}
                          </div>
                          <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                            {item.description || 'No description'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Delete component"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--t2)' }}>
                        <span>
                          Qty: <span style={{ color: 'var(--acc)' }}>{item.quantity}</span>
                        </span>
                        <span>
                          Status: <span style={{ color: 'var(--live)' }}>{item.rarity}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
