# Certidrill content factory — English-only certifications

Some certification exams are not offered in French by the vendor. Certidrill offers a certification only in the languages of the official exam, so for these certifications **write English only**. The blueprint says so:

```yaml
certification:
  languages: [en]
```

Every rule of `factory/BRIEF.md` (and of the vendor addendum, e.g. `factory/BRIEF-AWS.md` or `factory/BRIEF-K8S.md`) still applies, **except** the French parts:

1. **Localized fields** keep the object form with the `en` key only: `stem: { en: "…" }`, `text: { en: "…" }`, `explanation.correct: { en: "…" }`, `explanation.options: { a: { en: "…" } }`, `title: { en: "…" }`, `group: { en: "…" }`. Never write a `fr` key, never a placeholder.
2. **Course chapters**: one file per chapter, `content/<cert>/course/chapters/<id>.en.md`. No `.fr.md` file. `course.yaml` titles and module titles: `{ en: "…" }` only.
3. **Objectives, blueprint domains, level titles**: `{ en: "…" }` only.
4. Ignore every instruction about French terminology, French typography, EN/FR parity and French glossaries.
5. Use the time saved on depth and accuracy: verify facts on the official documentation, sharpen distractors, explain why each wrong option is wrong.

Checks are the usual ones (`npm run content:validate -- --cert <cert> --prefix <prefix>`, `npx tsx factory/validate.ts`, `npx tsx factory/check-cert.ts <cert>`): the local tools accept English-only content when `certification.languages` is `[en]`.
