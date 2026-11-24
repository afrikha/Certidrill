# QZ-dp-800-31-models-embeddings — report

File: `content/dp-800/quizzes/31-models-embeddings.yaml` (10 questions, `dp800-qz-31-01`..`10`). Check: `npx tsx factory/check-quiz.ts dp-800 31-models-embeddings` → 0 problem(s), 0 warning(s).

Objectives: 3.1.1 (q1, q5, q10), 3.1.2 (q3), 3.1.3 (q4, q9), 3.1.4 (q8), 3.1.5 (q2, q7), 3.1.6 (q6). Hard formats: dropdown (q6, q10), multi (q7), yesno_statements (q8), single (q9).

## Pages fetched (Nov 24, 2026)
CREATE EXTERNAL MODEL, AI_GENERATE_EMBEDDINGS, AI_GENERATE_CHUNKS, Vector data type, Foundry Models sold by Azure, About Change Tracking, training units 02 (Understand and evaluate models), 04 (Design embeddings), 05 (Generate and maintain embeddings), change event streaming overview.

## Chapter / mock-exam issues against current Learn
- **CES is preview on every platform** ("What is change event streaming (preview)", SQL Server 2025, Azure SQL Database, MI, Fabric). The chapter says so, but mock-exam questions `dp800-3a-ces-multi-consumer` (answer = CES) and `dp800-3a-ces-setup-order` make a preview feature the correct answer. To review against the "never a preview feature as the correct answer" rule.
- CES destinations: Learn lists Azure Event Hubs **and Fabric Eventstream**; the chapter's maintenance table mentions only Event Hubs. Learn also notes AMQP is deprecated for CES since Aug 15, 2026.
- `API_FORMAT = 'ONNX Runtime'`: Learn requires Windows, SQL Server Machine Learning Services, `external AI runtimes enabled` and `PREVIEW_FEATURES = ON` (SQL Server 2025). The chapter lists it with no preview note.
- Azure OpenAI managed identity for SQL Server 2025 (Arc): Learn's CREATE EXTERNAL MODEL page names the **Cognitive Services OpenAI Contributor** role; the chapter says "an Azure OpenAI role" (fine), mock `dp800-3a-create-model-identity` uses Cognitive Services OpenAI User (Azure SQL Database, plausible but not checked).
- Managed Instance: AI_GENERATE_CHUNKS works with the SQL Server 2025 **or** Always-up-to-date update policy, whereas CREATE EXTERNAL MODEL / AI_GENERATE_EMBEDDINGS require Always-up-to-date. The chapter doesn't distinguish (not wrong).
- Training unit 02 doesn't state that query and stored vectors must come from the same model; the Foundry models page does ("You can't upgrade between embedding models ... you need to generate new embeddings"), used as reference for q5.
- Not in the chapter but on Learn: a SCHEMABINDING view that references an external model blocks DROP EXTERNAL MODEL.

## Doubts / unverified
- q6: the explanation says a top-level `retry_count` is appended to the request body sent to the endpoint (Learn: PARAMETERS are appended to the request body; retries are read from `sql_rest_options`). What the endpoint does with the unknown key isn't documented; the question doesn't depend on it.
- q3: Learn says only HTTPS/TLS endpoints are supported for LOCATION; whether CREATE fails or the call fails with http:// isn't documented, so the stem avoids saying which.
- q10: storage computed as dimensions x 4 bytes (float32, Learn); float16 per-element size isn't used.
