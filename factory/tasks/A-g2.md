# Task A-g2 — role ARCHITECT for: AZ-305, AZ-700

Read `factory/BRIEF.md` first. For **each** certification above, in `content/<code>/` (lowercase code, e.g. `az-305`):

1. WebFetch the official study guide, English then French:
   `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/<code>` and the same URL with `fr-fr`.
   If the exam is retired, in beta without a study guide, or the page does not exist: write `content/<code>/NOT-AVAILABLE.md` (two lines: why, source URL), report it, and go to the next certification.
2. Find the exam facts on the certification / exam page on Microsoft Learn (WebSearch + WebFetch): exam duration, passing score, whether it has case studies or labs. Microsoft does not publish the number of questions.
3. Write `blueprint.yaml` by copying the structure of `content/az-104/blueprint.yaml` (keep `readiness` and `progression` values; rewrite the 10 level titles en/fr for this certification) and `content/az-900/blueprint.yaml` (a fundamentals example without case study). Set:
   - `certification`: code, official title, vendor Microsoft, `active: false`;
   - `blueprint.version`: the "Skills measured as of" date, ISO format, quoted;
   - `durationMin`: real exam time; `questionCount`: fundamentals `{min: 35, max: 45}`, other levels `{min: 45, max: 58}`;
   - `typeMix`, `difficultyMix`: fundamentals as AZ-900; other levels as AZ-104 unless the exam clearly differs (for example code-heavy developer exams: more `dropdown` with code);
   - `structure.caseStudies`: fundamentals `count {min: 0, max: 0}`, `questionsEach {min: 0, max: 0}`; other levels `count {min: 1, max: 1}`, `questionsEach {min: 4, max: 6}`;
   - `structure.series`: fundamentals `count {min: 0, max: 0}`, `questionsEach {min: 0, max: 0}`; other levels `count {min: 1, max: 1}`, `questionsEach {min: 3, max: 3}`;
   - `domains`: one per skill area of the study guide, short lowercase `code` (letters, digits, hyphens), `order`, `weight` (shares 0..1), titles en/fr (official French titles).
   - A header comment: source, skills-measured date, date checked (2026-11-16), exam time.
4. Write `objectives.yaml` in the format of `content/az-900/objectives.yaml`: every functional group and every bullet of the study guide, codes `<domain order>.<group order>.<n>`, English verbatim, French from the fr-fr page (straight apostrophes).
5. Write `course/course.yaml` in the format of `content/az-900/course/course.yaml`: modules (`intro` + one per domain), chapters = `00-getting-started` (module `intro`) + **one chapter per functional group** (split a group of more than 9 objectives in two chapters; merge two groups of 1–2 objectives of the same domain), ids `<domain order><n>-<slug>`, `status: draft`, `free: true` on `00-getting-started` and on the first chapter only, titles en/fr, `minutes` 10–25, `references: []`. Do not write the chapter files.
6. Write `factory/plans/<code>.json`: `{"level": "fundamentals|associate|expert|specialty", "chapters": [{"id": "<chapter id>", "objectives": ["1.1.1", ...]}, ...]}` — every objective in exactly one chapter, `00-getting-started` with an empty list.
7. Write `factory/profiles/<code>.md` (150–300 words, English): what the real exam is like — duration, formats really used, stem style and length, how hands-on (commands, code, portal steps, design trade-offs), typical traps, what is out of scope, target difficulty mix, and for exams created in 2026 the reminder that every fact must be fetched from Learn.
8. Check each certification: `npx tsx factory/check-cert.ts <code>` must print `referential OK` (course problems about missing chapter files are expected at this stage).

Report per certification: skills-measured date, number of domains / objectives / chapters, exam time, anything unusual.
