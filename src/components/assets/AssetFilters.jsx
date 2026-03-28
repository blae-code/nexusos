import React from 'react';
import { Search } from 'lucide-react';

const TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'SHIP', label: 'Ships' },
  { value: 'VEHICLE', label: 'Vehicles' },
  { value: 'FPS_WEAPON', label: 'FPS Weapons' },
  { value: 'FPS_ARMOR', label: 'FPS Armor' },
  { value: 'SHIP_COMPONENT', label: 'Ship Components' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'OTHER', label: 'Other' },
];
const STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'STORED', label: 'Stored' },
  { value: 'DEPLOYED', label: 'Deployed' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOANED', label: 'Loaned' },
  { value: 'MISSING', label: 'Missing' },
];

const sel = {
  padding: '8px 10px', background: '#141410',
  border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
  color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 11, letterSpacing: '0.06em', outline: 'none', minWidth: 120,
};

export default function AssetFilters({ search, onSearch, typeFilter, onTypeFilter, statusFilter, onStatusFilter, ownerFilter, onOwnerFilter, members }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: 9, color: '#5A5850' }} />
        <input
          type="text" placeholder="Search assets..."
          value={search} onChange={e => onSearch(e.target.value)}
          style={{
            ...sel, width: '100%', paddingLeft: 30,
          }}
        />
      </div>
      <select style={sel} value={typeFilter} onChange={e => onTypeFilter(e.target.value)}>
        {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <select style={sel} value={statusFilter} onChange={e => onStatusFilter(e.target.value)}>
        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select style={sel} value={ownerFilter} onChange={e => onOwnerFilter(e.target.value)}>
        <option value="ALL">All Owners</option>
        <option value="UNASSIGNED">Unassigned</option>
        {members.map(m => (
          <option key={m.id} value={m.callsign || m.login_name}>{m.callsign || m.login_name}</option>
        ))}
      </select>
    </div>
  );
}