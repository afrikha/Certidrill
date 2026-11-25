# QZ-dp-900-11-data-representation — end-of-chapter quiz, DP-900, chapter 11

Result: `content/dp-900/quizzes/11-data-representation.yaml`, 10 questions (`dp900-qz-11-01` to `-10`), all `status: draft`.
`npx tsx factory/check-quiz.ts dp-900 11-data-representation` → 0 problem(s), 0 warning(s).

- Objectives: 1.1.1 ×3 (q1, q4, q7), 1.1.2 ×4 (q3, q5, q6, q10), 1.1.3 ×3 (q2, q8, q9).
- Types: single 4, dropdown 2, yesno_statements 3, dragdrop 1. Positions 6–10: single, yesno, dragdrop, dropdown, yesno.

## Sources (fetched on 2026-11-24)

- `training/modules/explore-core-data-concepts/2-data-formats` ("Identify data formats") and `3-file-storage` ("Explore file storage").
- The hourly WebFetch limit was reached after five pages; nothing else was needed for this chapter.

## Mock-exam overlap

The 39 bank questions of 1.1.1–1.1.3 cover almost every basic decision. The quiz tests other angles: why a fixed schema makes
SQL filtering easy (q1), extracting content before aggregating images (q2), nesting a variable list in one item (q3), where field
names live in a table vs JSON (q4), the typical store of semi-structured data (q5), XML with varying elements = semi-structured (q6),
free-text values in a fixed-schema table stay structured (q7), embeddings vs scans vs fixed schema per requirement (q8),
audio → transcript → table classification (q9), category independent of headings layout and of storage location (q10).
Some Yes/No statements touch notions also in the bank (q5 s3, q7 s3), with other scenarios and wording.

## Doubts

- q7 s1 (a table with a free-text Notes column is still structured data) and q10 s1 (PDFs with identical headings stay unstructured)
  follow the chapter's rule "does every item have the same fields?"; Learn doesn't discuss these edge cases explicitly.
- q6 (XML as semi-structured): Learn says "JSON is just one of many ways" to represent semi-structured data; it doesn't name XML
  as an example of semi-structured data. The classification rests on the definition.
- q8: "Vector embeddings" for meaning-based search follows the Learn sentence on vector data; Learn doesn't classify vector data
  in one of the three categories, and the quiz doesn't either.

## Chapter

No error found against the current Learn unit for chapter 11.
