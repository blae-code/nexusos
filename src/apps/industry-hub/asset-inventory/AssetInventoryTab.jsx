/**
 * AssetInventoryTab — personal asset inventory view with material/ship display
 * and auto-requisition generator for missing blueprint materials.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { listMemberDirectory } from '@/core/data/member-directory';
import { useSession } from '@/core/data/SessionContext';
import { showToast } from '@/components/NexusToast';
import { Package, Ship, Boxes, Zap, RefreshCw, Plus, Search, Camera } from 'lucide-react';
import AssetList from './AssetList';
import ShipList from './ShipList';
import GapAnalysis from './GapAnalysis';
import AddAssetForm from './AddAssetForm';
import OcrScanner from './OcrScanner';
import OcrResultsReview from './OcrResultsReview';

const SUB_TABS = [
  { id: 'materials', label: 'MATERIALS', icon: Boxes },
  { id: 'ships', label: 'SHIPS', icon: Ship },
  { id: 'gaps', label: 'GAP ANALYSIS', icon: Zap },
];

export default function AssetInventoryTab({ blueprints, materials: orgMaterials }) {
  const { user } = useSession();
  const callsign = (user?.callsign || '').toUpperCase();
  const [personalAssets, setPersonalAssets] = useState([]);
  const [orgShips, setOrgShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('materials');
  const [showAdd, setShowAdd] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const [ocrResults, setOcrResults] = useState(null);
  const [ocrMode, setOcrMode] = useState(null);
  const [search, setSearch] = useState('');

  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    const [assets, ships, mems] = await Promise.all([
      base44.entities.PersonalAsset.list('-logged_at', 500).catch(() => []),
      base44.entities.OrgShip.list('name', 300).catch(() => []),
      listMemberDirectory({ sort: '-last_seen_at', limit: 500 }).catch(() => []),
    ]);
    setPersonalAssets(assets || []);
    setOrgShips(ships || []);
    setMembers(mems || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubs = [
      base44.entities.PersonalAsset.subscribe(() => load()),
      base44.entities.OrgShip.subscribe(() => load()),
    ];
    return () => unsubs.forEach(u => u());
  }, [load]);

  // Filter assets to current user
  const myAssets = useMemo(() =>
    personalAssets.filter(a => (a.owner_callsign || '').toUpperCase() === callsign),
    [personalAssets, callsign]
  );

  const myMaterials = useMemo(() => {
    const assets = myAssets.filter(a => a.category === 'MATERIAL');
    // Also include org materials where I'm the custodian
    const orgMats = (orgMaterials || []).filter(m =>
      !m.is_archived &&
      ((m.custodian_callsign || '').toUpperCase() === callsign ||
       (m.logged_by_callsign || '').toUpperCase() === callsign)
    );
    return { assets, orgMats };
  }, [myAssets, orgMaterials, callsign]);

  const myShips = useMemo(() =>
    orgShips.filter(s =>
      (s.assigned_to_callsign || '').toUpperCase() === callsign
    ),
    [orgShips, callsign]
  );

  const otherAssets = useMemo(() =>
    myAssets.filter(a => a.category !== 'MATERIAL'),
    [myAssets]
  );

  // Build unified material inventory for gap analysis
  const materialInventory = useMemo(() => {
    const inv = {};
    // From PersonalAsset (MATERIAL category)
    for (const a of myMaterials.assets) {
      const key = (a.item_name || '').toUpperCase();
      if (!inv[key]) inv[key] = { scu: 0, quality: 0, count: 0 };
      inv[key].scu += a.quantity || 0;
      inv[key].quality = Math.max(inv[key].quality, a.quality_score || 0);
      inv[key].count++;
    }
    // From Material entity (org materials I hold)
    for (const m of myMaterials.orgMats) {
      const key = (m.material_name || '').toUpperCase();
      if (!inv[key]) inv[key] = { scu: 0, quality: 0, count: 0 };
      inv[key].scu += m.quantity_scu || 0;
      inv[key].quality = Math.max(inv[key].quality, m.quality_score || 0);
      inv[key].count++;
    }
    return inv;
  }, [myMaterials]);

  // KPIs
  const totalMaterials = myMaterials.assets.length + myMaterials.orgMats.length;
  const totalScu = Object.values(materialInventory).reduce((s, v) => s + v.scu, 0);
  const totalValue = myAssets.reduce((s, a) => s + (a.estimated_value_aUEC || 0), 0);
  const donatedCount = myAssets.filter(a => a.is_contributed).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={15} style={{ color: '#C8A84B' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>ASSET INVENTORY</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#5A5850', letterSpacing: '0.06em',
            }}>— {callsign}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={load} style={{
              padding: '6px 10px', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
              color: '#5A5850', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            }}><RefreshCw size={10} /> REFRESH</button>
            <button onClick={() => { setShowOcr(s => !s); if (!showOcr) { setShowAdd(false); setOcrResults(null); } }} style={{
              padding: '6px 12px', borderRadius: 2,
              background: showOcr ? 'rgba(142,68,173,0.12)' : '#141410',
              border: `0.5px solid ${showOcr ? 'rgba(142,68,173,0.4)' : 'rgba(200,170,100,0.12)'}`,
              color: showOcr ? '#8E44AD' : '#9A9488',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              letterSpacing: '0.08em',
            }}>
              <Camera size={10} /> {showOcr ? 'CLOSE OCR' : 'SCAN'}
            </button>
            <button onClick={() => { setShowAdd(s => !s); if (!showAdd) { setShowOcr(false); setOcrResults(null); } }} style={{
              padding: '6px 12px', borderRadius: 2,
              background: showAdd ? 'rgba(192,57,43,0.12)' : '#C0392B',
              border: showAdd ? '0.5px solid rgba(192,57,43,0.3)' : 'none',
              color: showAdd ? '#C0392B' : '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              letterSpacing: '0.08em',
            }}>
              <Plus size={10} /> {showAdd ? 'CANCEL' : 'ADD ASSET'}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'MATERIALS', value: totalMaterials, color: '#4A8C5C' },
            { label: 'TOTAL SCU', value: totalScu.toFixed(1), color: '#C8A84B' },
            { label: 'SHIPS', value: myShips.length, color: '#3498DB' },
            { label: 'OTHER ASSETS', value: otherAssets.length, color: '#9A9488' },
            { label: 'DONATED', value: donatedCount, color: '#C8A84B' },
            { label: 'EST. VALUE', value: `${(totalValue / 1000).toFixed(0)}K`, color: '#E8A020' },
          ].map(k => (
            <div key={k.label} style={{
              padding: '8px 12px', background: '#0F0F0D',
              border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2, minWidth: 90,
            }}>
              <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: k.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Sub-tabs + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {SUB_TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setSubTab(t.id)} style={{
                  padding: '7px 14px', border: 'none', cursor: 'pointer',
                  borderBottom: subTab === t.id ? '2px solid #C0392B' : '2px solid transparent',
                  background: 'transparent', color: subTab === t.id ? '#E8E4DC' : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Icon size={10} /> {t.label}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={10} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
            <input className="nexus-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 24, height: 28, fontSize: 10 }} />
          </div>
        </div>
      </div>

      {/* OCR scanner */}
      {showOcr && !ocrResults && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <OcrScanner
            onResults={(items, mode) => { setOcrResults(items); setOcrMode(mode); }}
            onCancel={() => { setShowOcr(false); setOcrResults(null); }}
          />
        </div>
      )}

      {/* OCR results review */}
      {ocrResults && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <OcrResultsReview
            items={ocrResults}
            mode={ocrMode}
            callsign={callsign}
            onSaved={() => { setOcrResults(null); setShowOcr(false); load(); }}
            onCancel={() => { setOcrResults(null); }}
          />
        </div>
      )}

      {/* Add asset form */}
      {showAdd && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <AddAssetForm callsign={callsign} onCreated={() => { setShowAdd(false); load(); }} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 16px' }}>
        {subTab === 'materials' && (
          <AssetList
            materialAssets={myMaterials.assets}
            orgMaterials={myMaterials.orgMats}
            otherAssets={otherAssets}
            search={search}
            onRefresh={load}
            callsign={callsign}
            members={members}
          />
        )}
        {subTab === 'ships' && (
          <ShipList ships={myShips} search={search} />
        )}
        {subTab === 'gaps' && (
          <GapAnalysis
            blueprints={blueprints || []}
            inventory={materialInventory}
            callsign={callsign}
          />
        )}
      </div>
    </div>
  );
}
