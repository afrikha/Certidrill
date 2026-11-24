# QZ-sc-500-32-ai-foundry-defender — notes

`content/sc-500/quizzes/32-ai-foundry-defender.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.1.7 (q1, q4, q6), 3.1.8 (q2, q8), 3.1.9 (q3, q5, q7, q10), 3.1.10 (q9). Positions 6–10: dropdown, yesno_statements, multi, hotarea, single.

## Chapter vs current Learn (fix in the chapter, not done here)

- **AI Gateway section: the Foundry portal flow is out of date.** "Configure Azure AI Gateway in your Foundry resources" (fetched Nov 2026) now describes two paths:
  1. A separate **Azure AI Gateway** product, with its own portal and `az aigateway`, that is linked in Foundry under **Manage > Gateways** and exposes aliases to projects as connected models.
  2. An API Management **connection** (resource-scope or project-scope) created from **Connections > Add connection > Model > Gateway**.

  The page says that **new APIM links can no longer be created from the Foundry UI**. Existing configurations keep working. Existing project-level token-limit settings remain visible in Foundry, but must be changed in APIM policy XML. Requests bypass the gateway unless the code uses the gateway endpoint, and MCP tools bypass it if they're registered with a direct backend URL. "AI gateway capabilities in Azure API Management" labels **AI gateway in Microsoft Foundry (preview)**.

  As a result, the chapter's **Manage > AI Gateway > Add AI Gateway**, **Create new = Basic v2**, **Use existing (v2, same subscription)**, **Add project to gateway**, its Exam trap and **Token management > + Set limit** are out of date or preview. The mock questions built on them should be reviewed: `sc500-3a-gw-create-new`, `sc500-3a-gw-existing-instance`, `sc500-3a-gw-existing-project`, `sc500-3a-gw-private-foundry`, `sc500-3a-gw-limit-responses`. This quiz only tests APIM policies and authentication, which are GA (q1, q4, q6).
- **Backend role**: "Authenticate and Authorize to LLM APIs - Azure API Management" assigns the APIM managed identity **Cognitive Services OpenAI User** on the Foundry resource. The chapter says "Cognitive Services User". The policy is `authentication-managed-identity` with `resource="https://cognitiveservices.azure.com"`, and callers are validated with `validate-azure-ad-token`. q6 uses Cognitive Services OpenAI User.
- **Policy name**: the element is `llm-content-safety`, and `llm-content-safety-policy` is only the URL of its page. The chapter's table writes `llm-content-safety-policy`. The policy returns `403` when content is flagged, and its `shield-prompt` attribute checks for attack patterns. It can also check MCP tool and A2A requests.
- **Logging**: "Monitor Azure API Management" now has a separate diagnostic category, **Logs related to generative AI gateway**, which records LLM requests with token usage, models and, optionally, prompts and completions (messages split into 32 KB chunks). The chapter only mentions **Logs related to ApiManagement Gateway**, and its "not prompt or completion content by default" is true but incomplete. Gateway logs don't include bodies by default. Bodies can be enabled per API, up to 8,192 bytes each.
- **Defender for AI services**: "Enable threat protection for AI services" says **Owner or Contributor** can enable the plan (the chapter says Owner). Data security for AI interactions doesn't include Foundry agent data. It needs user-context tokens for full policy support, and its current Purview configuration method for Foundry is **being deprecated** (it points to "Manage compliance and security in Microsoft Foundry").
- **Guardrails**: the overview adds **network egress controls** for hosted agents (GA, except Transform rules) and for prompt agents that use the Microsoft Copilot harness (preview). The chapter doesn't mention these. Groundedness (preview) in Azure OpenAI **retires on April 30, 2027**. The tools that support tool call and tool response moderation also include **Fabric Data Agent** and **Bing Custom Search**. With **Off**, nothing is blocked. Turning off output checks requires approval.
- **Dashboard**: the page gives the minimum role as "Security explorer" (sic). The chapter lists only the permissions. Data Sensitivity settings are tenant level, and the dashboard is subscription level. Both agree with the chapter.
- AI security posture: Effective July 1, 2026, agent discovery and posture need Microsoft Agent 365. The chapter agrees. The "Discover AI agents" section is preview.

## Unverified facts and doubts

- q4: the llm-content-safety page doesn't list supported providers. It applies to "LLM requests" in general. q4 assumes that it covers Bedrock LLM APIs published in the same APIM instance, as an API-scope policy. The genai capabilities page lists Bedrock models among the managed LLM APIs.
- q6: the counter key is described as "the client application ID taken from the caller's validated token". No fetched page shows the exact claim expression (`appid` or `azp`). The llm-token-limit page only says that the counter key accepts policy expressions. Private endpoint support for inbound traffic on Standard v2 comes from the chapter and the mock bank. I didn't re-fetch it.
- q8 relies on the alert "A Jailbreak attempt on an Azure AI model deployment was blocked by Azure AI Content Safety Prompt Shields" (Alerts for AI services). Its source is the guardrail's User prompt attacks control on a model (GA).
- q7 and q10 test agent guardrails, which are **preview**, and so are the Tool response point and Tool call point. Objective 3.1.9 ("guardrails for agent security") can't be tested without them. q3 and q5 use model guardrails (GA) as their answers.

## Design notes

New decisions compared with the mock bank:
- the token metrics policy;
- Defender CSPM for the AI BOM and attack paths;
- the default guardrail can't be edited;
- `llm-content-safety` for a provider-neutral gateway check;
- `x-policy-id` per request;
- a private endpoint, Entra tokens, the gateway managed identity and an app-based counter key behind a shared NAT;
- the Annotate action only for models, immediate effect, and no Foundry guardrail on a Copilot Studio agent;
- a guardrail block plus Defender alerts with prompt evidence;
- per-subscription plan prerequisites of the dashboard (exhibit);
- override that requires restating Violence High in the agent guardrail.
