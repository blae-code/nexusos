import React, { useState } from 'react';
import { X, Save, Shield, Award, Eye, Zap } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import PresenceDot from '@/components/PresenceDot';
import NexusToken from '@/core/design/NexusToken';
import { rankToken } from '@/core/data/tokenMap';
import { showToast } from '@/components/NexusToast';

const RANKS = ['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE'];
const SPECIALIZATIONS = ['MINING', 'SALVAGE', 'COMBAT', 'CRAFTING', 'HAULING', 'MEDICAL', 'EXPLORATION', 'RACING', 'LEADERSHIP', 'UNASSIGNED'];
const INTEL_LEVELS = ['FULL', 'STANDARD', 'RESTRICTED', 'NONE'];

const RANK_COLORS = { PIONEER: '#C8A84B', FOUNDER: '#E8A020', QUARTERMASTER: '#8E44AD', VOYAGER: '#3498DB', SCOUT: '#4A8C5C', VAGRANT: '#E8E4DC', AFFILIATE: '#9A9488' };
const ACCESS_COLORS = { FULL: '#4A8C5C', STANDARD: '#9A9488', RESTRICTED: '#C8A84B', NONE: '#C0392B' };
const SPEC_COLORS = { MINING: '#C8A84B', SALVAGE: '#9A9488', COMBAT: '#C0392B', CRAFTING: '#3498DB', HAULING: '#E8A020', MEDICAL: '#4A8C5C', EXPLORATION: '#8E44AD', RACING: '#E67E22', LEADERSHIP: '#C8A84B', UNASSIGNED: '#5A5850' };
const CAT_COLORS = { WEAPON: '#C0392B', ARMOR: '#3498DB', GEAR: '#4A8C5C', COMPONENT: '#9A9488', CONSUMABLE: '#E8A020', AMMO: '#C8A84B', SHIP_COMPONENT: '#8E44AD', FOCUSING_LENS: '#E67E22', OTHER: '#5A5850' };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

export default function MemberDetailPanel({ member, memberBlueprints, isAdmin, onClose, onSaved }) {
  const [opRole, setOpRole] = useState(member.op_role || '');
  const [spec, setSpec] = useState(member.specialization || 'UNASSIGNED');
  const [rank, setRank] = useState(member.nexus_rank || 'AFFILIATE');
  const [access, setAccess] = useState(member.intel_access || 'STANDARD');
  const [isAdminFlag, setIsAdminFlag] = useState(member.is_admin || false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.NexusUser.update(member.id, {
        op_role: opRole || null,
        specialization: spec,
        nexus_rank: rank,
        intel_access: access,
        is_admin: isAdminFlag,
      });
      showToast(`${member.callsign} updated`, 'success');
      onSaved();
    } catch {
      showToast('Failed to update member', 'error');
    }
    setSaving(false);
  };

  const timeAgo = (iso) => {
    if (!iso) return '—';
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const selectStyle = {
    width: '100%', padding: '8px 10px', background: '#141410',
    border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
    color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto',
        background: '#0F0F0D', borderLeft: '2px solid #C0392B',
        border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 18px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          background: '#141410', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PresenceDot lastSeenAt={member.last_seen_at} size={8} />
            <NexusToken src={rankToken(member.nexus_rank || 'AFFILIATE')} size={22} alt={member.nexus_rank} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC' }}>{member.callsign}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850' }}>
                Last seen {timeAgo(member.last_seen_at)} · Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '18px' }}>
          {/* Blueprint contributions */}
          <div style={{
            padding: '12px 14px', background: '#141410',
            border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
            marginBottom: 18,
          }}>
            <div style={{
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 9, color: '#3498DB', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10,
            }}>BLUEPRINT CONTRIBUTIONS ({(memberBlueprints || []).length})</div>
            {(memberBlueprints || []).length === 0 ? (
              <div style={{ color: '#5A5850', fontSize: 10, fontStyle: 'italic' }}>No blueprints owned</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {memberBlueprints.map(bp => (
                  <div key={bp.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', background: '#0F0F0D', borderRadius: 2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 2,
                        color: CAT_COLORS[bp.category] || '#5A5850',
                        background: `${CAT_COLORS[bp.category] || '#5A5850'}18`,
                      }}>{bp.category}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#E8E4DC', fontWeight: 600 }}>{bp.item_name}</span>
                    </div>
                    <span style={{
                      fontSize: 9, color: bp.tier === 'T2' ? '#C8A84B' : '#5A5850',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    }}>{bp.tier}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin ? (
            <>
              <div style={{
                fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
                fontSize: 9, color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14,
                paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)',
              }}>ADMIN CONTROLS</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="RANK">
                  <select value={rank} onChange={e => setRank(e.target.value)} style={selectStyle}>
                    {RANKS.map(r => {
                      // QUARTERMASTER can only be assigned to VOYAGER+ members
                      const QM_ELIGIBLE = ['PIONEER', 'FOUNDER', 'VOYAGER', 'QUARTERMASTER'];
                      if (r === 'QUARTERMASTER' && !QM_ELIGIBLE.includes(member.nexus_rank || 'AFFILIATE')) return null;
                      return <option key={r} value={r}>{r}</option>;
                    })}
                  </select>
                  {rank === 'QUARTERMASTER' && (
                    <div style={{ marginTop: 4, fontSize: 9, color: '#8E44AD', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
                      LOGISTICS OFFICER — Official custodian of org property & resources
                    </div>
                  )}
                </Field>
                <Field label="SPECIALIZATION">
                  <select value={spec} onChange={e => setSpec(e.target.value)} style={selectStyle}>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="INTEL ACCESS">
                  <select value={access} onChange={e => setAccess(e.target.value)} style={selectStyle}>
                    {INTEL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="OP ROLE">
                  <input value={opRole} onChange={e => setOpRole(e.target.value)} placeholder="e.g. MINER, ESCORT, MEDIC"
                    style={{ ...selectStyle, cursor: 'text' }} />
                </Field>
              </div>

              <Field label="ADMIN PRIVILEGES">
                <button
                  onClick={() => setIsAdminFlag(!isAdminFlag)}
                  style={{
                    padding: '6px 12px', borderRadius: 2, cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6,
                    background: isAdminFlag ? 'rgba(200,168,75,0.12)' : '#141410',
                    border: `0.5px solid ${isAdminFlag ? '#C8A84B' : 'rgba(200,170,100,0.12)'}`,
                    color: isAdminFlag ? '#C8A84B' : '#5A5850',
                  }}
                >
                  <Shield size={10} />
                  {isAdminFlag ? 'ADMIN ENABLED' : 'NOT ADMIN'}
                </button>
              </Field>

              <button onClick={save} disabled={saving} style={{
                width: '100%', padding: '10px', background: '#C0392B', border: 'none',
                borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, opacity: saving ? 0.6 : 1,
              }}>
                <Save size={12} />
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </>
          ) : (
            <div style={{
              padding: '14px', background: '#141410', borderRadius: 2, textAlign: 'center',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
            }}>ADMIN ACCESS REQUIRED TO EDIT MEMBER SETTINGS</div>
          )}
        </div>
      </div>
    </div>
  );
}