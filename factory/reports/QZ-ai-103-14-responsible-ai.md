# QZ-ai-103-14-responsible-ai — report

Quiz: `content/ai-103/quizzes/14-responsible-ai.yaml`, 10 questions. Objectives: 1.4.1 (q1, q3, q6), 1.4.2 (q2, q8, q10), 1.4.3 (q4, q7), 1.4.4 (q5, q9). Positions 6–10: dropdown, yesno_statements, multi, dragdrop, dropdown (code). `npx tsx factory/check-quiz.ts ai-103 14-responsible-ai`: 0 problem(s), 0 warning(s).

I read the 43 mock-exam questions of 1.4.x first and avoided their decisions: the Low blocking level, DefaultV2 detections, intervention points of agent guardrails, x-policy-id and raiPolicyName, judge models of Groundedness and Relevance, `reason`, thresholds, red teaming in the cloud, tracing code and order, Log Analytics Reader, Content Credentials statements, citations, require_approval / allowed_tools, the agent-identity 403, and user delegation. New decisions in this quiz: the High level, blocklists, defect rate, trace retention, approval of function tools, embedding documents for indirect attack detection, safety evaluators by target (model vs agent), connection authentication types, F1 vs Similarity and their parameters.

## Preview features: none is a correct answer

Learn (guardrails overview) marks as **preview**: guardrails for agents (the whole Agents column), the Tool call and Tool response intervention points, and the Spotlighting, Groundedness, PII and Task Adherence risks. The quiz only uses guardrails on **model deployments** (q1, q3, q6). Preview items appear only as distractors, and the explanations say they are preview.

## Chapter out of date or wrong against current Learn (I did not edit the chapter)

1. **Agents and Sensitive Data Leakage.** The chapter's risk table says "Agents (preview)", which is correct. But its prose (the exam tip "For an agent, scan the tool response intervention point") presents agent guardrails as a standard answer without recalling that they are preview. Several mock questions use agent guardrails or Tool response as the correct answer: ai103-1c-agent-tool-call-scan, ai103-1c-third-party-mcp-controls (a), ai103-1c-task-drift-guardrail (Task Adherence, preview), ai103-sr1-tool-injection-1 (whose text itself says "Tool response (preview)"), and ai103-cs4a-promo-guardrail. The same problem applies to **Sensitive Data Leakage**, preview according to "Risk and Safety Evaluators" and used as the correct answer in ai103-1b-safety-evaluators-prod (chapter 13). Raise this with the editor of the bank.
2. **Indirect Attack evaluator.** The risk and safety page says Indirect Attack (XPIA) is **"Model only"**: agent targets aren't supported. The chapter lists it without that restriction. Prohibited Actions and Sensitive Data Leakage are "agents only, not available for dataset or model evaluations": the chapter mentions this (q8 relies on it).
3. **Blocklists.** The chapter says blocklists are "a custom list of terms, or the built-in profanity list". The current blocklists page doesn't mention a profanity list, except as a default control of image generation models ("Profanity", on the default safety policies page). It adds that **blocklist support is limited to Azure OpenAI models**, that a list holds up to 10,000 terms of 1,000 characters at most (regex or exact match), and that a new term takes about 5 minutes to apply. That's why q3 says "gpt-5-mini in Azure OpenAI".
4. **Trace retention.** The chapter doesn't cover it: the portal shows traces for the past 90 days by default, and retention follows the Application Insights / Log Analytics configuration (trace setup page). q4 tests it. The protected tables (Privileged Monitoring Data Reader) belong to a feature announced in **public preview** (Message Center "Protect sensitive generative AI telemetry"); the chapter mentions this role without saying so. I didn't test it.
5. **Agent identity acting on behalf of the user** is in preview (agent identity concepts page). The chapter presents OBO passthrough as a standard tool-access control. The mock ai103-1c-user-delegated-access uses it as the answer. To be checked.
6. **AI Red Teaming Agent**: no preview label on the page. Cloud red teaming is available only in East US 2, France Central, North Central US and Sweden Central, and is text-only. The chapter doesn't give the regions.
7. **Document embedding.** The page ("Document Embedding in Prompts (classic)") shows the `<documents>` delimiter in a `user` message in one example and in a `system` message in another. q6 decides on the delimiter and the JSON escaping, not on the role.

## Doubts on the quiz

- **q5**: the function-calling page doesn't say explicitly that `require_approval` doesn't exist on function tools. It says that the application runs the function and recommends explicit confirmation for actions that change data. The explanation of option a sticks to "it's a setting of MCP tools", as the MCP page documents.
- **q7 s2**: the Content Credentials page covers images (DALL-E, GPT-image-1 series) and doesn't mention text. The "No" relies on the C2PA manifest being attached to generated images.
- **q9**: the authentication names follow the MCP page (`none`, `custom-keys`, `project-managed-identity`, `agentic-identity`, `oauth2`/"OAuth identity passthrough", `user-entra-token`). None is marked preview there.
- **q10**: `{"threshold": 3}` as an initialization parameter of Similarity isn't documented; the distractor is wrong in any case, because it doesn't name the required `deployment_name`.
- **French**: « liste de blocage (blocklist) » and « taux de défauts » (the chapter's term) aren't in `content/glossary.yaml`; to be added if confirmed on fr-fr Learn.

## Pages fetched

guardrails overview, default safety policies, blocklists, content filtering (classic), document embedding (classic), protected material, risk and safety evaluators, built-in evaluators, textual similarity evaluators, AI Red Teaming Agent, agent tracing overview, trace setup, Content Credentials (classic), function calling, MCP tool, agent identity.
