# ProductJarvis Roadmap

High-level phases and embedding strategy. Positioning narrative lives in [POSITIONING.md](POSITIONING.md).

---

## Phases

| Phase | Goal | Status |
|-------|------|--------|
| **1** | Positioning doc + one claim + "Why Jarvis vs alternatives" | Done |
| **2** | Workflow embedding (V1: deep links + context) | Done |
| **3** | Landing + copy aligned with positioning | Done |
| **4** | Interview/usage differentiator (positioning sentence + optional backlog) | Done |

---

## Workflow embedding strategy

**V1 choice: Deep links + context (Option A)**

- **What:** "Open in Jarvis" from Jira/Linear: user opens Jarvis with issue title/description pre-filled so they don’t start from a blank slate.
- **How:** Use URL query params on the command bar route, e.g. `?source=jira&title=...&body=...`. Command bar pre-fills the input from `title` and optionally `body`.
- **Deliverables:**
  - Route and query handling in app (see below).
  - [Open in Jarvis instructions](OPEN_IN_JARVIS.md) for Jira/Linear (bookmarklet or link pattern).

**Implementation notes (Option A)**

- **Route:** Existing `/workspace/command` supports query params. No new route.
- **Query params:** `source` (optional, e.g. `jira` | `linear`), `title` (pre-fill), `body` (optional, append or pre-fill).
- **Behavior:** On load, if `title` (or `body`) is present, pre-fill the command bar input. Show a small hint “Opened from Jira” / “Opened from Linear” when `source` is set.
- **Bookmarklet:** Doc describes a bookmarklet or saved link like  
  `https://app.productjarvis.com/workspace/command?source=jira&title=INSERT_TITLE&body=INSERT_BODY` with user instructions to replace placeholders or use from Jira/Linear (e.g. copy issue link and paste into a “Open in Jarvis” helper).

**Backlog (later)**

- **Option B — Browser extension:** Jarvis trigger (e.g. command bar) on Jira/Linear/Notion pages. Acceptance criteria: user can open a Jarvis command bar from a Jira/Linear/Notion page and send current page context (title, description) to Jarvis. Dependency: Phase 1 messaging locked.
- **Option C — Slack/Teams bot:** “Create PRD for [link or summary]” in Slack. Acceptance criteria: user can paste a link or summary in Slack and receive a link to a Jarvis-generated PRD/ticket flow. Dependency: Phase 1 messaging locked.
- **Interview + usage ingestion:** Upload or link interviews/usage data as context for PRD/ticket generation. Acceptance criteria: user can add interview or usage artifacts as direct input to PRD/ticket flows; positioning calls out “evidence as source of record.” See POSITIONING.md “Interview and usage data as differentiator.”
