/**
 * PostExchangeForm — form for posting a new barter/exchange listing.
 * Props: { materials, commodities, viewerId, viewerCallsign, onDone }
 */
import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import {
  buildPriceLookup,
  estimateItemListValue,
  formatCompactAuec,
} from '@/core/data/commerce-logistics';

const FIELD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const LABEL_STYLE = {
  color: 'var(--t3)',
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

function ValueBadge({ value, unknownCount }) {
  if (value === 0 && unknownCount > 0) {
    return (
      <span style={{ fontSize: 9, color: 'var(--warn)', fontFamily: 'var(--font)' }}>
        value unknown — verify before completing
      </span>
    );
  }
  if (value > 0) {
    return (
      <span style={{ fontSize: 9, color: 'var(--live)', fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums' }}>
        est. {formatCompactAuec(value)}
        {unknownCount > 0 ? ` (+${unknownCount} unpriced)` : ''}
      </span>
    );
  }
  return null;
}

export default function PostExchangeForm({ materials, commodities, viewerId, viewerCallsign, onDone }) {
  const [offerText, setOfferText] = useState('');
  const [offerAUEC, setOfferAUEC] = useState('');
  const [requestDesc, setRequestDesc] = useState('');
  const [requestText, setRequestText] = useState('');
  const [requestAUEC, setRequestAUEC] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const priceLookup = useMemo(
    () => buildPriceLookup(materials || [], commodities || []),
    [materials, commodities],
  );

  const offerEst = useMemo(
    () => estimateItemListValue(offerText, priceLookup),
    [offerText, priceLookup],
  );

  const requestEst = useMemo(
    () => estimateItemListValue(requestText, priceLookup),
    [requestText, priceLookup],
  );

  const offerAUECNum = parseFloat(offerAUEC) || 0;
  const requestAUECNum = parseFloat(requestAUEC) || 0;
  const offerTotalEst = offerEst.value + offerAUECNum;
  const requestTotalEst = requestEst.value + requestAUECNum;

  const canSubmit = !saving && requestDesc.trim().length > 0 && (offerText.trim().length > 0 || offerAUECNum > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await base44.entities.TradePost.create({
        poster_id: viewerId,
        poster_callsign: viewerCallsign,
        status: 'OPEN',
        offer_items: offerEst.itemsParsed > 0
          ? offerText.split('\n').filter(Boolean).map((l) => ({ raw: l.trim() }))
          : [],
        offer_aUEC: offerAUECNum,
        request_description: requestDesc.trim(),
        request_items: requestEst.itemsParsed > 0
          ? requestText.split('\n').filter(Boolean).map((l) => ({ raw: l.trim() }))
          : [],
        request_aUEC: requestAUECNum,
        offer_est_value: offerTotalEst,
        request_est_value: requestTotalEst,
        notes: notes.trim(),
        created_at: new Date().toISOString(),
      });
      onDone?.();
    } catch (err) {
      setError('Failed to post exchange — check entity is available.');
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="nexus-card-2 nexus-raised"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>
        NEW EXCHANGE LISTING
      </div>

      {/* Offer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          What you&apos;re offering
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Items (one per line, e.g. &quot;Agricium: 10&quot;)</label>
          <textarea
            className="nexus-input"
            rows={3}
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            placeholder={'Agricium: 10\nTitanium: 5 SCU'}
            style={{ resize: 'vertical', fontFamily: 'var(--font)', fontSize: 10, lineHeight: 1.6 }}
          />
          {offerEst.itemsParsed > 0 && (
            <ValueBadge value={offerEst.value} unknownCount={offerEst.unknownItems.length} />
          )}
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>aUEC (optional, combined with items)</label>
          <input
            className="nexus-input"
            type="number"
            min="0"
            step="1000"
            value={offerAUEC}
            onChange={(e) => setOfferAUEC(e.target.value)}
            placeholder="0"
            style={{ width: 160 }}
          />
        </div>
        {offerTotalEst > 0 && (
          <div style={{ fontSize: 10, color: 'var(--live)', fontVariantNumeric: 'tabular-nums' }}>
            Offer total est: {formatCompactAuec(offerTotalEst)}
          </div>
        )}
      </div>

      <div style={{ borderTop: '0.5px solid var(--b0)' }} />

      {/* Request */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          What you&apos;re looking for
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Description (required)</label>
          <input
            className="nexus-input"
            value={requestDesc}
            onChange={(e) => setRequestDesc(e.target.value)}
            placeholder="Looking for processed titanium or similar..."
            required
          />
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Structured items (optional)</label>
          <textarea
            className="nexus-input"
            rows={2}
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder={'Laranite: 20\nBeryl: 10'}
            style={{ resize: 'vertical', fontFamily: 'var(--font)', fontSize: 10, lineHeight: 1.6 }}
          />
          {requestEst.itemsParsed > 0 && (
            <ValueBadge value={requestEst.value} unknownCount={requestEst.unknownItems.length} />
          )}
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>aUEC (optional)</label>
          <input
            className="nexus-input"
            type="number"
            min="0"
            step="1000"
            value={requestAUEC}
            onChange={(e) => setRequestAUEC(e.target.value)}
            placeholder="0"
            style={{ width: 160 }}
          />
        </div>
        {requestTotalEst > 0 && (
          <div style={{ fontSize: 10, color: 'var(--info)', fontVariantNumeric: 'tabular-nums' }}>
            Request total est: {formatCompactAuec(requestTotalEst)}
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={FIELD_STYLE}>
        <label style={LABEL_STYLE}>Notes (optional)</label>
        <input
          className="nexus-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferred pickup location, time window, etc."
        />
      </div>

      {error && (
        <div style={{ fontSize: 10, color: 'var(--danger)' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="nexus-btn" onClick={() => onDone?.()}>
          Cancel
        </button>
        <button type="submit" className="nexus-btn primary" disabled={!canSubmit}>
          {saving ? 'Posting...' : 'Post Exchange'}
        </button>
      </div>
    </form>
  );
}
