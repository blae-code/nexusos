# Epic Archive — App Context

**Route:** `/app/archive`
**Directory:** `src/apps/epic-archive/`
**Status:** PARTIAL — op archive, leaderboards, patch history complete; knowledge base authoring planned

---

## Purpose

NexusOS community knowledge base and org intelligence record for Redscar Nomads. Covers:
- Completed op archive with session log preview and wrap-up reports
- Cross-division leaderboards (scouts, fabricators — planned: pilots, salvagers)
- Patch history digest with industry change detail
- Planned: member-authored content (personal logs, op after-action reports, guides, lore/fiction, propaganda)
- Planned: org intelligence queries across all archive entries

This is the long-memory layer of NexusOS — where ops, discoveries, and org history are preserved and searchable.

---

## Entity Ownership

This app **reads** (no write ownership currently):

| Entity | Operations |
|--------|------------|
| `Op` | `filter({ status: 'COMPLETE' }, '-ended_at', 30)` — op archive tab |
| `PatchDigest` | `list('-published_at', 20)` — patch history tab |
| `ScoutDeposit` | `list('-reported_at', 200)` — leaderboard: deposit count per callsign |
| `CraftQueue` | `list('-created_date', 200)` — leaderboard: completed craft qty per callsign |

**Planned entity (not yet defined in schema):**

| Entity | Operations |
|--------|------------|
| `ArchiveEntry` | create (authoring), read, filter by entry_type/author/tags — full CRUD by owning member; read by all |

**Planned `ArchiveEntry` fields:**
- `id` UUID PK
- `entry_type` ENUM(PERSONAL_LOG, OP_REPORT, GUIDE, FICTION, PROPAGANDA, DATA_ENTRY)
- `title`, `body` (markdown), `summary`
- `author_discord_id` BIGINT, `author_callsign`
- `tags` JSON array
- `linked_op_id` FK nullable (links AAR to a specific completed op)
- `is_public` BOOLEAN (visible to all members vs author-only draft)
- `created_at`, `updated_at`

This app **invokes** (Base44 functions):

| Function | Context |
|----------|---------|
| `generateInsight` | Planned: org intelligence query — summarise activity trends, op outcomes, scout coverage across stored entries |

---

## Cross-App Data Dependencies

| Dependency | Source | Used In |
|------------|--------|---------|
| Completed ops | `src/apps/ops-board/` | EpicArchive OPS tab — reads `Op` entity directly (read-only cross-reference) |
| ScoutDeposit count | `src/apps/scout-intel/` | Leaderboards tab — top scouts by deposit report count |
| CraftQueue completions | `src/apps/industry-hub/` | Leaderboards tab — top fabricators by completed craft item count |
| PatchDigest | Written by backend `patchDigest` job | Patch History tab |

---

## User Flows

**Implemented:**
1. **Browse op archive** — OPS tab; loads COMPLETE ops sorted by ended_at descending (max 30); search by name or system; `OpArchiveCard` shows op name, date, system, type tag, duration, crew count, wrap-up report preview, session log entry count + first 4 entries
2. **View leaderboards** — LEADERBOARDS tab; two panels side by side: TOP SCOUTS (deposit count, colour: `--live`) and TOP FABRICATORS (completed CraftQueue qty, colour: `--info`); top 3 shown with rank medal glyphs; computed client-side from loaded data
3. **Browse patch history** — PATCH HISTORY tab; left column: patch version cards sorted by published_at desc; right panel: selected patch detail — industry_summary text + changes_json log with category + change_summary per entry; severity colour-codes (high=danger, medium=warn, other=info)

**Planned:**
4. **Author personal log** — WRITE tab (planned) → `ArchiveEntry` form → entry_type = PERSONAL_LOG → title + markdown body → save as draft or publish; PIONEER+ can mark as org-visible
5. **After-action report** — From completed op detail OR directly in archive → entry_type = OP_REPORT → linked to op_id → structured fields (outcome, lessons, crew notes) + freeform body
6. **Browse knowledge base** — Browse/search `ArchiveEntry` by type, tags, author; GUIDE and DATA_ENTRY types surface in contextual help in other apps (e.g. fitting guide links from Armory)
7. **Fiction and propaganda** — entry_type = FICTION / PROPAGANDA — creative content; member-authored; visible to all members; no cross-app surfacing
8. **Org intelligence query** — INTEL tab (planned) — text query → `generateInsight` function with `context: 'archive_intel'` → synthesised summary from op outcomes, scout data, leaderboard trends; appears as system-generated report, no AI attribution in UI
9. **Expanded leaderboards** — Planned: add PILOTS (op participation count), SALVAGERS (op type = SALVAGE completions), CARRIERS (refinery order volume) — all computable from existing entities
10. **Op report search** — Planned: search/filter ArchiveEntry linked_op_id → find all AARs for a given op

---

## Component Inventory

| File | Role | Status |
|------|------|--------|
| `src/pages/EpicArchive.jsx` | Route component — 3-tab layout (OPS/LEADERBOARDS/PATCH HISTORY), all data loading, all sub-components inline | **Complete** (not yet moved to `src/apps/epic-archive/`) |

### Inline components (defined inside `EpicArchive.jsx`):

| Component | Role |
|-----------|------|
| `OpArchiveCard` | Single completed op card — name, system, type tag, duration, crew, wrap-up report preview, session log preview |
| `LeaderboardRow` | Single leaderboard entry — rank number/medal, callsign, value, label |

### Planned components:

| File | Role |
|------|------|
| `ArchiveEntryForm.jsx` | Authoring form: entry_type selector, title, markdown body editor, tags, linked op selector, public/draft toggle |
| `ArchiveEntryCard.jsx` | Display card for a single ArchiveEntry — type badge, title, author, date, summary excerpt |
| `ArchiveBrowser.jsx` | Filter + search interface for ArchiveEntry by type/author/tags |
| `IntelQueryPanel.jsx` | Org intelligence query UI — text input → `generateInsight` → formatted report output |

---

## Known Issues / Next Tasks

1. **File not yet moved to `src/apps/epic-archive/`**: `EpicArchive.jsx` still lives in `src/pages/`. Move to `src/apps/epic-archive/` when transitioning the route in `App.jsx`.

2. **Leaderboard uses `CHECKED_OUT` status load only**: `EpicArchive.jsx` loads `CraftQueue.list('-created_date', 200)` — correctly fetches all statuses. The fabricator leaderboard filters `.filter(item => item.status === 'COMPLETE')` client-side. This is correct but limited to the 200-item window. Add pagination or a server-side aggregation if queue grows large.

3. **`entry.author` field mismatch**: `OpArchiveCard` renders `{entry.author}` from `op.session_log` entries, but the session_log schema uses no `author` field — entries are `{ type, text, t, id? }`. The `author` reference will render `undefined`. Fix: display `entry.type` or remove the author span.

4. **`ArchiveEntry` entity not defined**: Schema is planned in this CONTEXT.md but not yet present in the Base44 backend schema. Define before implementing authoring flows.

5. **`generateInsight` for archive intel not validated**: The `context: 'archive_intel'` call path is planned — the existing `generateInsight` function may not have a prompt branch for this context key. Verify or implement a dedicated `archiveIntel` Base44 function.

6. **Leaderboard limited to 5 entries**: Top-5 is hardcoded via `.slice(0, 5)`. No "view all" expansion. Add a secondary panel or expandable row if members want full rankings.

7. **Emojis in leaderboard**: `LeaderboardRow` renders 🥇🥈🥉 for top 3 ranks. CLAUDE.md and NexusOS design system use monospace terminal aesthetic — emoji medals are inconsistent with the design language. Replace with `01` / `02` / `03` rank numerals styled in `--warn`.

---

## What NOT to Touch

- **Do not** change the `Op` filter shape — `filter({ status: 'COMPLETE' }, '-ended_at', 30)` — this is the canonical completed op query pattern shared with `src/apps/ops-board/ArchiveTable.jsx`.
- **Do not** add write access to `Op`, `ScoutDeposit`, `CraftQueue`, or `PatchDigest` from this app — Epic Archive is read-only for all entities it does not own. Writes go through their owning apps.
- **Do not** label the planned `generateInsight` org intelligence query as "AI" in the UI — it must appear as a system-generated org readiness or historical analysis report. See CLAUDE.md AI visibility rule.
- **Do not** expose `Op.session_log` edit controls from the archive view — session logs are append-only and editable only from the live op view in ops-board.
- **Do not** change `PatchDigest` fields — they are written by the backend `patchDigest` job and the schema is fixed: `patch_version`, `comm_link_url`, `raw_text`, `industry_summary`, `changes_json`, `published_at`, `processed_at`.
