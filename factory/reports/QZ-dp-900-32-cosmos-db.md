# QZ-dp-900-32-cosmos-db — end-of-chapter quiz, DP-900 chapter 32

File: `content/dp-900/quizzes/32-cosmos-db.yaml` (10 questions, `dp900-qz-32-01` to `-10`).
Objectives: 3.2.1 = Q1, Q3, Q5, Q6, Q7, Q8; 3.2.2 = Q2, Q4, Q9, Q10.
Types: single 6, dropdown 2, yesno_statements 1, dragdrop 1. Positions 6–10: yesno, single, dropdown, dragdrop, single.
Check: `npx tsx factory/check-quiz.ts dp-900 32-cosmos-db` -> 0 problem(s), 0 warning(s).

## Sources fetched (2026-11-24)

Training units "Describe Azure Cosmos DB" and "Identify Azure Cosmos DB APIs" (`explore-non-relational-data-stores-azure` units 2 and 3); docs `cosmos-db/resource-model`, `cosmos-db/consistency-levels`, `cosmos-db/serverless`, `cosmos-db/distribute-data-globally`.

## Overlap with the mock exam

The 34 mock questions cover every API/model pair and most throughput and consistency facts. The quiz tests other decisions: indexing policy at the container (Q1), Gremlin for fraud detection (Q2), multi-region writes for write latency (Q3), API-specific item names (Q4), partition key chosen from cardinality and the 20 GB limit (Q5), serverless single region + Session semantics for other sessions (Q6), shared database throughput vs serverless/dedicated/autoscale (Q7), Strong / Bounded staleness / Eventual per requirement (Q8), service matching with the Table storage / Cosmos DB for Table trap (Q9), one API per account -> two accounts (Q10).

## Doubts and unverified points

- Q10 relies on "one API per account". The APIs unit says the API is chosen when the account is created and determines the data format, query language and client libraries; no fetched page says literally "one API per account".
- Q7: shared database throughput is limited to 25 containers (resource-model page and training unit); the stem uses 20 containers.
- A first draft of Q3 tested Consistent prefix; dropped because the consistency-levels doc now says single-document writes under Consistent prefix "see eventual consistency" (only transactional batches keep the prefix guarantee), while the training unit and chapter 32 say "reads never see out-of-order writes". Q8 still uses Consistent prefix only as a distractor.
- Q6 s3: the doc says a client without a session token reads "as reads with Eventual Consistency"; the explanation says only that other sessions may read the old value for a short time.

## Chapter vs current Learn (not edited)

- **MongoDB migration**: the APIs unit now says that to migrate an existing MongoDB application or use the full MQL feature set, Microsoft recommends **Azure DocumentDB**, a separate service. Chapter 32 ("The team uses MongoDB drivers and skills") is consistent, but doesn't mention DocumentDB; a mock question that makes Cosmos DB for MongoDB the answer for *migrating an existing* MongoDB app would be out of date (none found in 3b; `dp900-3b-api-mongodb-skills` is a new application). The quiz avoids MongoDB migration as a correct answer.
- **Consistent prefix** definition (see above): chapter and training say "never out of order"; the doc restricts that to transactional batches.
- The resource-model page adds that you can't switch between dedicated and shared throughput, and that API for Table creates tables at the account level; not in the chapter (detail beyond fundamentals).
