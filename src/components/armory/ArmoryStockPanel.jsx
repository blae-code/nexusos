import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { AlertCircle, Boxes, MapPin, Package, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

const ITEM_CATEGORIES = [
  { value: 'FPS', label: 'FPS GEAR' },
  { value: 'SHIP', label: 'SHIP COMPONENT' },
  { value: 'CONSUMABLE', label: 'CONSUMABLE' },
];

const RARITY_OPTIONS = [
  { value: 'COMMON', label: 'COMMON' },
  { value: 'UNCOMMON', label: 'UNCOMMON' },
  { value: 'RARE', label: 'RARE' },
  { value: 'VERY_RARE', label: 'VERY RARE' },
];

const CATEGORY_COLORS = {
  FPS: '#C0392B',
  SHIP: '#C8A84B',
  CONSUMABLE: '#4A8C5C',
};

const RARITY_COLORS = {
  COMMON: '#9A9488',
  UNCOMMON: '#4A8C5C',
  RARE: '#7AAECC',
  VERY_RARE: '#C8A84B',
};

function StockCard({ item, readOnly, onDelete }) {
  const categoryColor = CATEGORY_COLORS[item.category] || '#5A5850';
  const rarityColor = RARITY_COLORS[item.rarity] || '#9A9488';
  const isLowStock = Number(item.min_threshold || 0) > 0 && Number(item.quantity || 0) <= Number(item.min_threshold || 0);

  return (
    <div
      style={{
        background: '#11110E',
        border: `0.5px solid ${isLowStock ? 'rgba(192,57,43,0.26)' : 'rgba(200,170,100,0.10)'}`,
        borderLeft: `2px solid ${categoryColor}`,
        borderRadius: 2,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: '#E8E4DC',
              letterSpacing: '0.04em',
            }}
          >
            {item.item_name}
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 2,
              background: `${categoryColor}15`,
              border: `0.5px solid ${categoryColor}40`,
              color: categoryColor,
              letterSpacing: '0.08em',
            }}
          >
            {item.category || 'OTHER'}
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 2,
              background: `${rarityColor}15`,
              border: `0.5px solid ${rarityColor}35`,
              color: rarityColor,
              letterSpacing: '0.08em',
            }}
          >
            {item.rarity || 'COMMON'}
          </span>
          {isLowStock && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 2,
                background: 'rgba(192,57,43,0.10)',
                border: '0.5px solid rgba(192,57,43,0.25)',
                color: '#C0392B',
                letterSpacing: '0.08em',
              }}
            >
              LOW STOCK
            </span>
          )}
        </div>

        {item.description && (
          <div style={{ fontSize: 10, color: '#9A9488', marginBottom: 6 }}>
            {item.description}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#C8A84B', fontVariantNumeric: 'tabular-nums' }}>
            Qty {Number(item.quantity || 0)}
          </span>
          {item.location && (
            <span style={{ fontSize: 10, color: '#5A5850' }}>
              <MapPin size={10} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              {item.location}
            </span>
          )}
        </div>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          title="Delete item"
          style={{
            background: 'none',
            border: 'none',
            color: '#5A5850',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

export default function ArmoryStockPanel({
  readOnly = false,
  title = 'SHARED GEAR & COMPONENTS',
  description = 'Track shared gear and ship components by vessel or storage location.',
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'SHIP',
    location: '',
    description: '',
    quantity: '1',
    rarity: 'COMMON',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [armoryItems, orgShips] = await Promise.all([
        base44.entities.ArmoryItem.list('-last_restocked_at', 300).catch(() => []),
        base44.entities.OrgShip.list('name', 200).catch(() => []),
      ]);

      const knownLocations = new Set(
        [
          ...(orgShips || []).map((ship) => ship.name),
          ...(armoryItems || []).map((item) => item.location),
          'Storage',
        ].filter(Boolean)
      );

      setItems(armoryItems || []);
      setLocations([...knownLocations].sort((a, b) => a.localeCompare(b)));
    } catch (err) {
      setError(err.message || 'Failed to load armory stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const unsub = base44.entities.ArmoryItem.subscribe(loadData);
    return () => unsub?.();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesLocation = filterLocation === 'all' || (item.location || 'Unassigned Storage') === filterLocation;
      if (!matchesLocation) return false;
      if (!query) return true;
      const haystack = [
        item.item_name,
        item.category,
        item.description,
        item.location,
        item.rarity,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filterLocation, items, searchQuery]);

  const locationGroups = useMemo(() => {
    const grouped = filteredItems.reduce((acc, item) => {
      const key = item.location || 'Unassigned Storage';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([location, groupItems]) => ({
        location,
        items: [...groupItems].sort((a, b) => {
          return (a.category || '').localeCompare(b.category || '') || (a.item_name || '').localeCompare(b.item_name || '');
        }),
      }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }, [filteredItems]);

  const handleAddItem = async (event) => {
    event.preventDefault();
    try {
      await base44.entities.ArmoryItem.create({
        item_name: formData.item_name.trim(),
        category: formData.category,
        quantity: parseInt(formData.quantity, 10) || 1,
        description: formData.description.trim(),
        location: formData.location.trim(),
        rarity: formData.rarity,
        last_restocked_at: new Date().toISOString(),
      });

      setFormData({
        item_name: '',
        category: 'SHIP',
        location: '',
        description: '',
        quantity: '1',
        rarity: 'COMMON',
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to add armory item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this armory item?')) return;
    try {
      await base44.entities.ArmoryItem.delete(itemId);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete armory item');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: '#E8E4DC',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 10, color: '#5A5850', marginTop: 4, maxWidth: 760 }}>
            {description}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '7px 12px',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: 2,
              color: '#9A9488',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              letterSpacing: '0.08em',
            }}
          >
            <RefreshCw size={11} />
            REFRESH
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowForm((open) => !open)}
              style={{
                padding: '7px 12px',
                background: showForm ? 'rgba(192,57,43,0.10)' : '#C0392B',
                border: showForm ? '0.5px solid rgba(192,57,43,0.24)' : 'none',
                borderRadius: 2,
                color: showForm ? '#C0392B' : '#E8E4DC',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              <Plus size={11} />
              {showForm ? 'CANCEL' : 'REGISTER ITEM'}
            </button>
          )}
        </div>
      </div>

      {!readOnly && showForm && (
        <form
          onSubmit={handleAddItem}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 0.9fr 1fr 0.7fr 0.8fr',
            gap: 10,
            background: '#10100D',
            border: '0.5px solid rgba(200,170,100,0.12)',
            borderRadius: 2,
            padding: '12px 14px',
          }}
        >
          <input
            className="nexus-input"
            value={formData.item_name}
            onChange={(event) => setFormData((current) => ({ ...current, item_name: event.target.value }))}
            placeholder="Item or component name"
            required
            style={{ fontSize: 10 }}
          />
          <select
            className="nexus-input"
            value={formData.category}
            onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
            style={{ fontSize: 10 }}
          >
            {ITEM_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <input
            className="nexus-input"
            value={formData.location}
            onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))}
            placeholder="Ship or storage location"
            list="armory-stock-locations"
            required
            style={{ fontSize: 10 }}
          />
          <input
            className="nexus-input"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(event) => setFormData((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="Qty"
            style={{ fontSize: 10 }}
          />
          <select
            className="nexus-input"
            value={formData.rarity}
            onChange={(event) => setFormData((current) => ({ ...current, rarity: event.target.value }))}
            style={{ fontSize: 10 }}
          >
            {RARITY_OPTIONS.map((rarity) => (
              <option key={rarity.value} value={rarity.value}>
                {rarity.label}
              </option>
            ))}
          </select>
          <textarea
            className="nexus-input"
            value={formData.description}
            onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
            placeholder="Notes, fitment, or handling details"
            style={{ gridColumn: '1 / 5', minHeight: 42, resize: 'vertical', fontSize: 10 }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 12px',
              background: '#C0392B',
              border: 'none',
              borderRadius: 2,
              color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            SAVE ITEM
          </button>
          <datalist id="armory-stock-locations">
            {locations.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </form>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220 }}>
          <Search
            size={11}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }}
          />
          <input
            className="nexus-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search shared gear, components, locations..."
            style={{ width: '100%', paddingLeft: 26, fontSize: 10 }}
          />
        </div>
        <select
          className="nexus-input"
          value={filterLocation}
          onChange={(event) => setFilterLocation(event.target.value)}
          style={{ width: 220, fontSize: 10 }}
        >
          <option value="all">ALL LOCATIONS</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(192,57,43,0.08)',
            border: '0.5px solid rgba(192,57,43,0.18)',
            borderRadius: 2,
            color: '#C0392B',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {locationGroups.length === 0 ? (
        <div
          style={{
            padding: '70px 20px',
            textAlign: 'center',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            color: '#5A5850',
          }}
        >
          <Boxes size={28} style={{ opacity: 0.16, marginBottom: 8 }} />
          <div>{searchQuery || filterLocation !== 'all' ? 'No armory stock matches this filter' : 'No armory stock recorded yet'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {locationGroups.map((group) => (
            <div
              key={group.location}
              style={{
                background: '#0F0F0D',
                border: '0.5px solid rgba(200,170,100,0.10)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '9px 12px',
                  background: 'rgba(200,170,100,0.05)',
                  borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={11} style={{ color: '#C8A84B' }} />
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#E8E4DC',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {group.location}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#9A9488' }}>
                  {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div
                style={{
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 10,
                }}
              >
                {group.items.map((item) => (
                  <StockCard key={item.id} item={item} readOnly={readOnly} onDelete={handleDeleteItem} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(122,174,204,0.06)',
            border: '0.5px solid rgba(122,174,204,0.16)',
            borderRadius: 2,
            color: '#7AAECC',
            fontSize: 10,
          }}
        >
          <Package size={11} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
          Gear edits here write directly to the shared <code>ArmoryItem</code> records used by Armory checkout.
        </div>
      )}
    </div>
  );
}
