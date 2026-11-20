# Q-sap-c03-2d — QUESTIONS SAP-C03, security (2.4.6, 2.5.1, 2.5.2, 2.5.3)

32 questions in `content/sap-c03/questions/security/`, prefix `sapc03-2d-`: 8 per objective; single 27, multi 5; difficulty 5 easy / 16 medium / 11 hard. Validator: 0 problem(s).

## Sources
All facts come from AWS documentation pages fetched with WebFetch on 2026-11-20 (summaries from a model). The references in each file point to pages that were fetched. The SAP-C03 course chapters did not exist yet, so nothing was checked against the course.

## Service status found while researching (not used as correct answers)
- **Amazon SageMaker A2I**: no longer open to new customers (A2I page). Not used.
- **AWS Audit Manager**: no longer open to new customers (What is AWS Audit Manager?). Not used. Relevant to 2.4.5 writers.
- Amazon Detective is used as a distractor only.

## Points not fully verified (worded cautiously)
- `sapc03-2d-bedrock-api-keys`: the Bedrock API keys page shows `iam:ServiceSpecificCredentialServiceName` and `bedrock:bearerTokenType` in identity policies, not explicitly in SCPs. The question assumes the same condition keys work in an SCP (standard SCP behavior).
- `sapc03-2d-bedrock-private-models`: SCP deny "on every foundation model ARN except the two approved" (NotResource or equivalent) is described in words, not as policy syntax.
- `sapc03-2d-gateway-authorizer-scp`: the page names `bedrock-agentcore:GatewayAuthorizerType` and the `NONE` authorizer type; the exact condition value string `NONE` is assumed from that.
- `sapc03-2d-cross-account-callback`: the EventBridge cross-account bus page could not be fetched (hourly WebFetch quota reached); the rule-to-cross-account-bus pattern is standard, and the only reference is the Step Functions page with the same-account task token note.
- `sapc03-2d-shield-proactive`: "Shield Standard gives no access to the SRT" comes from general knowledge, not from the page fetched.
- `sapc03-2d-human-review-pause`: the Lambda durable functions pages confirm one-year executions, callbacks completed through the Lambda API and no compute charges while suspended. The name of the callback completion API was not confirmed, so the question does not use it.
- Question wording avoids depending on the Lambda maximum timeout.

## Choices
- French: "guardrail" kept in English (Bedrock feature name), "politique" for policy, "mécanisme d'autorisation" for authorizer, "flux de travail" for workflow, "jeton de tâche" for task token.
- Multi questions use AWS-style "Which combination of actions…? (Choose two.)" without the "part of the solution" sentence, except `sapc03-2d-human-review-pause` (alternatives → "Each correct answer presents a complete solution.").
