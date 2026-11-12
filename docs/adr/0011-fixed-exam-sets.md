# ADR 0011 — Fixed exam sets (slice-11a)

Status: Accepted with the slice-11a PR.

## Context

Slice-4 draws every paper at random from the bank (level + skill). Centres also run fixed papers
(mock tests, official sample papers) where every student must get the same questions, and the
same set is reused across intakes. Results already store a per-attempt snapshot (ADR 0002), so a
set only has to be stable while attempts are drawn from it.

## Decision

1. **Model.** `exam_sets` (title, level, skill, status `draft | published | archived`) with ordered
   `exam_set_items` (position, bank question). Questions stay in `questions`; ones typed inside a set
   get `source = 'exam_set'` and are excluded from random draws, so a set stays secret.
2. **Immutability.** Only `draft` sets change. Publish checks every item (same level/skill; multiple
   choice has ≥ 2 options and an answer matching one of them) and freezes the set. DB triggers
   enforce it too: published/archived sets and their items cannot change (except published →
   archived) or be deleted, and a bank question held by a non-draft set cannot be edited or deleted
   (`restrict_violation`, API 409). A new version = “Duplicate” into a fresh draft.
3. **Exam mode.** `exams.mode = random | fixed_set`. A fixed exam links 1..10 published sets of the
   same level/skill (`exam_set_links`, ordered; the first is `exams.exam_set_id`), its question count
   is the first set's size, and it may shuffle questions and/or multiple-choice options. When options
   are shuffled a letter answer is rewritten to the option text before the snapshot, so grading is
   unchanged.
4. **Retakes.** `same_set_shuffled` (default): the retake reshuffles questions and options and never
   repeats the previous order. `alternate_sets`: each attempt takes the next linked set the student
   has not sat (`exam_attempts.exam_set_id`); when none is left the start fails with
   `paper_unavailable`.
5. **Access.** `/exam-sets` endpoints are Admin/Teacher only. Students never read a set; they only
   get answer-less questions through an attempt in the exam window.

## Consequences

- Archiving a set does not affect exams that already link it; old attempts keep their snapshot.
- Fixing a typo in a published set means duplicate → edit → publish → create a new exam.
- Word/Excel import of sets (slice-11b) and question images (slice-12) build on this model.
