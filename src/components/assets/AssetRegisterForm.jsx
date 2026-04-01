import React, { useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { X } from 'lucide-react';
import SmartSelect from '@/components/sc/SmartSelect';
import SmartCombobox from '@/components/sc/SmartCombobox';
import { useSCReferenceOptions } from '@/core/data/useSCReferenceOptions';

/** @type {import('react').CSSProperties} */
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 12px',
  background: '#141410',
  border: '0.5px solid rgba(200,170,100,0.12)',
  borderRadius: 2,
  color: '#E8E4DC',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 12,
  letterSpacing: '0.06em',
  outline: 'none',
};

/** @type {import('react').CSSProperties} */
const labelStyle = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 9,
  color: '#5A5850',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  marginBottom: 4,
  display: 'block',
};

export default function AssetRegisterForm({ editAsset, members, ships, onClose, onSaved }) {
  const isEdit = Boolean(editAsset?.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    asset_name: '',
    asset_type: 'SHIP',
    model: '',
    manufacturer: '',
    serial_tag: '',
    status: 'STORED',
    condition: 'GOOD',
    assigned_to_callsign: '',
    assigned_to_id: '',
    location_system: '',
    location_detail: '',
    linked_ship_id: '',
    linked_ship_name: '',
    estimated_value_aUEC: '',
    quantity: '1',
    acquisition_source: 'PURCHASED',
    is_org_property: true,
    notes: '',
  });

  const { options: assetTypeOptions } = useSCReferenceOptions('asset-types', { currentValue: form.asset_type });
  const { options: statusOptions } = useSCReferenceOptions('asset-statuses', { currentValue: form.status });
  const { options: conditionOptions } = useSCReferenceOptions('asset-conditions', { currentValue: form.condition });
  const { options: sourceOptions } = useSCReferenceOptions('asset-sources', { currentValue: form.acquisition_source });
  const { options: systemOptions } = useSCReferenceOptions('systems', {
    currentValue: form.location_system,
    includeBlank: true,
    blankLabel: 'No System',
  });
  const { options: assetNameOptions } = useSCReferenceOptions('asset-names', {
    assetType: form.asset_type,
    currentValue: form.asset_name,
  });
  const { options: manufacturerOptions } = useSCReferenceOptions('manufacturers', {
    currentValue: form.manufacturer,
    ships,
  });
  const { options: locationOptions } = useSCReferenceOptions('locations', {
    system: form.location_system,
    currentValue: form.location_detail,
  });
  const { options: shipOptions } = useSCReferenceOptions('org-ships', {
    ships,
    currentValue: form.linked_ship_id,
    includeBlank: true,
    blankLabel: 'None',
  });

  useEffect(() => {
    if (!editAsset) return;
    setForm({
      asset_name: editAsset.asset_name || '',
      asset_type: editAsset.asset_type || 'SHIP',
      model: editAsset.model || '',
      manufacturer: editAsset.manufacturer || '',
      serial_tag: editAsset.serial_tag || '',
      status: editAsset.status || 'STORED',
      condition: editAsset.condition || 'GOOD',
      assigned_to_callsign: editAsset.assigned_to_callsign || '',
      assigned_to_id: editAsset.assigned_to_id || '',
      location_system: editAsset.location_system || '',
      location_detail: editAsset.location_detail || '',
      linked_ship_id: editAsset.linked_ship_id || '',
      linked_ship_name: editAsset.linked_ship_name || '',
      estimated_value_aUEC: editAsset.estimated_value_aUEC || '',
      quantity: editAsset.quantity || '1',
      acquisition_source: editAsset.acquisition_source || 'PURCHASED',
      is_org_property: editAsset.is_org_property !== false,
      notes: editAsset.notes || '',
    });
  }, [editAsset]);

  const handleMemberSelect = (callsign) => {
    const member = members.find((user) => (user.callsign || '').toUpperCase() === callsign.toUpperCase());
    setForm((current) => ({
      ...current,
      assigned_to_callsign: callsign,
      assigned_to_id: member?.id || '',
    }));
  };

  const handleShipSelect = (shipId) => {
    const ship = ships.find((entry) => entry.id === shipId);
    setForm((current) => ({
      ...current,
      linked_ship_id: shipId,
      linked_ship_name: ship ? `${ship.name} (${ship.model})` : '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.asset_name.trim()) return;

    setSaving(true);
    const payload = {
      ...form,
      estimated_value_aUEC: parseInt(form.estimated_value_aUEC, 10) || 0,
      quantity: parseInt(form.quantity, 10) || 1,
      acquired_at: isEdit ? (editAsset.acquired_at || new Date().toISOString()) : new Date().toISOString(),
    };

    if (isEdit) {
      await base44.entities.OrgAsset.update(editAsset.id, payload);
    } else {
      await base44.entities.OrgAsset.create(payload);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0A0908',
          border: '0.5px solid rgba(200,170,100,0.15)',
          borderLeft: '2px solid #7AAECC',
          borderRadius: 2,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isEdit ? 'Edit Asset' : 'Register Asset'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Asset Name *</label>
              <SmartCombobox
                value={form.asset_name}
                onChange={(nextValue, option) => {
                  setForm((current) => ({
                    ...current,
                    asset_name: nextValue,
                    manufacturer: current.manufacturer || option?.meta?.manufacturer || current.manufacturer,
                  }));
                }}
                options={assetNameOptions}
                theme="vehicle"
                storageKey="nexus-smart:asset:name"
                searchPlaceholder="Search live vehicles or items"
                placeholder="Select cache-backed asset name or type a custom label"
                allowCustom
                helperText="Live 4.7 cache merged with preserved legacy labels"
              />
            </div>

            <div>
              <label style={labelStyle}>Type *</label>
              <SmartSelect
                value={form.asset_type}
                onChange={(nextValue) => setForm((current) => ({ ...current, asset_type: nextValue }))}
                options={assetTypeOptions}
                theme="vehicle"
                storageKey="nexus-smart:asset:type"
                helperText="Domain-aware asset families"
              />
            </div>

            <div>
              <label style={labelStyle}>Model / Variant</label>
              <input
                style={inputStyle}
                value={form.model}
                placeholder="e.g. Cutlass Black"
                onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Manufacturer</label>
              <SmartCombobox
                value={form.manufacturer}
                onChange={(nextValue) => setForm((current) => ({ ...current, manufacturer: nextValue }))}
                options={manufacturerOptions}
                theme="vehicle"
                storageKey="nexus-smart:asset:manufacturer"
                searchPlaceholder="Search manufacturers"
                placeholder="RSI, Drake, Behring, Kastak Arms..."
                allowCustom
                helperText="Derived from live vehicle and item caches"
              />
            </div>

            <div>
              <label style={labelStyle}>Serial Tag</label>
              <input
                style={inputStyle}
                value={form.serial_tag}
                placeholder="e.g. RSN-SHP-042"
                onChange={(event) => setForm((current) => ({ ...current, serial_tag: event.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <SmartSelect
                value={form.status}
                onChange={(nextValue) => setForm((current) => ({ ...current, status: nextValue }))}
                options={statusOptions}
                theme="vehicle"
                storageKey="nexus-smart:asset:status"
              />
            </div>

            <div>
              <label style={labelStyle}>Condition</label>
              <SmartSelect
                value={form.condition}
                onChange={(nextValue) => setForm((current) => ({ ...current, condition: nextValue }))}
                options={conditionOptions}
                theme="vehicle"
                storageKey="nexus-smart:asset:condition"
              />
            </div>

            <div>
              <label style={labelStyle}>Assigned To</label>
              <select
                style={inputStyle}
                value={form.assigned_to_callsign}
                onChange={(event) => handleMemberSelect(event.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.callsign || member.login_name}>
                    {member.callsign || member.login_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>System</label>
              <SmartSelect
                value={form.location_system}
                onChange={(nextValue) => setForm((current) => ({ ...current, location_system: nextValue }))}
                options={systemOptions}
                theme="tactical"
                storageKey="nexus-smart:asset:system"
                helperText="Registry-aware system tagging"
              />
            </div>

            <div>
              <label style={labelStyle}>Location Detail</label>
              <SmartCombobox
                value={form.location_detail}
                onChange={(nextValue) => setForm((current) => ({ ...current, location_detail: nextValue }))}
                options={locationOptions}
                theme="tactical"
                storageKey="nexus-smart:asset:location"
                searchPlaceholder={`Search ${form.location_system || 'known'} locations`}
                placeholder="Hangar, moon, station, or custom detail"
                allowCustom
                helperText="Preserves historical locations like Port Olisar"
              />
            </div>

            <div>
              <label style={labelStyle}>Installed On Ship</label>
              <SmartCombobox
                value={form.linked_ship_id}
                onChange={(nextValue) => handleShipSelect(nextValue)}
                options={shipOptions}
                theme="vehicle"
                storageKey="nexus-smart:asset:ship"
                searchPlaceholder="Search org ships"
                placeholder="None"
                helperText="Entity-linked org ship roster"
              />
            </div>

            <div>
              <label style={labelStyle}>Estimated Value (aUEC)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                value={form.estimated_value_aUEC}
                onChange={(event) => setForm((current) => ({ ...current, estimated_value_aUEC: event.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Quantity</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Acquisition Source</label>
              <SmartSelect
                value={form.acquisition_source}
                onChange={(nextValue) => setForm((current) => ({ ...current, acquisition_source: nextValue }))}
                options={sourceOptions}
                theme="industrial"
                storageKey="nexus-smart:asset:source"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18 }}>
              <input
                type="checkbox"
                checked={form.is_org_property}
                onChange={(event) => setForm((current) => ({ ...current, is_org_property: event.target.checked }))}
                style={{ accentColor: '#7AAECC', width: 14, height: 14 }}
              />
              <label style={{ ...labelStyle, margin: 0 }}>Org Property</label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={form.notes}
                placeholder="Optional notes..."
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#141410',
                border: '0.5px solid rgba(200,170,100,0.12)',
                borderRadius: 2,
                color: '#9A9488',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.asset_name.trim()}
              style={{
                padding: '10px 24px',
                background: '#7AAECC',
                border: 'none',
                borderRadius: 2,
                color: '#08121A',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : (isEdit ? 'Update Asset' : 'Register Asset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
