"""Generates agent task files. Usage:
  make_tasks.py architect <group> <cert...>
  make_tasks.py course <cert>
  make_tasks.py questions <cert>
  make_tasks.py cases <cert>
"""
import sys, os, json, math, yaml
ROOT = "/home/claude/afrikha/certidrill"
T = os.path.join(ROOT, "factory", "tasks")
mode, *args = sys.argv[1:]

def write(name, text):
    open(os.path.join(T, name + ".md"), "w", encoding="utf8").write(text)
    print(name)

def load(cert):
    bp = yaml.safe_load(open(f"{ROOT}/content/{cert}/blueprint.yaml", encoding="utf8"))
    obj = yaml.safe_load(open(f"{ROOT}/content/{cert}/objectives.yaml", encoding="utf8"))
    plan_file = f"{ROOT}/factory/plans/{cert}.json"
    plan = json.load(open(plan_file, encoding="utf8")) if os.path.exists(plan_file) else {}
    return bp, obj, plan

if mode == "architect":
    group, certs = args[0], args[1:]
    write(f"A-{group}", f"""# Task A-{group} — role ARCHITECT for: {', '.join(c.upper() for c in certs)}

Read `factory/BRIEF.md` first. For **each** certification above, in `content/<code>/` (lowercase code, e.g. `az-305`):

1. WebFetch the official study guide, English then French:
   `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/<code>` and the same URL with `fr-fr`.
   If the exam is retired, in beta without a study guide, or the page does not exist: write `content/<code>/NOT-AVAILABLE.md` (two lines: why, source URL), report it, and go to the next certification.
2. Find the exam facts on the certification / exam page on Microsoft Learn (WebSearch + WebFetch): exam duration, passing score, whether it has case studies or labs. Microsoft does not publish the number of questions.
3. Write `blueprint.yaml` by copying the structure of `content/az-104/blueprint.yaml` (keep `readiness` and `progression` values; rewrite the 10 level titles en/fr for this certification) and `content/az-900/blueprint.yaml` (a fundamentals example without case study). Set:
   - `certification`: code, official title, vendor Microsoft, `active: false`;
   - `blueprint.version`: the "Skills measured as of" date, ISO format, quoted;
   - `durationMin`: real exam time; `questionCount`: fundamentals `{{min: 35, max: 45}}`, other levels `{{min: 45, max: 58}}`;
   - `typeMix`, `difficultyMix`: fundamentals as AZ-900; other levels as AZ-104 unless the exam clearly differs (for example code-heavy developer exams: more `dropdown` with code);
   - `structure.caseStudies`: fundamentals `count {{min: 0, max: 0}}`, `questionsEach {{min: 0, max: 0}}`; other levels `count {{min: 1, max: 1}}`, `questionsEach {{min: 4, max: 6}}`;
   - `structure.series`: fundamentals `count {{min: 0, max: 0}}`, `questionsEach {{min: 0, max: 0}}`; other levels `count {{min: 1, max: 1}}`, `questionsEach {{min: 3, max: 3}}`;
   - `domains`: one per skill area of the study guide, short lowercase `code` (letters, digits, hyphens), `order`, `weight` (shares 0..1), titles en/fr (official French titles).
   - A header comment: source, skills-measured date, date checked (2026-11-16), exam time.
4. Write `objectives.yaml` in the format of `content/az-900/objectives.yaml`: every functional group and every bullet of the study guide, codes `<domain order>.<group order>.<n>`, English verbatim, French from the fr-fr page (straight apostrophes).
5. Write `course/course.yaml` in the format of `content/az-900/course/course.yaml`: modules (`intro` + one per domain), chapters = `00-getting-started` (module `intro`) + **one chapter per functional group** (split a group of more than 9 objectives in two chapters; merge two groups of 1–2 objectives of the same domain), ids `<domain order><n>-<slug>`, `status: draft`, `free: true` on `00-getting-started` and on the first chapter only, titles en/fr, `minutes` 10–25, `references: []`. Do not write the chapter files.
6. Write `factory/plans/<code>.json`: `{{"level": "fundamentals|associate|expert|specialty", "chapters": [{{"id": "<chapter id>", "objectives": ["1.1.1", ...]}}, ...]}}` — every objective in exactly one chapter, `00-getting-started` with an empty list.
7. Write `factory/profiles/<code>.md` (150–300 words, English): what the real exam is like — duration, formats really used, stem style and length, how hands-on (commands, code, portal steps, design trade-offs), typical traps, what is out of scope, target difficulty mix, and for exams created in 2026 the reminder that every fact must be fetched from Learn.
8. Check each certification: `npx tsx factory/check-cert.ts <code>` must print `referential OK` (course problems about missing chapter files are expected at this stage).

Report per certification: skills-measured date, number of domains / objectives / chapters, exam time, anything unusual.
""")

elif mode == "course":
    cert = args[0]; bp, obj, plan = load(cert)
    level = plan.get("level", "associate")
    chapters = plan["chapters"]
    per = 8 if level == "fundamentals" else 4
    for i in range(0, len(chapters), per):
        chunk = chapters[i:i + per]
        lines = "\n".join(f"- `{c['id']}` — objectives: {', '.join(c['objectives']) or '(none: exam format, how to read questions, confusing pairs, study plan — model: content/az-900/course/chapters/00-getting-started.*, adapted to this exam using factory/profiles/' + cert + '.md)'}" for c in chunk)
        write(f"C-{cert}-{i // per + 1}", f"""# Task C-{cert}-{i // per + 1} — role COURSE, certification {cert.upper()} ({level})

Read `factory/BRIEF.md` (rules + role COURSE), `factory/profiles/{cert}.md`, `content/{cert}/objectives.yaml` and `content/{cert}/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/{cert}/course/chapters/<id>.en.md` and `.fr.md`):

{lines}

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts {cert} {' '.join(c['id'] for c in chunk)}`
""")

elif mode in ("questions", "cases"):
    cert = args[0]; bp, obj, plan = load(cert)
    b = bp["blueprint"]; short = cert.replace("-", "")
    mix = {k: (v["min"] + v["max"]) / 2 for k, v in b["typeMix"].items()}
    tot = sum(mix.values()); mix = {k: v / tot for k, v in mix.items()}
    dm = b["difficultyMix"]
    cs_n = b["structure"]["caseStudies"]["count"]["max"]; sr_n = b["structure"]["series"]["count"]["max"]
    cs_q = (10 * cs_n + (1 if cs_n else 0)) * 5; sr_q = (10 * sr_n + (1 if sr_n else 0)) * 3
    total = plan.get("bankTotal") or math.ceil(b["questionCount"]["max"] * 10 * 1.05)
    standalone = total - cs_q - sr_q
    if mode == "cases":
        n_cs = 10 * cs_n + (1 if cs_n else 0); n_sr = 10 * sr_n + (1 if sr_n else 0)
        k = 0
        for i in range(0, n_cs, 3):
            k += 1; n = min(3, n_cs - i)
            write(f"K-{cert}-cs{k}", f"""# Task K-{cert}-cs{k} — role CASES, certification {cert.upper()}

Read `factory/BRIEF.md` (rules + roles QUESTIONS and CASES) and `factory/profiles/{cert}.md`.

Write **{n} case studies**, each with **5 or 6 questions** spread over at least three domains of `content/{cert}/objectives.yaml`, in a different industry and architecture each (list the existing files of `content/{cert}/case-studies/` first and choose other companies).
Id prefix for case studies and their questions: `{short}-cs{k}` (e.g. `{short}-cs{k}a-<company>`, questions `{short}-cs{k}a-<topic>`).
Check: `CERT={cert} npx tsx factory/validate.ts --prefix {short}-cs{k}` → `0 problem(s)`.
""")
        k = 0
        for i in range(0, n_sr, 6):
            k += 1; n = min(6, n_sr - i)
            write(f"K-{cert}-sr{k}", f"""# Task K-{cert}-sr{k} — role CASES, certification {cert.upper()}

Read `factory/BRIEF.md` (rules + roles QUESTIONS and CASES) and `factory/profiles/{cert}.md`.

Write **{n} Yes/No series** of exactly 3 questions each ("does this solution meet the goal?"), each on a different objective and domain of `content/{cert}/objectives.yaml`.
Id prefix for series and their questions: `{short}-sr{k}`.
Check: `CERT={cert} npx tsx factory/validate.ts --prefix {short}-sr{k}` → `0 problem(s)`.
""")
        sys.exit(0)
    domains = bp["domains"]
    w = {d["code"]: (d["weight"]["min"] + d["weight"]["max"]) / 2 for d in domains}; ws = sum(w.values())
    k = 0
    for d in domains:
        dq = round(standalone * w[d["code"]] / ws)
        objs = [o["code"] for g in obj[d["code"]] for o in g["objectives"]]
        base, extra = divmod(dq, len(objs))
        counts = [(o, base + (1 if i < extra else 0)) for i, o in enumerate(objs)]
        ntasks = max(1, math.ceil(dq / 56)); size = math.ceil(dq / ntasks)
        batch, acc, part = [], 0, 0
        def flush():
            global k
            nonlocal_part = None
        chunks, cur, acc = [], [], 0
        for o, c in counts:
            cur.append((o, c)); acc += c
            if acc >= size and len(chunks) < ntasks - 1:
                chunks.append(cur); cur, acc = [], 0
        if cur: chunks.append(cur)
        for j, ch in enumerate(chunks, 1):
            n = sum(c for _, c in ch); prefix = f"{short}-{d['order']}{chr(96 + j)}-"
            tm = ", ".join(f"{t} {max(0, round(n * s))}" for t, s in mix.items() if round(n * s) > 0)
            lines = "\n".join(f"- `{o}`: {c} questions" for o, c in ch)
            write(f"Q-{cert}-{d['order']}{chr(96 + j)}", f"""# Task Q-{cert}-{d['order']}{chr(96 + j)} — role QUESTIONS, certification {cert.upper()}, domain `{d['code']}`

Read `factory/BRIEF.md` (rules + role QUESTIONS) and `factory/profiles/{cert}.md`.

Write **{n} standalone questions** (no case study, no series) in `content/{cert}/questions/{d['code']}/`, id prefix **`{prefix}`**:

{lines}

Type mix for the batch (approximate): {tm}.
Difficulty mix: easy {round(dm['easy'] * 100)} %, medium {round(dm['medium'] * 100)} %, hard {round(dm['hard'] * 100)} %.
Check: `CERT={cert} npx tsx factory/validate.ts --prefix {prefix}` → `0 problem(s)`.
""")
