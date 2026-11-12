# ADR 0005 — AI prompt generation and reverse import of questions (slice-4.5)

Status: Accepted with the slice-4.5 PR.

## Context

Slice-4.5 lets admins/teachers build a complete prompt for an external AI tool (ChatGPT, Claude,
Gemini...) and import the AI output back into the question bank. The system must not call an AI
provider itself, schema validation before the review queue must be real, and nothing may reach the
question bank without a review step.

## Decision

1. **No provider call.** `buildAiPrompt` (`@lms/shared`) renders a deterministic prompt from level,
   skill, question type, difficulty, count (1..50) and up to 5 sample questions from the bank. The
   prompt embeds the Question Import Schema of slice-3 (same columns/enums) and asks for a JSON
   array only.
2. **Tables.** `ai_generation_requests` stores the chosen parameters, sample question ids and the
   generated prompt; `ai_generated_items` stores one imported row per position (`payload` JSON text,
   status `pending | approved | rejected | saved`). `questions.source` (`manual | ai_generated`,
   default `manual`) marks the origin. JSON text columns are display/edit only, never queried.
3. **Lifecycle** `draft -> imported -> reviewed -> saved_to_bank`:
   - submit results (JSON array or CSV, ``` fences stripped on the client) is all-or-nothing:
     every row must pass the slice-3 row validator **and** match the request's level, skill, type
     and difficulty; max 100 rows. Re-submitting is allowed only in `draft`/`imported` and replaces all items.
   - each item can be edited (re-validated) and approved/rejected; the request becomes `reviewed`
     once no item is pending, and goes back to `imported` if an item is reset to pending.
   - save requires `reviewed` and at least one approved item; it inserts approved items into
     `questions` with `source = ai_generated` in one transaction and marks them `saved`.
4. **RBAC.** Admin sees all requests; a teacher sees and acts only on their own (others → 404).
   Students/staff have no access.

## Consequences

- Reuses the slice-3 validator, so the prompt, the CSV import and the AI import share one schema.
- Automating the provider call later only replaces step 1; the review queue stays.
- Migration `20261106000000_ai_generation.sql` is additive and reversible (drops the 2 tables and
  the `questions.source` column).
