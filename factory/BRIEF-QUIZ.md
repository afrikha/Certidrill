# End-of-chapter quiz — brief (read after factory/BRIEF.md)

A quiz closes each course chapter (except `00-getting-started`). It consolidates the chapter, then checks the learner is at exam level. **10 questions, in order of increasing difficulty.** These questions are **never** part of the mock exams: they live in their own file, outside `questions/`, and must not repeat any mock-exam question.

## File

`content/<cert>/quizzes/<chapterId>.yaml`:

```yaml
chapter: 12-rbac
questions:
  - id: az104-qz-12-01
    objective: "1.2.1"
    difficulty: 1
    status: draft
    type: single
    stem: { en: "...", fr: "..." }
    body: { ... }
    answer: { ... }
    explanation: { correct: { en, fr }, options: { b: { en, fr }, ... } }
    references:
      - title: ...
        url: https://learn.microsoft.com/en-us/...
  - id: az104-qz-12-02
    ...
```

Each item is a question exactly as in the bank (`lib/questions/schema.ts`, `tools/questions/WRITING_GUIDE.md`): same fields, same types, same rules (explanations for every wrong option of `single`/`multi`, scoring NOTE on per-element types, references to Learn pages you fetched, English and French). Only differences: they sit in one list, in order, and the id is `<cert without dashes>-qz-<chapter number>-<01..10>` (position in the quiz).

## The ten positions

| Position | Purpose | difficulty | Style |
| --- | --- | --- | --- |
| 1–2 | Recall the core notions of the chapter | 1 | short stem, one fact, `single` (or a simple `multi`/`yesno_statements`) |
| 3–5 | Apply: choose the right setting, tool or command in a short situation | 2 (position 3 may stay 1) | 2–3 sentence situation; `single`, `multi`, `dropdown`, `yesno_statements` |
| 6–10 | **Exam level**: as hard as the hardest questions of the real exam | 3 | full exam scenario (company, existing setup, requirements, constraint that decides: least cost, least administrative effort, minimum permissions...); several facts to combine; plausible distractors that are each wrong for one precise reason |

- Difficulty never goes down from 1 to 5; 6 to 10 must feel progressively harder too (10 = the hardest of the chapter).
- Positions 6–10 use **at least two exam formats other than `single`** (`multi`, `dropdown`, `dragdrop`, `ordering`, `yesno_statements`, `hotarea`), as the real exam does. No case study, no series.
- Cover **every objective of the chapter** at least once over the 10 (the task lists them). The hard questions go to the objectives the real exam tests most hardly (traps of the chapter's `Exam trap.` callouts are good material).
- The quiz tests **what the chapter teaches**: a learner who read it carefully can answer 1–5; 6–10 require combining the chapter with exam-style reasoning, never a fact absent from the chapter and from the study guide.

## Not in the mock exam

- Read the mock-exam questions of your objectives first (`content/<cert>/questions/<domain>/`, grep `objective: "x.y.z"`). Do not reuse their scenario, their decision with the same answer, or their wording. Test other decisions, other traps, other combinations.
- The checker refuses an id already used anywhere and a stem whose wording is close to a mock-exam stem.

## Check

`npx tsx factory/check-quiz.ts <cert> <chapterId>` → `0 problem(s)`. Warnings (reference host, terminology) must be fixed too.

Doubts and unverified facts go to `factory/reports/<task id>.md` (BRIEF rule 7). Final report: 2 lines.
