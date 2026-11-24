# QZ-ai-103-22-agents — report

Quiz: `content/ai-103/quizzes/22-agents.yaml` (10 questions, `ai103-qz-22-01`…`10`). Checker: 0 problem(s), 0 warning(s).

| # | Obj. | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.2.1 | 1 | single | Existing LangGraph code hosted by Foundry → hosted agent (container image) |
| 2 | 2.2.3 | 1 | single | Queue-triggered function, no HTTP/spec, no client code → Azure Functions tool |
| 3 | 2.2.2 | 2 | single | 20–40 min function vs 10-minute run expiry → return a status at once, poll with a status function |
| 4 | 2.2.4 | 2 | single | One team, one boundary, two tools → single agent, not the proposed multi-agent design |
| 5 | 2.2.5 | 2 | multi | Semiautonomous MCP agent → approval for the record-changing and external-message tools |
| 6 | 2.2.3 | 3 | yesno | OpenAPI tool: 3.1 accepted; one API key scheme per tool (two tools); `multipart/form-data` body unsupported |
| 7 | 2.2.5 | 3 | single | Guaranteed approval on a **function** tool → backend holds the call (no `require_approval` on function tools) |
| 8 | 2.2.2 | 3 | yesno | Portal doesn't run functions / can't edit them; change = `create_version` via SDK; `strict` ≠ validated input |
| 9 | 2.2.4 | 3 | single | Classic connected agents → A2A tools (keep control, no hosted code; Foundry workflows retires 1 Dec 2026) |
| 10 | 2.2.6 | 3 | dragdrop | Tool Input Accuracy / Tool Call Success / Task Navigation Efficiency / trace of one run |

All 74 mock-exam questions of 2.2.x were read first. Preview features were kept out of the correct answers: memory (preview), Intent Resolution / Task Adherence / Task Completion (preview), Monitor tab and recurring evaluations (preview), Foundry workflows (preview, retiring), toolboxes (`V1Preview` header).

## Chapter out of date or inaccurate against current Learn (not edited)

- **Agent evaluators**: Intent Resolution, Task Adherence and Task Completion are marked **preview** on "Agent Evaluators for Generative AI"; the chapter's evaluator table doesn't say so. Bank items using them as answers (e.g. `ai103-cs1c-evaluators` with Task Adherence) conflict with the "no preview as the answer" rule.
- **Tool evaluator limits**: Learn says to avoid Tool Call Accuracy, Tool Input Accuracy, Tool Output Utilization, Tool Call Success **and Groundedness** when the conversation calls Foundry IQ (Azure AI Search), Bing Grounding, Bing Custom Search, SharePoint Grounding, Code Interpreter, Fabric Data Agent or Web Search. The chapter lists only four tools and omits Groundedness, SharePoint, Fabric and Bing Custom Search.
- **OpenAPI request bodies**: Learn accepts `application/json` **and `application/json-patch+json`**; the chapter says only `application/json`. Learn also lists **account managed identity** as legacy (migrate to project managed identity).
- **Hosted agents**: the hosted agents concept page mentions Agent Framework, LangChain/LangGraph/Deep Agents, Semantic Kernel and custom code, Python and C#; it doesn't mention the **OpenAI Agents SDK** that the chapter names. The .zip option exists ("deploy a hosted agent directly from source code", tip on "Deploy a hosted agent"). Hosted agents expose protocols (Responses, Invocations, Activity, A2A v1.0) not covered by the chapter.
- **Azure Functions tool**: Learn describes it as **queue-based** (Storage input/output queues, `CorrelationId`), requiring the **standard agent setup** (basic setup not supported) and Storage Queue Data Contributor for the project and function identities; HTTP-triggered functions go through the OpenAPI tool. The chapter's table only says "A function app as a tool".
- **MCP**: `require_approval` defaults to `always`; `allowed_tools=[]` means all tools; long-running MCP calls can use background mode with MCP tasks (preview). Supported connection auth types include `oauth2`, `user-entra-token`, `agentic-identity`. Private MCP needs a subnet delegated to `Microsoft.App/environments`. None of this is wrong in the chapter, but the default value of `require_approval` is a likely exam fact worth adding.
- **A2A**: creating the A2A project connection needs **Foundry Project Manager**; only text is supported and streaming isn't. Learn lists A2A tool and **workflows** as connected-agents replacements (the A2A page still lists workflows although they retire on 1 Dec 2026). The chapter's "migrate to the A2A tool or to workflows" will be half obsolete in a week.
- **Monitoring roles**: Learn adds Log Analytics Reader (and Privileged Monitoring Data Reader for protected tables) for log-based views; the chapter mentions only Foundry User for continuous evaluation.
- **Naming**: the Azure AI Search tool page is now titled "Connect a Foundry IQ (Azure AI Search) index to Foundry agents" and speaks of "the Foundry IQ service"; the chapter (and quiz) keep "Azure AI Search tool".
- **Content Understanding tool**: its Learn page (`.../agents/how-to/tools/content-understanding`) couldn't be fetched, and it isn't in the Toolbox tool table; its status (GA/preview) is unverified, so the quiz doesn't use it.

## Unverified / doubts

- Q4 relies on the Cloud Adoption Framework decision tree, whose single/multi-agent guidance appears only in the diagram's alt text on "Operational standards for AI agents".
- Q7: the claim that guardrails don't collect a human decision is from the chapter and the general guardrail model; the guardrail page wasn't fetched in this task. The "Tool call" intervention point name is taken from the chapter.
- Q3 option d (second output with the same `call_id`): Learn doesn't describe this case explicitly; the explanation relies on the 10-minute run expiration and on the model answering from the first (empty) output.
- Q8 s2: Learn says function definitions are configured with the SDK or REST API; that each `create_version` creates a new version comes from the chapter.
