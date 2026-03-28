/**
 * DonateDialog — donate a personal asset to the org.
 * Two modes: "I'll provide it myself" or "Transfer to a designated member".
 */
import React, { useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { X, Heart, Send, User, Package } from 'lucide-react';

export default function DonateDialog({ asset, callsign, members, onClose, onDone }) {
  const [mode, setMode] = useState(null); // 'self' | 'transfer'
  const [targetCallsign, setTargetCallsign] = useState('');
  const [transferLocation, setTransferLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const memberCallsigns = useMemo(() =>
    (members || [])
      .map(m => m.callsign)
      .filter(c => c && c.toUpperCase() !== callsign)
      .sort(),
    [members, callsign]
  );

  const handleSelfProvide = async () => {
    setSaving(true);
    try {
      // Mark the personal asset as contributed to org
      await base44.entities.PersonalAsset.update(asset.id, {
        is_contributed: true,
        notes: [asset.notes, `Donated to org by ${callsign}`, notes].filter(Boolean).join(' · '),
      });

      // Also create an OrgAsset record
      await base44.entities.OrgAsset.create({
        asset_name: asset.item_name,
        asset_type: mapCategory(asset.category),
        status: 'STORED',
        condition: asset.condition || 'GOOD',
        assigned_to_callsign: callsign,
        assigned_to_id: undefined,
        location_detail: asset.location || undefined,
        estimated_value_aUEC: asset.estimated_value_aUEC || 0,
        quantity: asset.quantity || 1,
        quality_score: asset.quality_score || undefined,
        acquisition_source: 'DONATED',
        is_org_property: true,
        notes: `Donated by ${callsign}. ${notes}`.trim(),
        acquired_at: new Date().toISOString(),
      });

      showToast('Asset donated — you are the custodian', 'success');
      onDone();
    } catch (err) {
      showToast(err?.message || 'Failed to donate', 'error');
    }
    setSaving(false);
  };

  const handleTransfer = async () => {
    if (!targetCallsign) return;
    setSaving(true);
    try {
      // Create a MaterialTransfer record
      await base44.entities.MaterialTransfer.create({
        from_callsign: callsign,
        to_callsign: targetCallsign,
        status: 'OFFERED',
        items: [{
          material_name: asset.item_name,
          material_type: asset.category === 'MATERIAL' ? asset.category : undefined,
          quantity_scu: asset.quantity || 1,
          quality_score: asset.quality_score || undefined,
        }],
        aUEC: 0,
        pickup_location: asset.location || undefined,
        delivery_location: transferLocation || undefined,
        notes: `Org donation from ${callsign}. ${notes}`.trim(),
        offered_at: new Date().toISOString(),
      });

      // Mark the asset as contributed
      await base44.entities.PersonalAsset.update(asset.id, {
        is_contributed: true,
        notes: [asset.notes, `Transfer to ${targetCallsign} initiated`].filter(Boolean).join(' · '),
      });

      showToast(`Transfer offered to ${targetCallsign}`, 'success');
      onDone();
    } catch (err) {
      showToast(err?.message || 'Failed to create transfer', 'error');
    }
    setSaving(false);
  };

  const LABEL = {
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
    letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 460,
        background: '#0F0F0D', borderLeft: '2px solid #C8A84B',
        border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2,
        animation: 'nexus-fade-in 150ms ease-out both',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          background: '#141410', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={14} style={{ color: '#C8A84B' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 14, color: '#E8E4DC', letterSpacing: '0.08em',
            }}>DONATE TO ORG</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Asset summary */}
          <div style={{
            padding: '10px 12px', background: '#141410', borderRadius: 2,
            border: '0.5px solid rgba(200,170,100,0.08)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Package size={14} style={{ color: '#C8A84B', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: '#E8E4DC' }}>
                {asset.item_name}
              </div>
              <div style={{ fontSize: 9, color: '#5A5850' }}>
                {asset.category} · ×{asset.quantity || 1}
                {asset.quality_score > 0 ? ` · Q${asset.quality_score}` : ''}
                {asset.location ? ` · ${asset.location}` : ''}
              </div>
            </div>
            <span style={{
              fontSize: 8, padding: '2px 6px', borderRadius: 2,
              color: '#9A9488', background: 'rgba(154,148,136,0.08)',
              border: '0.5px solid rgba(154,148,136,0.15)',
            }}>PERSONAL</span>
          </div>

          {/* Mode selection */}
          {!mode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={LABEL}>HOW WOULD YOU LIKE TO DONATE?</div>
              <button onClick={() => setMode('self')} style={{
                padding: '12px 14px', borderRadius: 2, cursor: 'pointer',
                background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                transition: 'border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#C8A84B'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.12)'; }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 2, flexShrink: 0,
                  background: 'rgba(200,168,75,0.10)', border: '0.5px solid rgba(200,168,75,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={14} style={{ color: '#C8A84B' }} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: '#E8E4DC', letterSpacing: '0.04em' }}>
                    I'LL PROVIDE IT MYSELF
                  </div>
                  <div style={{ fontSize: 10, color: '#5A5850', marginTop: 2 }}>
                    You remain the custodian. Item becomes org property in your care.
                  </div>
                </div>
              </button>

              <button onClick={() => setMode('transfer')} style={{
                padding: '12px 14px', borderRadius: 2, cursor: 'pointer',
                background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                transition: 'border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3498DB'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.12)'; }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 2, flexShrink: 0,
                  background: 'rgba(52,152,219,0.10)', border: '0.5px solid rgba(52,152,219,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Send size={14} style={{ color: '#3498DB' }} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: '#E8E4DC', letterSpacing: '0.04em' }}>
                    TRANSFER TO A MEMBER
                  </div>
                  <div style={{ fontSize: 10, color: '#5A5850', marginTop: 2 }}>
                    Send the item to a designated org member for their custody.
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Self-provide confirmation */}
          {mode === 'self' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                padding: '8px 12px', borderRadius: 2,
                background: 'rgba(200,168,75,0.08)', border: '0.5px solid rgba(200,168,75,0.2)',
                fontSize: 10, color: '#C8A84B',
              }}>
                This item will be marked as <strong>ORG PROPERTY</strong> with you as custodian.
              </div>
              <div>
                <span style={LABEL}>NOTES (OPTIONAL)</span>
                <input className="nexus-input" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any details about the donation..."
                  style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => setMode(null)} style={{
                  padding: '7px 14px', background: 'none',
                  border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', cursor: 'pointer',
                }}>BACK</button>
                <button onClick={handleSelfProvide} disabled={saving} style={{
                  padding: '7px 16px', borderRadius: 2,
                  background: saving ? '#5A5850' : '#C8A84B', border: 'none', color: '#0F0F0D',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Heart size={10} /> {saving ? 'DONATING...' : 'CONFIRM DONATION'}
                </button>
              </div>
            </div>
          )}

          {/* Transfer to member */}
          {mode === 'transfer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                padding: '8px 12px', borderRadius: 2,
                background: 'rgba(52,152,219,0.08)', border: '0.5px solid rgba(52,152,219,0.2)',
                fontSize: 10, color: '#3498DB',
              }}>
                A transfer request will be sent. The recipient must accept before it's finalized.
              </div>
              <div>
                <span style={LABEL}>TRANSFER TO *</span>
                <input list="member-list" value={targetCallsign}
                  onChange={e => setTargetCallsign(e.target.value)}
                  placeholder="Select member callsign..."
                  className="nexus-input"
                  style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
                <datalist id="member-list">
                  {memberCallsigns.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <span style={LABEL}>DELIVERY LOCATION (OPTIONAL)</span>
                <input className="nexus-input" value={transferLocation}
                  onChange={e => setTransferLocation(e.target.value)}
                  placeholder="e.g. Port Tressler, Lorville"
                  style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <span style={LABEL}>NOTES (OPTIONAL)</span>
                <input className="nexus-input" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any details..."
                  style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => setMode(null)} style={{
                  padding: '7px 14px', background: 'none',
                  border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', cursor: 'pointer',
                }}>BACK</button>
                <button onClick={handleTransfer} disabled={!targetCallsign || saving} style={{
                  padding: '7px 16px', borderRadius: 2,
                  background: !targetCallsign || saving ? '#5A5850' : '#3498DB', border: 'none', color: '#E8E4DC',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.1em', cursor: !targetCallsign || saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Send size={10} /> {saving ? 'SENDING...' : 'SEND TRANSFER'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mapCategory(cat) {
  const map = {
    FPS_WEAPON: 'FPS_WEAPON', FPS_ARMOR: 'FPS_ARMOR',
    SHIP_COMPONENT: 'SHIP_COMPONENT', MATERIAL: 'EQUIPMENT',
    CONSUMABLE: 'EQUIPMENT', CURRENCY: 'OTHER', OTHER: 'OTHER',
  };
  return map[cat] || 'OTHER';
}