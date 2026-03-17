# ProductJarvis — Coding Agent Session
### Building the AI-Powered PRD Intelligence Engine
**Session Date:** March 2, 2026 | **Duration:** ~3.5 hrs | **Tool:** Claude Code

---

## Context

ProductJarvis is an AI operating system for product managers — think Cursor, but for PMs. The core insight: PMs spend 60–70% of their time on structured thinking work (PRDs, roadmaps, prioritization) that follows repeatable patterns. ProductJarvis automates that scaffolding and lets PMs focus on judgment calls.

This session documents building the **Intelligent PRD Engine** — the feature that takes a rough product idea and generates a structured, context-aware PRD with dynamic follow-up questions, competitive framing, and a RICE-scored feature backlog. It uses the Anthropic API with multi-turn reasoning and streams the output in real time.

---

## Session Log

### 00:00 — Starting Point

I had a basic `/generate-prd` endpoint returning a blob of text from a single prompt. The output was generic — no structure, no prioritization, no awareness of industry context. Users were copy-pasting it into Notion and manually reformatting everything. That defeated the whole point.

**Goal for this session:** Rebuild the PRD engine from scratch with:
1. Multi-turn clarification (ask before assuming)
2. Structured JSON output (sections, features, RICE scores)
3. Streaming to the frontend so it feels alive
4. Supabase persistence so users can version their PRDs

---

### 00:12 — Designing the Schema First

Before touching the API, I asked the agent to help me design the data model.

**Prompt to agent:**
```
I'm building a PRD generator for ProductJarvis. PRDs need to be versioned,
linked to a product/project, and store both the raw AI output and a 
structured JSON breakdown. Design a Supabase schema for this. Also think
about how clarification questions and user answers get stored — 
I want to replay the generation context later.
```

**Agent output:**

```sql
-- Products table (top-level workspace)
create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  industry text,
  stage text check (stage in ('idea', 'mvp', 'growth', 'scale')),
  created_at timestamptz default now()
);

-- PRD documents with versioning
create table prds (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products on delete cascade not null,
  version integer not null default 1,
  title text not null,
  status text check (status in ('draft', 'in_review', 'approved')) default 'draft',
  raw_prompt text,                    -- original user input
  clarification_context jsonb,        -- Q&A pairs from clarification phase
  structured_output jsonb,            -- parsed sections, features, RICE scores
  raw_markdown text,                  -- full streamed output stored
  generation_metadata jsonb,          -- model, tokens, latency
  created_at timestamptz default now(),
  unique(product_id, version)
);

-- Features extracted from PRDs (queryable separately)
create table prd_features (
  id uuid primary key default gen_random_uuid(),
  prd_id uuid references prds on delete cascade not null,
  name text not null,
  description text,
  reach_score integer check (reach_score between 1 and 10),
  impact_score integer check (impact_score between 1 and 10),
  confidence_score integer check (confidence_score between 1 and 10),
  effort_score integer check (effort_score between 1 and 10),
  rice_score numeric generated always as (
    (reach_score * impact_score * confidence_score::numeric / 10) / effort_score
  ) stored,
  priority_tier text,
  created_at timestamptz default now()
);

-- Row-level security
alter table products enable row level security;
alter table prds enable row level security;
alter table prd_features enable row level security;

create policy "users own their products"
  on products for all using (auth.uid() = user_id);

create policy "users own their prds"
  on prds for all using (
    product_id in (select id from products where user_id = auth.uid())
  );
```

I pushed back on one thing — the generated RICE column. Asked the agent:

**Me:** "The generated column is clean but I want PMs to be able to manually override RICE scores. Generated columns can't be updated. How do we handle this?"

**Agent:** "Good catch. Two options: (1) drop the generated column and compute RICE in a view, or (2) add a `rice_override` nullable column and resolve it in a DB function. Option 2 keeps the auto-score as a reference while allowing overrides."

Went with option 2. This kind of back-and-forth is where the agent earns its keep — it surfaces the tradeoff instead of just complying.

---

### 00:41 — Building the Clarification Engine

The PRD generator's secret weapon is that it asks 2–3 sharp clarifying questions *before* generating anything. Generic input → generic output. The clarification step forces specificity.

**Prompt to agent:**
```
Build a clarification engine in TypeScript. It takes a rough product idea
and returns 2-3 targeted follow-up questions. The questions should be
dynamic — a B2B SaaS idea gets different questions than a consumer app.
Use the Anthropic SDK with streaming. Return structured JSON, not prose.
```

**Agent built:**

```typescript
// lib/clarification-engine.ts
import Anthropic from "@anthropic-ai/sdk";

interface ClarificationQuestion {
  id: string;
  question: string;
  rationale: string; // why this question matters for PRD quality
  field_type: "text" | "select" | "multiselect";
  options?: string[];
}

interface ClarificationResponse {
  questions: ClarificationQuestion[];
  detected_context: {
    product_type: "b2b_saas" | "consumer" | "marketplace" | "platform" | "hardware" | "other";
    industry_signals: string[];
    maturity_signals: string[];
  };
}

const CLARIFICATION_SYSTEM_PROMPT = `You are a senior product manager helping
structure a product requirements document. Your job is to identify the 2-3 most
important missing pieces of information that would meaningfully change the PRD.

Rules:
- Never ask about things already stated in the input
- Prioritize: target user, core job-to-be-done, success metric, key constraint
- For B2B: ask about buyer vs user distinction, integration requirements
- For consumer: ask about acquisition channel, retention mechanism
- Return only valid JSON matching the ClarificationResponse schema
- Be specific, not generic ("Who is your primary user?" is too vague)`;

export async function generateClarifications(
  productIdea: string,
  existingContext?: Record<string, string>
): Promise<ClarificationResponse> {
  const client = new Anthropic();

  const contextStr = existingContext
    ? `\n\nExisting context: ${JSON.stringify(existingContext)}`
    : "";

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: CLARIFICATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Product idea: ${productIdea}${contextStr}\n\nGenerate clarifying questions as JSON.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  // Strip markdown fences if present
  const jsonStr = content.text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(jsonStr) as ClarificationResponse;
}
```

**Problem I hit:** The model was sometimes wrapping JSON in markdown fences, sometimes not. The `.replace()` strip worked but felt brittle.

**Me to agent:** "This JSON parsing is fragile. What's the most robust pattern here?"

**Agent:** "Use `response_format` if available, otherwise bracket-extract: find the first `{` and last `}` and slice. Also worth wrapping in a Zod schema so malformed output throws a typed error instead of a silent bad parse."

Added Zod validation:

```typescript
import { z } from "zod";

const ClarificationSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      rationale: z.string(),
      field_type: z.enum(["text", "select", "multiselect"]),
      options: z.array(z.string()).optional(),
    })
  ),
  detected_context: z.object({
    product_type: z.enum(["b2b_saas", "consumer", "marketplace", "platform", "hardware", "other"]),
    industry_signals: z.array(z.string()),
    maturity_signals: z.array(z.string()),
  }),
});

// Robust JSON extraction
function extractJSON(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(text.slice(start, end + 1));
}

export async function generateClarifications(
  productIdea: string,
  existingContext?: Record<string, string>
): Promise<z.infer<typeof ClarificationSchema>> {
  // ... (API call as above)
  const raw = extractJSON(content.text);
  return ClarificationSchema.parse(raw); // throws ZodError on bad shape
}
```

This became a pattern I used everywhere in the codebase. Zod as the contract between the LLM and the rest of the app.

---

### 01:20 — The PRD Generator with Streaming

With clarifications answered, the generator runs. This is the centerpiece — it needs to stream because a full PRD takes 30–45 seconds to generate and a spinner for that long kills UX.

**Prompt to agent:**
```
Build a streaming PRD generator. Input: product idea + clarification Q&A.
Output: structured markdown PRD streamed in real time via SSE, PLUS a
final structured JSON object at the end with extracted features and RICE
scores. The trick is I need both the stream for UX and the parsed JSON for
DB storage. How do I handle this without two separate API calls?
```

**Agent's approach — buffer the stream, parse at end:**

```typescript
// lib/prd-generator.ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const PRD_SYSTEM_PROMPT = `You are ProductJarvis, an AI product management expert.
Generate a comprehensive PRD in two parts separated by "---JSON_PAYLOAD---":

PART 1: Full PRD in clean markdown with these sections:
## Problem Statement
## Target Users & Jobs-to-be-Done  
## Solution Overview
## Feature Requirements (with P0/P1/P2 tiers)
## Success Metrics
## Assumptions & Risks
## Out of Scope

PART 2: After "---JSON_PAYLOAD---", output only valid JSON:
{
  "title": string,
  "features": [{
    "name": string,
    "description": string,
    "priority_tier": "P0"|"P1"|"P2",
    "reach_score": 1-10,
    "impact_score": 1-10,
    "confidence_score": 1-10,
    "effort_score": 1-10
  }],
  "success_metrics": [{"metric": string, "target": string, "timeframe": string}],
  "risks": [{"risk": string, "mitigation": string, "severity": "low"|"medium"|"high"}]
}

Be specific and opinionated. A vague PRD is useless.`;

export async function* streamPRD(
  productIdea: string,
  clarificationContext: Record<string, string>,
  productContext: { name: string; industry: string; stage: string }
): AsyncGenerator<{ type: "chunk"; text: string } | { type: "complete"; structured: unknown }> {
  const client = new Anthropic();

  const userMessage = `
Product: ${productContext.name}
Industry: ${productContext.industry}  
Stage: ${productContext.stage}
Idea: ${productIdea}

Clarifications:
${Object.entries(clarificationContext)
  .map(([q, a]) => `Q: ${q}\nA: ${a}`)
  .join("\n\n")}

Generate the PRD.`;

  let fullText = "";

  const stream = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: PRD_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    stream: true,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const chunk = event.delta.text;
      fullText += chunk;

      // Only stream the markdown part (before the JSON payload)
      if (!fullText.includes("---JSON_PAYLOAD---")) {
        yield { type: "chunk", text: chunk };
      }
    }

    if (event.type === "message_stop") {
      // Split and parse the JSON payload
      const parts = fullText.split("---JSON_PAYLOAD---");
      const markdownPRD = parts[0].trim();
      const jsonStr = parts[1]?.trim() ?? "{}";

      let structured: unknown;
      try {
        structured = JSON.parse(jsonStr);
      } catch {
        // Fallback: try robust extraction
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        structured =
          start !== -1 ? JSON.parse(jsonStr.slice(start, end + 1)) : {};
      }

      yield {
        type: "complete",
        structured: { markdown: markdownPRD, ...structured as object },
      };
    }
  }
}
```

Then the API route wires this to SSE:

```typescript
// app/api/prd/generate/route.ts
import { NextRequest } from "next/server";
import { streamPRD } from "@/lib/prd-generator";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { productId, idea, clarifications } = await req.json();

  const supabase = createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (!product) return new Response("Product not found", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let structuredPayload: unknown = null;

      for await (const event of streamPRD(idea, clarifications, product)) {
        if (event.type === "chunk") {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ chunk: event.text })}\n\n`)
          );
        } else if (event.type === "complete") {
          structuredPayload = event.structured;
        }
      }

      // Persist to Supabase after stream completes
      if (structuredPayload) {
        const payload = structuredPayload as {
          markdown?: string;
          title?: string;
          features?: Array<{
            name: string;
            description: string;
            priority_tier: string;
            reach_score: number;
            impact_score: number;
            confidence_score: number;
            effort_score: number;
          }>;
        };
        const { data: prd } = await supabase
          .from("prds")
          .insert({
            product_id: productId,
            title: payload.title ?? "Untitled PRD",
            raw_prompt: idea,
            clarification_context: clarifications,
            structured_output: structuredPayload,
            raw_markdown: payload.markdown,
            generation_metadata: { model: "claude-opus-4-5" },
          })
          .select()
          .single();

        // Insert extracted features
        if (prd && payload.features?.length) {
          await supabase.from("prd_features").insert(
            payload.features.map((f) => ({
              prd_id: prd.id,
              name: f.name,
              description: f.description,
              priority_tier: f.priority_tier,
              reach_score: f.reach_score,
              impact_score: f.impact_score,
              confidence_score: f.confidence_score,
              effort_score: f.effort_score,
            }))
          );
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, prdId: prd?.id })}\n\n`)
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

---

### 02:15 — The Bug That Took 40 Minutes

The stream was working — PRD generating beautifully — but the Supabase insert was consistently failing silently. The `prd` object came back null, no error thrown.

**Me to agent:** "The insert returns null but no error. Supabase client is initialized correctly — I can read from it fine. What's going on?"

Agent suggested checking RLS policies first. I checked — policies looked right.

**Agent:** "Try adding `.throwOnError()` to the insert chain to surface the actual Postgres error."

Did that. Error: `new row violates row-level security policy for table "prds"`.

**Agent:** "The server-side Supabase client in Next.js App Router needs to use the service role key for inserts, or you need to pass the user's JWT through. If you're using the anon key server-side, RLS sees an unauthenticated request."

That was it. I was using `createClient()` which used the anon key. Fixed:

```typescript
// lib/supabase/server.ts — added service role client for server operations
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypasses RLS intentionally
    { auth: { persistSession: false } }
  );
}
```

And in the route, used `createServiceClient()` for the insert after authenticating the user separately via the regular client. RLS handled read security; service role handled trusted server writes.

Forty minutes on a one-line fix. But the agent walked me straight to it once I gave it the actual error message.

---

### 02:58 — RICE Prioritization View

With features stored, I wanted a query that returns features ranked by RICE score across all a user's PRDs — a global backlog view. Asked the agent to write the SQL:

```sql
-- views/user_feature_backlog.sql
create or replace view user_feature_backlog as
select
  pf.id,
  pf.name,
  pf.description,
  pf.priority_tier,
  pf.reach_score,
  pf.impact_score,
  pf.confidence_score,
  pf.effort_score,
  coalesce(
    pf.rice_override,
    (pf.reach_score * pf.impact_score * (pf.confidence_score::numeric / 10)) / pf.effort_score
  ) as rice_score,
  p.title as prd_title,
  pr.name as product_name,
  pr.id as product_id,
  pr.user_id
from prd_features pf
join prds p on p.id = pf.prd_id
join products pr on pr.id = p.product_id
order by rice_score desc;
```

This view becomes the backbone of the "Global Backlog" feature — PMs can see priorities across all their products in one ranked list.

---

### 03:22 — What This Session Built

By end of session:

- **Supabase schema:** Products → PRDs (versioned) → Features (RICE-scored, overridable)
- **Clarification engine:** Dynamic Q generation with Zod-validated JSON output
- **PRD generator:** Streaming markdown + structured JSON in one API call, split by delimiter
- **SSE route:** Real-time streaming to frontend with async Supabase persistence
- **Global backlog view:** Cross-product RICE-ranked feature SQL view

**Biggest lesson:** The agent is fastest when you give it a real constraint, not an open question. "Build a PRD generator" gets you boilerplate. "I need streaming output AND parsed JSON from the same API call without two requests — how?" gets you a specific, clever solution.

---

## Live Output Sample

Below is an actual excerpt from a PRD generated for CareBow through this engine during a test run:

```markdown
## Problem Statement

In India, 300M+ elderly individuals live at home with chronic conditions,
yet coordinated home care — connecting family, caregivers, doctors, and 
diagnostics — does not exist as a managed system. Families operate as 
informal care coordinators with no tools, no clinical oversight, and no
single source of truth for a patient's care state.

## Target Users & Jobs-to-be-Done

**Primary User:** Adult children (28–45) managing a parent's care remotely
- JTBD: "Help me know my parent is being cared for without moving back home"

**Secondary User:** Home caregiver (trained/semi-trained)
- JTBD: "Give me clear instructions and a way to report back to the family"

## Feature Requirements

### P0 — Launch Blockers
| Feature | Description |
|---|---|
| AI Care Assessment | Dynamic symptom intake with follow-up Q logic |
| Caregiver Matching | Profile-based match with background check integration |
| Care Plan Generator | AI-structured daily/weekly plan per patient condition |
| Family Dashboard | Real-time care status, alerts, vitals log |

### P1 — Growth Features
...

## Success Metrics

| Metric | Target | Timeframe |
|---|---|---|
| Care plans activated | 500 | 90 days post-launch |
| Caregiver match rate | >80% within 48hrs | 60 days |
| Family NPS | >55 | 90 days |
```

---

*ProductJarvis — built by Manvendra Kumar*
*GitHub: github.com/mopshyai | Web: productjarvis.com*
