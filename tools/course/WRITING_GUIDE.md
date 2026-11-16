# Writing guide — course

Every chapter of `content/<certification>/course/` follows this guide
(`docs/SPECS-COURS.md` §3). It is written for the people and agents who author
or review the course. `npm run content:validate` checks every rule marked ✔.

## Files

```
content/az-104/course/
  course.yaml                      manifest: modules, chapter order, titles, statuses
  chapters/12-rbac.en.md           one file per chapter and language
  chapters/12-rbac.fr.md
```

- ✔ Each chapter of `course.yaml` has its `.en.md` and `.fr.md` file; no other
  file in `course/`.
- Sections, their titles and their objectives are written in the chapter files
  only, never in `course.yaml`: there is one source.

## course.yaml

```yaml
version: 1
certification: az-104              # ✔ the folder's certification
blueprintVersion: '2023-10-26'     # ✔ the version of blueprint.yaml
modules:
  - code: identities               # ✔ a domain code of blueprint.yaml, or "intro"
    title: { en: ..., fr: ... }
chapters:                          # the order of the list is the reading order
  - id: 12-rbac                    # ✔ unique; the name of chapters/12-rbac.<locale>.md
    module: identities             # ✔ one of the modules above
    status: draft                  # ContentStatus, same cycle as the questions
    free: false                    # true = readable without a Pass
    title: { en: ..., fr: ... }
    minutes: 15                    # estimated reading time
    references:
      - { title: ..., url: https://learn.microsoft.com/en-us/... }   # ✔ Learn only
```

A new chapter is always `status: draft`: it is published only after a human
review (see *Status*).

## Chapter files

```markdown
Introduction of the chapter (the summary, no heading).

<!-- section: rbac-model | objectives: 1.2.1 -->
## Section title

GFM Markdown...

<!-- section: key-points -->
## Key points
```

- ✔ An introduction paragraph comes before the first section.
- ✔ Each section starts with a marker `<!-- section: <id> | objectives: <codes> -->`
  on its own line, immediately followed by a level-2 heading. Every level-2
  heading has its marker.
- ✔ Section ids: lowercase letters, digits and hyphens, unique in the chapter.
  They are the anchors of the section URLs: once published, do not rename one
  nor move it to another chapter, and do not rename a chapter (the readers'
  progress on it would be lost).
- `objectives` is optional (introduction chapter, "Key points"). Codes are
  separated by commas.
- ✔ No level-1 heading (the chapter title comes from `course.yaml`), no heading
  below level 2.
- ✔ Section titles are plain text: no Markdown, no code span.

### Markdown

- ✔ GFM only: paragraphs, lists, tables, code blocks, quotes. No image, no HTML:
  a `<` outside code is refused, so put generics, placeholders and comparisons
  in a code span (`` `<resource-group>` ``).
- ✔ Links go to `https://` pages (Microsoft Learn first) or to an anchor
  (`#section-id`) of a section of the same chapter; no other protocol. A Learn
  link is shown in the reader's language (`/en-us/` becomes `/fr-fr/`).
- ✔ Both languages link to the same targets, section by section (a Learn URL
  may use `/en-us/` or `/fr-fr/`).
- ✔ Every code block names its language, one of `bash`, `powershell`, `json`,
  `bicep`, `kusto`, `yaml`, `text`, and is closed.
- ✔ Callouts are quotes that start with a bold label, and only these two:

  | Kind | English | French |
  | --- | --- | --- |
  | trap | `> **Exam trap.** ...` | `> **Piège d'examen.** ...` |
  | tip | `> **Exam tip.** ...` | `> **Conseil d'examen.** ...` |

### Objectives

- ✔ Every code exists in `objectives.yaml` and belongs to the domain of the
  chapter's module; the `intro` module has no objective.
- ✔ Every objective of the referential is covered by at least one section.

### English and French

- ✔ The two files have the same sections, in the same order, with the same
  objectives.
- ✔ Code blocks are identical in both languages, comments included.
- ✔ Same tables (rows × columns) and same callouts, section by section.
- French: terminology of `content/<certification>/glossary.yaml`; service,
  role and SKU names, commands and technical values stay in English; storage
  tiers are written « niveau froid (Cool) », « niveau froid (Cold) » as in the
  question bank.

## Validate

```bash
npm run content:validate          # every course check, every problem with its file and line
npm run content:check             # loads everything as the seed does (counts by status)
```

## Status

Chapters follow the same cycle as the questions (`draft` → `reviewed` →
`published`), and stay in `draft` until a human review:

```bash
npm run content:status -- reviewed 12-rbac --course     # one chapter (id prefix)
npm run content:status -- published all --from reviewed --course
npm run seed                                            # loads the course
```

The seed is idempotent: the repository is the source of truth. A chapter or a
section removed from the files is deleted from the database, with the readers'
progress on it.

A status can also be changed in the back-office (Administration → Course),
where the chapter can be reviewed in both languages side by side. The seed
keeps that status until `course.yaml` changes the chapter's status: the latest
decision wins. Bring the file in line afterwards with `content:status`.
