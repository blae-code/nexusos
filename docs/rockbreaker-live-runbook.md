# Rockbreaker Live Runbook

This runbook packages the in-repo flow for a real Rockbreaker operation when patch 4.7 moves from PTU to LIVE.

## Objective
Launch, execute, and wrap a Rockbreaker op with enough operational discipline that Industry, Scout, Op Board, and Herald all stay in sync.

## Preflight
- Confirm `/app/admin/todo` has no remaining critical Discord or auth items.
- Confirm member auth and System Admin bypass both work from `/gate`.
- In Industry:
  - review blueprint ownership and craft queue blockers
  - verify refinery status and hauling capacity
- In Scout:
  - confirm target deposits are current and not stale after the latest patch digest
- In Ops:
  - verify the op leader has Voyager+ rank
  - verify Herald posting is enabled if Discord publishing is expected

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
1. Publish the op and confirm the RSVP post lands in Discord if enabled.
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
- Confirm Herald posts the debrief when configured.
- Review archive output and any supply-chain or rescue follow-up items.

## Failure Modes To Watch
- Discord env drift: publish succeeds in-app but Herald cannot post.
- Patch drift: Scout deposits were logged pre-LIVE and are stale after release.
- Supply drift: blueprint or refinery blockers were cleared in PTU but not revalidated on LIVE.
- Auth drift: member OAuth or System Admin bypass regressed after deploy.

## Minimum Rehearsal Before LIVE
- One full dry run with a published Rockbreaker op
- One `GO LIVE` transition
- One manual phase progression cycle
- One wrap-up/debrief cycle
- One verification pass on `/app/admin/todo`
