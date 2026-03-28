import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * ocrDebtPayment — Verifies a payment screenshot against a debt record.
 * AI extracts transfer amount/recipient, cross-references the debt,
 * then auto-applies payment + logs to coffer.
 */

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    acc[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
    return acc;
  }, {});
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function signValue(value, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return btoa(Array.from(new Uint8Array(sig), (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function resolveSession(req, base44) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  const cookies = parseCookies(req);
  const token = cookies['nexus_member_session'];
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await signValue(body, secret);
  if (sig !== expected) return null;
  const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  if (!decoded.exp || decoded.exp < Date.now()) return null;
  if (!decoded.user_id) return null;
  const users = await base44.asServiceRole.entities.NexusUser.filter({ id: decoded.user_id });
  const user = users?.[0];
  if (!user || user.key_revoked) return null;
  return user;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await resolveSession(req, base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, debt_id, debtor_callsign, creditor_callsign, expected_amount, callsign } = await req.json();
    if (!file_url || !debt_id) return Response.json({ error: 'file_url and debt_id required' }, { status: 400 });

    // AI extraction — look for transfer/payment evidence
    const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are verifying a payment screenshot for a Star Citizen org debt management system.

The debtor (${debtor_callsign || 'unknown'}) claims to have paid ${expected_amount || 'an amount of'} aUEC to ${creditor_callsign || 'the org'}.

Analyze this screenshot and extract:
1. The transfer/payment amount in aUEC
2. The sender name/callsign (who sent the payment)
3. The recipient name/callsign (who received it)
4. The transaction type (mo.Trader transfer, trade terminal, direct trade, etc.)
5. Any timestamp or confirmation ID visible
6. The station/location if visible

Then determine if this screenshot is legitimate evidence of a payment:
- Does the amount match or exceed the expected ${expected_amount} aUEC?
- Does it appear to be a genuine game screenshot (not edited)?
- Can you identify both parties?

Set verified=true ONLY if you can confirm a transfer amount. Be lenient on matching names (players may have different display names). If the amount is visible but names don't perfectly match, still set verified=true but note the discrepancy.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          verified: { type: 'boolean' },
          amount_detected: { type: 'number' },
          sender: { type: 'string' },
          recipient: { type: 'string' },
          transaction_type: { type: 'string' },
          timestamp: { type: 'string' },
          confirmation_id: { type: 'string' },
          station: { type: 'string' },
          reason: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    });

    const cs = callsign || user.callsign || 'unknown';
    const now = new Date().toISOString();

    // Log the screenshot parse
    await base44.asServiceRole.entities.ScreenshotParse.create({
      image_url: file_url,
      uploaded_by: cs,
      uploaded_at: now,
      screen_type: 'TRADE_TERMINAL',
      parse_status: extracted?.verified ? 'SUCCESS' : 'REVIEW_NEEDED',
      ai_raw_response: JSON.stringify(extracted),
      confidence_score: extracted?.confidence || null,
      source: 'MANUAL_UPLOAD',
    });

    if (!extracted?.verified || !extracted?.amount_detected) {
      return Response.json({
        verified: false,
        reason: extracted?.reason || 'Could not verify a payment in this screenshot.',
        extracted_data: {
          amount_detected: extracted?.amount_detected || null,
          sender: extracted?.sender || null,
          recipient: extracted?.recipient || null,
          transaction_type: extracted?.transaction_type || null,
        },
      });
    }

    // Fetch the debt record
    const debts = await base44.asServiceRole.entities.MemberDebt.filter({ id: debt_id });
    const debt = debts?.[0];
    if (!debt) {
      return Response.json({ verified: true, applied: false, reason: 'Debt record not found.', amount_verified: extracted.amount_detected });
    }

    const remaining = (debt.amount_aUEC || 0) - (debt.amount_paid || 0);
    const paymentAmount = Math.min(extracted.amount_detected, remaining);

    if (paymentAmount <= 0) {
      return Response.json({ verified: true, applied: false, reason: 'Debt already fully paid.', amount_verified: extracted.amount_detected, new_remaining: 0 });
    }

    // Apply payment to debt
    const newPaid = (debt.amount_paid || 0) + paymentAmount;
    const isFullyPaid = newPaid >= debt.amount_aUEC;
    const payment = {
      amount: paymentAmount,
      date: now,
      source: 'SCREENSHOT_VERIFIED',
      note: `AI-verified from screenshot. ${extracted.transaction_type || ''} ${extracted.confirmation_id ? `#${extracted.confirmation_id}` : ''}`.trim(),
      screenshot_url: file_url,
    };
    const payments = [...(debt.payments || []), payment];

    await base44.asServiceRole.entities.MemberDebt.update(debt.id, {
      amount_paid: newPaid,
      status: isFullyPaid ? 'PAID' : 'PARTIAL',
      payments,
    });

    // Log to CofferLog as a deposit (debt repayment)
    await base44.asServiceRole.entities.CofferLog.create({
      entry_type: 'DEPOSIT',
      amount_aUEC: paymentAmount,
      description: `Debt repayment from ${debt.debtor_callsign}: ${debt.description || debt.debt_type}`,
      logged_by: user.id,
      logged_by_callsign: cs,
      source_type: 'OCR_UPLOAD',
      screenshot_ref: file_url,
      logged_at: now,
    });

    return Response.json({
      verified: true,
      applied: true,
      amount_verified: paymentAmount,
      new_remaining: Math.max(0, remaining - paymentAmount),
      fully_settled: isFullyPaid,
      extracted_data: {
        amount_detected: extracted.amount_detected,
        sender: extracted.sender,
        recipient: extracted.recipient,
        transaction_type: extracted.transaction_type,
        station: extracted.station,
        confidence: extracted.confidence,
      },
    });
  } catch (error) {
    console.error('ocrDebtPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});