# Rockbreaker Live Runbook

Use this document during a live Rockbreaker session. Follow it in order.

## Objective
Run a Rockbreaker op from login to payout without losing crew state, haul state, refinery state, or command notes.

## Login
- Open `/gate`.
- Sign in with Discord SSO.
- Confirm you land inside NexusOS.
- If you cannot get past the gate, stop and fix auth before the op starts.

## Pre-Op
- Confirm `/app/admin/todo` shows no critical setup failures.
- Confirm Herald can post if Discord notifications are expected.
- Confirm INTEL deposit data is current for the target run.
- Confirm INDUSTRY has no blocker on materials, refinery capacity, or craft dependencies.

## Pre-Op Checklist
- [ ] All crew logged into NexusOS via Discord
- [ ] Op created and published in OPERATIONS
- [ ] All crew RSVPd with ship confirmed
- [ ] Readiness gate at 100%
- [ ] Refinery orders pre-logged in INDUSTRY
- [ ] Split calculator configured in Live Op

## Create The Op
- Go to `/app/ops/new`.
- Build the op in `OPERATIONS`.
- Set the op name, type, system, target location, schedule, access type, and rank gate.
- Set the role slots for miners, escort, hauling, scout, and refinery support.
- Save the draft.
- Publish only after the crew plan and phase plan are correct.

## Go Live
1. Open the published op in `OPERATIONS`.
2. Confirm the RSVP roster is correct.
3. Confirm the readiness gate is complete.
4. Activate the op.
5. Keep the live view open for the full session.

## During The Op

### Advance Phases
- Use the `PHASE TRACKER` in Live Op.
- Phase advance is allowed for the op creator or `PIONEER` rank.
- Do not advance early.
- Advance only when the operation has actually moved to the next state.
- Confirm the advance when prompted.

### Log Hauls
- Use `LOOT TALLY` in Live Op to log material, quantity, value, and related haul details.
- Keep entries current during the run. Do not batch everything at the end.
- If the crew changes target material or route, update the tally immediately.

### Add Session Log Entries
- Use `SESSION LOG` for command decisions, threats, route changes, delays, refinery calls, and anything you will need in the debrief.
- Write short, factual entries.
- If it affects payout, timing, crew movement, or risk, log it.

### 2nd Monitor Layout
- Switch Live Op to `2ND MONITOR` layout when a second display is available.
- Column 1 shows `PHASE TRACKER` and `CREW & RSVP`.
- Column 2 shows `SESSION LOG`.
- Column 3 shows `LOOT TALLY` and `SPLIT CALCULATOR`.
- Use this layout when one operator needs the entire op state visible at once.

## INDUSTRY During The Op
- Keep refinery and supply data current in `INDUSTRY`.
- If a haul changes refinery output assumptions, update INDUSTRY as soon as the haul is stable.
- If a material source proves stale or contested, update INTEL first, then update the op plan.

## Post-Op

### Run The Split Calculator
- In Live Op, open `SPLIT CALCULATOR`.
- Enter the final haul total.
- Check the crew list and payout amounts before logging.
- Confirm the split is correct before final submission.

### Log Split To Coffer
- Use the split calculator action that writes the split to coffer.
- Confirm the Coffer entry exists after logging.
- Do not close the op until the payout record is present.

### Submit Refinery Orders
- Move to `INDUSTRY`.
- Submit any final refinery orders created by the haul.
- Confirm material, quantity, method, station, and timing before saving.

### File The After Action Report
- Capture the outcome, crew participation, haul result, payout result, phase completion, session duration, and key notes.
- If the dedicated `After Action` module is available, file it there.
- If it is not yet available, make sure the session log and archive notes contain the full record before closing the op.

### Close The Op
- End the op from Live Op.
- Confirm the op leaves `LIVE`.
- Confirm Herald posts any end-of-op message expected for the session.

## Failure Checks
- If Discord login fails for any crew member, stop and resolve it before launch.
- If readiness is below 100%, do not go live.
- If the split is not logged, the op is not complete.
- If refinery orders are missing, INDUSTRY is out of sync.
- If session log notes are weak, the debrief will be weak.

## Minimum Rehearsal Before Patch 4.7 LIVE
- One full Discord SSO login check at `/gate`
- One published Rockbreaker op in `OPERATIONS`
- One full crew RSVP pass with ships confirmed
- One readiness gate to 100%
- One live phase advance cycle
- One loot tally pass
- One split calculation and coffer log
- One refinery submission in `INDUSTRY`
