# Certidrill content factory — brief for every agent

You produce exam-preparation content for Certidrill (certidrill.com): courses and mock-exam question banks for Microsoft certifications, in **English and French**. Work in `/home/claude/afrikha/certidrill` (a clone of the repository). Your task file in `factory/tasks/` says what to produce; this brief says how.

## Rules for everyone

1. **Only write the files your task names** (your certification, your chapters or your id prefix). Never edit `course.yaml`, `blueprint.yaml`, `objectives.yaml` or another agent's files unless your task says so. No git commands. Do not spawn other agents.
2. **Original content only.** Never reproduce a question from a real exam, a dump site, a practice-test vendor or a book. Write from Microsoft Learn documentation. Fictional companies (Contoso, Fabrikam, Litware, Northwind, Adatum, Tailspin, Woodgrove, Proseware, Wingtip...).
3. **Exact and current (November 2026).** Microsoft's catalog changed a lot in 2026 and your memory may be stale. Verify with WebFetch on `learn.microsoft.com` every limit, SKU, tier, date, retirement, command name and product name you are not certain of, and **everything** for exams created in 2026 (AI-901, AI-103, AI-200, AI-300, SC-500, AZ-802, DP-750, DP-800). If you cannot verify a fact, leave it out. Current names: Microsoft Entra ID (not Azure AD), Microsoft Foundry / Azure AI Foundry as Learn names it today, Azure Monitor Agent (not MMA), Standard SKU public IP and load balancer (Basic retired).
4. **Stay inside the official study guide** of the exam: `content/<cert>/objectives.yaml` is the scope. Level of detail = what the real exam tests for that objective.
5. **French**: Microsoft Learn's French terminology. Read `content/az-104/glossary.yaml` (typography rules and terms) and `tools/questions/WRITING_GUIDE.md` §"Languages and terminology". Product names, role names, SKU names, commands, code and enum values stay in English. Straight apostrophes, a plain space before `: ; ? !`, « » quotes. Blob tiers: « niveau froid (Cool) », « niveau froid (Cold) ».
6. Everything stays `status: draft`.
7. **Final report: 2 lines, under 40 words** — counts and validator result only. Write anything else (unverified facts, doubts, deviations) in `factory/reports/<task id>.md`, not in the report.

## Role COURSE

- Read `tools/course/WRITING_GUIDE.md` fully, then two model chapters: `content/az-104/course/chapters/12-rbac.en.md` + `.fr.md` (associate/expert depth) or `content/az-900/course/chapters/23-storage.en.md` + `.fr.md` (fundamentals depth).
- One file per chapter and language: `content/<cert>/course/chapters/<id>.en.md` and `.fr.md`. Lead paragraph, then sections `<!-- section: <id> | objectives: <codes> -->` + `## Title` (plain-text title), last section `<!-- section: key-points -->`.
- Cover **every objective** assigned to the chapter, deeply enough to answer exam questions: decision tables ("requirement → answer"), limits, defaults, SKU/tier differences, prerequisites, order of operations, commands or code where the exam shows them, and `> **Exam trap.**` / `> **Piège d'examen.**` callouts for the classic confusions. Dense and concrete, no filler, no marketing.
- GFM only: paragraphs, lists, tables, fenced code (`bash`, `powershell`, `json`, `bicep`, `kusto`, `yaml`, `text` only), blockquote callouts with the two allowed labels (`Exam trap.`/`Piège d'examen.`, `Exam tip.`/`Conseil d'examen.`). No H1, no heading below H2, no image, no raw HTML, no `<` outside code spans.
- EN and FR must have the same sections, the same objectives, **identical code blocks**, the same table shapes and the same number of callouts.
- Length: associate/expert/specialty chapters 1,300–2,200 English words; fundamentals 600–1,200.
- Check: `npx tsx factory/check-cert.ts <cert> <your chapter ids...>` must show `course problems (your chapters): 0`.

## Role QUESTIONS

- Read `tools/questions/WRITING_GUIDE.md` **fully** (rules, recurring problems, file format, YAML pitfalls), `lib/questions/schema.ts`, one AZ-104 example per type you will write (table in the guide), your exam profile `factory/profiles/<cert>.md`, and the course chapters of your objectives if they exist (`content/<cert>/course/chapters/`), so that questions and course agree.
- One file per question: `content/<cert>/questions/<domain>/<id>.yaml`; `id` = file name, starts with **your prefix**; `objective` is a quoted code of your assignment; `status: draft`; `difficulty` 1–3 following the profile's mix.
- Respect your **count per objective** (±1) and your **type mix**. Vary what is tested inside an objective: never two questions on the same decision with the same answer. Vary the position of correct options.
- Realism: same formats, stem style, length and difficulty as the real exam (profile). Plausible distractors from the same product family; exactly one defensible answer; every constraint that decides the answer is stated.
- Every question: `explanation.correct` (2–4 sentences), `explanation.options` for each wrong option of `single`/`multi`, and 1–2 `references` to Microsoft Learn pages **that you fetched** (title = page title, `https://learn.microsoft.com/en-us/...`).
- Scoring NOTE sentence on per-element types, as the guide says.
- Check: `CERT=<cert> npx tsx factory/validate.ts --prefix <your prefix>` must report `0 problem(s)`. Then reread your batch once as a candidate: fix giveaways, ambiguity, and French.

## Role CASES (case studies and Yes/No series)

- Same reading as QUESTIONS, plus the examples `content/az-104/case-studies/cs-northwind-clinics.yaml` with its `cs-nw-*` questions and `content/az-104/series/series-auditors-read.yaml` with its questions.
- Case study: a company scenario in tabs (overview, existing environment, requirements...) with 5–6 questions of mixed types across domains; the answers must depend on the case text. Series: one scenario, 3 questions that each propose a different solution, at least one Yes and one No.
- Files: `content/<cert>/case-studies/<id>.yaml`, `content/<cert>/series/<id>.yaml`, questions in `questions/<domain>/`. Validate with the same command and your prefix.

## Role ARCHITECT

See the task file: it lists the steps.
