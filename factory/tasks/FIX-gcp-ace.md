# Task FIX-gcp-ace — correction pass, Associate Cloud Engineer course and question bank

Read `factory/BRIEF.md`, `factory/BRIEF-GCP.md`, `factory/BRIEF-EN-ONLY.md` and `factory/profiles/gcp-ace.md` (last bullet: current names, Preview and deprecated products). Verify every change on docs.cloud.google.com with WebFetch, and every command or flag on the gcloud reference or the local `gcloud … --help`. Fix only what the docs confirm; if a deciding fact cannot be confirmed, rewrite so the question or the sentence no longer depends on it. Keep ids, objectives, types, difficulty, section markers and `status: draft`.

Scope (your prompt tells you which part is yours):
- **course**: `content/gcp-ace/course/chapters/*.en.md`. Read `factory/reports/C-gcp-ace-*.md` and the chapter remarks in `factory/reports/Q-gcp-ace-*.md`; fix every chapter error they flag.
- **bank**: `content/gcp-ace/questions/**`. Read `factory/reports/Q-gcp-ace-*.md` and fix every flagged doubt you can settle. Known points:
  - `gcpace-1c-lock-billing-link`: the docs say a project owner can unlock a locked billing link. Fix the explanation, or the answer.
  - Preview or deprecated products as the correct answer. Allowed only when the objective names the product (1.1.11, 2.4.2, 3.4.12: Gemini Cloud Assist, Gemini CLI, Antigravity); the explanation then states the launch stage. Spend cap budgets: GA since 2026-10-13 for a short list of services; check that the question respects that list.
  - Sinks: does the writer identity need Logs Writer for every destination? Settle it, and make every sink question consistent.
  - Basic roles: use Admin/Writer/Reader as the current names, with Owner/Editor/Viewer as legacy. Questions where the old name decides the answer are consistent with the Roles overview.
  - Near-duplicates across batches. The same decision tested twice with the same answer: rewrite one. The same decision with opposite answers: make sure both are right for their stems. Pairs reported:
    - 1c restrict-billing-account-creation vs 4a org-domain-project-creator;
    - 1b standalone-org vs a 1a Folder Creator question;
    - 1b quota-billing-project vs 1a;
    - 4c access-token-curl and cloud-run-id-token vs 4b;
    - 1a sink questions vs 3c.
    Also scan for others: same objective, stems with similar wording.
  - Reference titles fetched without the " | … | Google Cloud Documentation" suffix: correct them to the page title.

Checks after the edits:
- `npm run -s content:validate -- --cert gcp-ace` → 0 problem(s), 0 warning(s);
- `npx tsx factory/check-cert.ts gcp-ace` → 0 course problems.

Write `factory/reports/FIX-gcp-ace-<part>.md`: one line per changed file (id or chapter, change, source URL), plus what you could not confirm.
