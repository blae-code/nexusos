# Task Ledger

Use this file to claim active work before editing shared surfaces.

## Status Legend
- `claimed`
- `in_progress`
- `blocked`
- `review`
- `done`

## Active Template
| Task ID | Status | Owner Human | Owner AI | Branch | Scope | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| COLLAB-001 | open | unassigned | unassigned | `feature/...` | `src/...` | Replace with your active task |
| SCOUT-001 | in_progress | nickd | Claude Sonnet 4.6 | `feature/scout-intel-deposit-tooltips` | `src/apps/scout-intel/SystemMap.jsx`, `src/apps/scout-intel/SystemMapControls.jsx` | Deep polish: material chip tooltips (full name, type, tier, deposit stats, systems, use) + deposit marker hover tooltip (quality, location, volume, risk, scout, age, votes) |

## Handoff Template
| Task ID | From | To | Files | Last Verified | Risks / Notes |
| --- | --- | --- | --- | --- | --- |
| COLLAB-001 | human-a + ai-a | human-b + ai-b | `src/...` | `2026-03-21` | Fill before handoff |

## Rules
1. Claim a task before editing shared infrastructure or docs.
2. Update status when you switch from build work to review or handoff.
3. Add a handoff row whenever the owning human+AI pair changes.
4. Clear stale claimed work before opening a second branch on the same surface.
