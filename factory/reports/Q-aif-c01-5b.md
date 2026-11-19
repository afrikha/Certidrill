# Q-aif-c01-5b — report

48 questions in `content/aif-c01/questions/governance/`, prefix `aifc01-5b-`: 5.1.5 / 5.2.1 / 5.2.2 / 5.2.3 = 12 each.
Types: single 37, multi 6, ordering 2, dragdrop 3. Difficulty: 19 easy / 22 medium / 7 hard. Validator: 0 problem(s).

## Choices and deviations
- `multi` and `dragdrop` stems carry the per-element NOTE sentence, as in the rest of the bank (saa-c03, clf-c02, ai-901), although the AIF-C01 profile says AWS scores every type all or nothing.
- No closed service is a correct answer. AWS Audit Manager (its page says it is no longer open to new customers) is not used at all, not even as a distractor. Human-based Bedrock evaluation jobs and A2I are avoided.
- Scoping Matrix questions (5.2.3) avoid the page's own examples (marketing brainstorm, scheduling app, Claude chatbot) where possible; the Scope 2 question keeps a scheduling app because it is the clearest Scope 2 case.

## Facts relied on, to recheck at review
- CloudWatch Logs: the fetched page lists 365 days among account-level retention values; per-log-group values were not listed on that page (365 days is assumed available per log group).
- Model invocation logging page says "logs are stored until the logging configuration is deleted" (ambiguous); questions only rely on "disabled by default", "same account and Region", "100 KB inline / S3 required for larger and binary data".
- CloudTrail: InvokeModel/Converse = management events; Retrieve/RetrieveAndGenerate = data events (AWS::Bedrock::KnowledgeBase). CloudTrail events do not contain prompts (page examples show only modelId in requestParameters; the page does not state it in words).
- CloudTrail Lake: "query" used, SQL not named (not stated on the fetched page).
- AWS Responsible AI Policy (updated January 13, 2025): consequential decisions require risk assessment, human oversight, testing, safeguards; it does not require disclosure of AI use to end users (not tested).
- Textract reference title is "Best Practices" (page `textract-best-practices.html`).
