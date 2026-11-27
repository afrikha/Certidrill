# QZ-gcp-pca-24-ai-ml-platform — report

File: `content/gcp-pca/quizzes/24-ai-ml-platform.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-pca 24-ai-ml-platform` → 0 problem(s), 0 warning(s).

## Coverage

| # | Objective | Type | Difficulty | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.4.1 | single | 1 | Experiments to compare pipeline runs |
| 2 | 2.5.1 | single | 1 | Vision API SafeSearch for photos |
| 3 | 2.4.3 | single | 2 | Standard reservation + 3-year CUD for steady GPU serving |
| 4 | 2.4.2 | single | 2 | Sensitive Data Protection deterministic encryption (joinable, reversible) vs hashing/masking/CMEK |
| 5 | 2.5.2 | single | 2 | Customer-facing agent: ADK + Agent Runtime, not Gemini Enterprise |
| 6 | 2.4.3 | single | 3 | Spot for a checkpointed 12-day run (flex-start max 7 days) |
| 7 | 2.4.1 | multi (2) | 3 | Managed Airflow for existing DAGs + Agent Platform Pipelines for the ML workflow |
| 8 | 2.5.2 | multi (2) | 3 | Gemini Enterprise eu app needs an Agent Runtime agent in a europe region; OAuth authorization for per-user access |
| 9 | 2.4.2 | multi (3) | 3 | Same region, regional CMEK key set on the bucket separately, VPC Service Controls |
| 10 | 2.5.3 | single | 3 | Dedicated private (PSC) endpoint: VPC SC, on-premises, streaming, long requests |

The 27 mock-exam questions of these objectives were read first; none of their decisions is repeated with the same answer (the bank's flex-start question needs a non-resumable job; the quiz's Spot question is the opposite case).

## Doubts and unverified points

- Q8: the GA status of registering ADK agents is confirmed by the Gemini Enterprise release notes (April 20, 2026). The REST examples on the registration page still use `v1alpha`, and I found no release-note entry that gives a launch stage for the OAuth *authorization* resource used by ADK agents. The page itself has no Preview label. Please recheck before publishing.
- Q10: the 60-second timeout and the absence of streaming for shared public and private services access endpoints come from the comparison table of "Choose an endpoint type". The chapter does not teach endpoint types; the question relies on exam-style reasoning plus that table.
- Q3: "commitments with GPUs require attached reservations" comes from "About reservations"; the chapter only says "Standard reservation (with committed use discounts)".

## Chapter issues (content/gcp-pca/course/chapters/24-ai-ml-platform.en.md)

- Section google-ai-apis: the table gives the **Video Intelligence API** as the answer for analyzing stored video. Its docs page ("Features | Video Intelligence API") says the API has been deprecated since September 14, 2026, and will shut down on September 14, 2027, with the Gemini models as the replacement. The exam profile also lists it as deprecated. The row should point to Gemini video understanding and flag the deprecation.
- Section gemini-enterprise: the chapter says "NotebookLM Enterprise (named Gemini Notebook Enterprise in the current documentation)". The exam profile and the bank use "Gemini Notebook for business" (the docs page title is "What is Gemini Notebook for business? | Gemini Notebook Enterprise"). The naming should be aligned.
- Section ai-hypercomputer: the consumption table matches "Consumption options for AI Hypercomputer". The extra figure "up to 80 VMs" for calendar mode was not checked.
- Section ml-pipelines: the build-pipeline page says that without a specified service account, pipelines run as the Compute Engine default service account, which has the Editor role by default. This is consistent with the chapter's design rule.
