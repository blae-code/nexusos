# Rockbreaker Live Runbook

This runbook packages the in-repo flow for a real Rockbreaker operation when patch 4.7 moves from PTU to LIVE.

## Objective
Launch, execute, and wrap a Rockbreaker op with enough operational discipline that Industry, Scout, Op Board, notifications, and supply-chain state all stay in sync.

## Preflight
- Confirm `/app/admin/readiness` has no remaining critical auth, entity, integration, or sample-data failures.
- Confirm `/app/admin/settings` auth roundtrip passes before issuing or rotating real keys.
- Confirm `/app/admin/data` can open the live entity registry and recent admin audit log.
- Confirm issued-key login works from `/`.
- In Industry:
  - review blueprint ownership and craft queue blockers
  - verify refinery status and hauling capacity
- In Scout:
  - confirm target deposits are current and not stale after the latest patch digest
- In Ops:
  - verify the op leader has Voyager+ rank
  - verify readiness and notification checks are green before publishing

## Op Creation
- Use `/app/ops/new`.
- Default the type to `ROCKBREAKER`.
- Set:
  - system
  - target location
  - schedule
  - access type
  - rank gate
  - role slots for mining, escort, fabricator, scout, and hauling support as required
- Confirm the generated phases are appropriate for the current Rockbreaker plan.

## Go-Live Sequence
1. Publish the op and confirm the live record, notifications, and RSVP state appear correctly in-app.
2. Confirm crew assignments in the live op page.
3. Move to `LIVE`.
4. Use the phase tracker deliberately. Each phase change should reflect the actual operation state, not aspirational timing.
5. Post threat alerts immediately when the operational picture changes.

## During Operation
- Keep Supply Chain current:
  - refinery orders
  - craft queue dependencies
  - material logging
- Keep session log entries meaningful enough to support a debrief.
- If deposit quality or route assumptions change after a patch shift, update Scout/Industry first, then adjust the op plan.

## Wrap-Up
- End the op from the live op page.
- Verify wrap-up generation succeeds.
- Confirm the debrief, archive output, and notifications reflect what actually happened.
- Review any supply-chain or rescue follow-up items.

## Failure Modes To Watch
- Patch drift: Scout deposits were logged pre-LIVE and are stale after release.
- Supply drift: blueprint or refinery blockers were cleared in PTU but not revalidated on LIVE.
- Auth drift: invitation-based login or session persistence regressed after deploy, or `NexusUser` stopped persisting auth-critical fields.
- Readiness drift: entity or integration checks regress after deploy even though local build checks are green.

## Minimum Rehearsal Before LIVE
- One full dry run with a published Rockbreaker op
- One `GO LIVE` transition
- One manual phase progression cycle
- One wrap-up/debrief cycle
- One verification pass on `/app/admin/readiness`
