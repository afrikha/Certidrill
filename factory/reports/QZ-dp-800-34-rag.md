# QZ-dp-800-34-rag — report

File: `content/dp-800/quizzes/34-rag.yaml` (10 questions, `dp800-qz-34-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Coverage: 3.3.1 (q1), 3.3.2 (q3, q9), 3.3.3 (q2, q7), 3.3.4 (q4, q6, q10), 3.3.5 (q5, q8). Positions 6–10: single ×2, yesno_statements, dropdown, multi.

Pages fetched (Nov. 2026): sys.sp_invoke_external_rest_endpoint, JSON_VALUE, JSON_OBJECT, JSON_ARRAYAGG, "Format JSON output automatically with AUTO mode", "Work with chat completion models" (Foundry), "Generate embeddings with Azure OpenAI", and the training units "Identify RAG use cases and architecture" and "Generate and process RAG responses".

## Chapter issues and doubts

- **Unsourced chapter claim (rag-use-cases section):** "Exact figures such as a total or a count: compute them in SQL; at most pass the result to the model to phrase it" doesn't appear on the RAG training unit I fetched. It's sound, but I kept it out of the quiz.
- **Unsourced chapter claim:** Learn doesn't show that JSON_ARRAYAGG output nested inside JSON_OBJECT or FOR JSON is embedded as JSON rather than escaped. JSON_OBJECT documents nesting only for JSON_ARRAY and JSON_OBJECT values. The chapter doesn't claim it directly, and I avoided it.
- **Missing detail in the chapter (json-context section):** the chapter says FOR JSON AUTO infers the structure from the query and its joins, and that PATH nests dotted aliases. It doesn't say that AUTO outputs dotted aliases as keys with dots, without nesting (Learn, AUTO mode page, example A). q7 tests that difference. Adding one line to the table would help readers.
- **Possibly out of date (prompt-payload section):** reasoning models use `max_completion_tokens` and **don't support `temperature`** (Foundry chat page). The chapter recommends a low `temperature` without this caveat. q9 sets neither parameter, for that reason.
- **Inconsistent Learn wording:** the "Generate and process RAG responses" unit says `@retry_count = 3` "attempts the call up to three times". The procedure page defines `@retry_count` as the number of retries (0 to 10). q10 says "retry up to three times", which is consistent with the procedure page.
- q4 follows Learn example B of the procedure page (credential `HTTPEndpointHeaders` with `x-functions-key`, named after the function URL).
- q6 relies on two Learn statements: the domain of the credential name must be on the allowed list, and outbound firewall rules can only restrict access further.
- q3: Learn doesn't say that the database master key is created automatically in Azure SQL Database (chapter statement). It's true but not on the pages I fetched, so no option depends on it.
