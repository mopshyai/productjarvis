# ProductJarvis Positioning

Internal product story and messaging. Use this doc for sales, marketing, and all external copy.

---

## One claim: Only Jarvis can do this

**One command turns evidence (context, interviews, usage) into a PRD and sprint-ready Jira/Linear tickets with citations. No other tool does evidence → executable spec in one flow with traceability.**

- Differentiators: command bar → multi-artifact output (PRD + tickets + methodology), strict citation policy, methodology-aware generation.
- Keep this sentence in all pitch decks and hero copy variants.

---

## Concrete product promise

Replace the vague “the way we define and communicate what to build needs to change” with:

**You stop hand-copying from interviews into PRDs and re-explaining context in Jira. Jarvis produces editable, cited artifacts so decisions are traceable.**

- What changes: manual synthesis and handoff shrink; one flow from evidence to spec to tickets.
- What becomes possible: traceable decisions, edit-before-push control, and a single source of context for the team.

---

## Cursor analogy (reframed)

Do not promise “Jarvis is Cursor for PMs.” Use the analogy to set direction:

**Like Cursor in the editor, Jarvis is most valuable when it’s in your workflow — we’re building that.**

- Emphasize “Jarvis works with your stack” and “open Jarvis from Jira or Linear with context” (see Workflow embedding below).
- Avoid raising the bar to “you never leave your tools” until embedding is shipped.

---

## Why Jarvis vs alternatives

| Tool | What they do | Jarvis differentiator |
|------|----------------|------------------------|
| **Dovetail / Sprig / Notion AI** | Analyze and tag interviews; insights and themes. | Same kinds of inputs → **PRDs + tickets + citations**. Jarvis produces executable artifacts, not just analysis. |
| **Generic AI writing tools** | Draft docs or tickets in isolation. | One command → PRD + tickets + methodology in one flow, with citation-backed traceability. |

One-liner for FAQ or sales: **“We produce PRDs and tickets with citations from your evidence, not just analysis.”**

---

## Workflow embedding

**Goal:** Jarvis should live where PMs work so it’s not “a tab they forget to open.”

**V1 choice: Deep links + context (Option A)**

- “Open in Jarvis” from Jira/Linear: issue link or bookmarklet opens Jarvis with title/description pre-filled.
- Minimal engineering; improves “where you work” without new clients.
- Documented in `docs/ROADMAP.md` with implementation steps.

**Backlog (later):**

- **Option B — Browser extension:** Jarvis trigger (e.g. command bar) on Jira/Linear/Notion pages. Higher impact; more build.
- **Option C — Slack/Teams bot:** “Create PRD for [link or summary]” in Slack. Good for async PMs.

---

## Interview and usage data as differentiator

Jarvis uses interviews and usage data as direct input to PRDs and tickets, not just for analysis — so the same evidence becomes the source of record.

- If we ship dedicated interview/usage ingestion (upload or link), call this out in positioning and landing.
- If we don’t, de-emphasize “upload interviews” in pitch and double down on “context + command bar → PRD + tickets” and methodology/citations.

---

## Files that must stay aligned

- `src/pages/LandingPage.jsx` — hero, integrations, FAQ.
- Pitch deck / ProductJarvis_Prompts.docx — one claim, concrete promise, embedding direction.
