# Instructions for a course-correction agent (after the end-of-chapter quizzes)

Working directory: /home/claude/afrikha/certidrill (no git here; never run git).

The quiz writers listed, in `factory/reports/QZ-<cert>-<chapter>.md`, the places where a chapter or a mock-exam question is out of date or wrong against current Microsoft Learn. Your job is to verify those findings and fix what is confirmed, for the chapters of your task file only. The finished AZ-104 pass is the model: read `factory/reports/FIX-az-104-compute.md` first (format and level of care).

Read first: `factory/BRIEF.md` (rules for everyone, roles COURSE and QUESTIONS), `tools/course/WRITING_GUIDE.md`, `tools/questions/WRITING_GUIDE.md`, `lib/questions/schema.ts`, the exam profile `factory/profiles/<cert>.md` (current names, retirements, French glossary), then for each chapter: the QZ report, the chapter `.en.md` and `.fr.md`, and the quiz `content/<cert>/quizzes/<chapter>.yaml`.

## What you may change (nothing else: other agents work on the other chapters at the same time)

1. **Your chapters**, `content/<cert>/course/chapters/<chapter>.en.md` and `.fr.md`. Every change in both languages, same sections, tables, callouts and section markers (`<!-- section: … | objectives: … -->` untouched). Keep "Key points" consistent with the body.
2. **Mock-exam questions whose `objective` is one of your chapters' objectives** (grep the codes in `content/<cert>/questions/`, all subfolders, case studies and series included). Change one only when a verified Learn fact contradicts it:
   - wrong explanation → fix the explanation (EN + FR);
   - wrong answer, or an option that is now also correct → fix the answer, options or stem so exactly the intended answer is right;
   - a **preview** or **retired** feature as the correct answer → rewrite the question so the correct answer is a generally available feature, same id, type, objective and difficulty. Exception: if the exam objective itself names that preview feature, keep it and flag it in the report;
   - keep `status: draft`, never delete a question, never change an id.
3. **Your quiz files**, only if a chapter fix makes one of their answers or explanations wrong.

French: apply the glossary of the profile and of `tools/course/WRITING_GUIDE.md` (for example « peering », never « appairé(s) »). Fix such French terms in your chapters even if no report mentions them.

## Rules

- Facts must be current (November 2026). Verify every finding on learn.microsoft.com with WebFetch before changing anything; a finding you can't confirm is left unchanged and reported as "not confirmed". An hourly fetch limit exists: if hit, wait and retry.
- Prefer the most specific, most recent Learn page when two pages disagree; if it stays ambiguous, change nothing and flag it for a human decision.
- Additions are short: a sentence, a table row or a bullet. Don't rewrite sections that are right. No marketing tone.
- Don't add references to pages you didn't fetch.
- Decisions that belong to the owner (SLA figures not on Learn, naming choices, preview features required by an objective, glossary terms not yet decided) are flagged, not decided.

## Done when

- `npx tsx factory/check-cert.ts <cert> <your chapters…>` → 0 problems;
- `npm run -s content:validate -- --cert <cert>` → 0 problems and 0 warnings for your files (a problem in another chapter's files belongs to another agent: wait a few minutes and rerun; never edit it);
- `npx tsx factory/check-quiz.ts <cert> <your chapters…>` → 0 problems, 0 warnings (a bank stem you rewrote must not come close to a quiz stem).

## Report

Write `factory/reports/FIX-<cert>-<n>.md` (the name is in your task file), in the format of the AZ-104 model: one table per chapter (Finding | Learn | Change), then "Mock-exam bank questions changed" (id, what changed, why), "Checked and left unchanged", and "For a human decision". Final message: 3–5 lines (chapters fixed, number of bank questions changed, checks, points for a human decision).
