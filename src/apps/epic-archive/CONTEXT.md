Purpose: Historical operations record, member
participation visibility, and patch-era
performance memory for the org.

Modules:
  Ops — completed op archive with wrap-up
    reports, session logs, crew counts,
    and searchable history
  Leaderboards — scout and fabrication
    standings derived from live entity history
  Patch History — stored patch digests and
    industry-impact summaries over time
  After Action — long-term outcome review and
    institutional learning tied back to ops

Entities read (not owned):
  Op — completed operations, session logs,
    duration, wrap-up summaries
  PatchDigest — patch history and summaries
  ScoutDeposit — scout contribution history
  CraftQueue — fabrication throughput and
    completion trends
  NexusUser — callsigns and rank context for
    participation views

Cross-app integrations:
  OPERATIONS — completed ops flow into the
    archive and After Action review
  INTEL — scout leaderboard derives from
    deposit reporting history
  INDUSTRY — fabrication leaderboard derives
    from craft completion history
  COMMERCE — future payout history can enrich
    participation and earnings views

Known issues / next tasks:
  1. Op outcome, haul value, and payout history
     should be normalised for easier archive
     analytics and After Action reporting
  2. Leaderboards currently derive from related
     entity history rather than a dedicated
     aggregate record

What NOT to touch:
  Op live execution logic — owned by OPERATIONS
  Wallet/Transaction — owned by COMMERCE
  ScoutDeposit ingestion — owned by INTEL
