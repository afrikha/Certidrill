# Q-aif-c01-5a — report

48 questions in `content/aif-c01/questions/governance/`, prefix `aifc01-5a-` (12 each for 5.1.1–5.1.4).
Types: single 37, multi 6 (5 × choose 2, 1 × choose 3 of 6), ordering 2, dragdrop (matching) 3.
Difficulty: 19 easy / 22 medium / 7 hard. Validator: 0 problem(s).

## Deviations / choices
- Scoring NOTE sentence kept on multi and dragdrop (WRITING_GUIDE rule, same convention as clf-c02 and saa-c03), although the blueprint says AWS scores every type all or nothing (`scoring.multi: all_or_nothing`, not yet implemented by the loader). Remove the NOTE from all AWS banks at once if that rule gets implemented.
- No closed service is a correct answer (no Clarify, Model Monitor, Q Business, Q Developer, Kendra, Agents Classic). Model Cards and ML Lineage Tracking were checked: no closure notice on their pages.
- French: guardrail as a common noun = « barrière de protection » (AWS fr_fr), « scientifiques des données » for data scientists, « peaufiner » for fine-tune (objectives wording), « journal de suivi » for a CloudTrail trail, « fichiers de résumé (digest) ».

## Facts left soft or unverified
- Whether CloudTrail events for InvokeModel contain the request body was not verified: aifc01-5a-invocation-logging-s3 only says CloudTrail is designed for who/when, invocation logging for content.
- Well-Architected ML Lens MLSEC-07 (keep only relevant data) and MLSEC-10 (data poisoning) could not be read (pages render empty / client error). aifc01-5a-data-minimization and aifc01-5a-multi-training-integrity therefore cite MLSEC02-BP01, MLSEC05-BP01 and the Prescriptive Guidance agentic AI data security page instead.
- aifc01-5a-lineage-term cites the SageMaker Unified Studio data lineage page (SageMaker Catalog is not named in the AIF-C01 in-scope list; it is used only as a reference for the concept).
- Reference titles are the pages' H1 headings without the " - <service>" suffix, as in the other AWS banks.
