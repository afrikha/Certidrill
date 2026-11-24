Responsible AI in Microsoft Foundry is a set of concrete controls, not a principle to quote. Guardrails block harmful input and output at run time, evaluators score outputs before and after release, traces and provenance metadata leave an audit trail, and approval and tool-access settings keep an agent inside the limits you set. Exam questions describe a risk and ask which of these mechanisms addresses it, or show a configuration and ask what it blocks.

<!-- section: guardrails | objectives: 1.4.1 -->
## Guardrails and content filtering

In the current Foundry portal, a **guardrail** is a named collection of **controls**. Each control defines three things: the **risk** to detect, the **intervention points** to scan, and the **action** to take. The risks are detected by classification models from Azure AI Content Safety. Guardrails apply to Foundry Models sold by Azure (except audio transcription models) and to agents built in Foundry Agent Service.

| Risk | What it detects | Models | Agents (preview) |
| --- | --- | --- | --- |
| Hate, Sexual, Violence, Self-harm | Harmful content, rated by severity | Yes | Yes |
| User prompt attacks | A user tries to change the system rules, replace the persona or bypass safety (jailbreak) | Yes | Yes |
| Indirect attacks | Instructions hidden in documents, emails or tool results that the model processes | Yes | Yes |
| Spotlighting (preview) | Helps the model tell untrusted input from instructions | Yes | No |
| Protected material for text / for code | Known copyrighted text (lyrics, articles); code from public repositories, with citation and license | Yes | Yes |
| Groundedness (preview) | Output not supported by the provided sources | Yes | No |
| Personally identifiable information (preview) | Personal data in the content | Yes | Yes |
| Task Adherence (preview) | Agent behavior that drifts from the assigned task | Yes | Yes |

User prompt attacks and indirect attacks together are **Prompt Shields**. Indirect attack detection works on content passed as documents, so the application must embed retrieved content in the document format the documentation describes and keep its own instructions in the system message.

| Intervention point | Scans | Models | Agents (preview) |
| --- | --- | --- | --- |
| User input | The prompt sent to the model or agent | Yes | Yes |
| Tool call (preview) | The action and data the agent proposes to send to a tool | No | Yes |
| Tool response (preview) | The content a tool returns to the agent | No | Yes |
| Output | The final completion returned to the user | Yes | Yes |

The two actions are **Annotate** (models only: the result is labeled, nothing is blocked) and **Annotate and block**. The four harm categories use a blocking level:

| Blocking level | Blocks | Note |
| --- | --- | --- |
| Off | Nothing (annotations can still be returned) | For outputs, only customers approved for modified guardrails |
| Low | High severity only | Least restrictive |
| Medium | Medium and high | Level used by the default guardrail |
| High | Low, medium and high | Most restrictive, more false positives |

Defaults and inheritance:

- Model deployments get the **Microsoft.DefaultV2** guardrail: the four harm categories blocked at medium on prompts and completions, user prompt attack detection on prompts, protected material for text and code on completions. Indirect attack detection is off by default.
- An agent uses the guardrail assigned to it; without one, it inherits the guardrail of its model deployment. An agent guardrail **replaces** the model guardrail completely: if the agent guardrail has no tool call or tool response control, those points aren't scanned.
- One guardrail can be assigned to many models and agents. Default guardrails can't be edited; create a custom one (**Build > Guardrails > Create Guardrail**: add controls, assign agents and models, review and name). Creating one requires the Foundry Account Owner role or higher.
- Behind the portal, a guardrail is an RAI policy, assigned to a deployment through its `raiPolicyName` property. A request can name another guardrail with the `x-policy-id` header.
- **Blocklists** (custom lists of exact terms or regex patterns, up to 10,000 terms per list) can be added to input filtering, output filtering or both. They are supported for Azure OpenAI models only, and a new term takes about 5 minutes to apply.

How a blocked call looks to the application:

| Situation | Result |
| --- | --- |
| Prompt blocked | HTTP 400, error code `content_filter` |
| Completion blocked | HTTP 200, `finish_reason` set to `content_filter` for that choice |
| Annotations | Per category: `filtered` and `severity` (safe, low, medium, high); Prompt Shields and protected material: `detected` and `filtered` |
| Filtering service unavailable | The annotation contains an error object: the content wasn't checked |

> **Exam trap.** A guardrail acts at run time on each request: it blocks or annotates. An evaluator measures a batch of outputs and produces scores: it blocks nothing. "Prevent the agent from returning violent content" is a guardrail; "measure how often responses are violent before release" is an evaluator.

> **Exam tip.** "Malicious instructions hidden in an uploaded document or a web page returned by a tool" is an indirect attack. For a model deployment, pass that content as documents and enable indirect attack detection; for an agent, the tool response intervention point scans it (preview, like every agent guardrail). "A user types a jailbreak" is a user prompt attack on user input.

<!-- section: evaluation-instrumentation | objectives: 1.4.2 -->
## Evaluators, safety evaluations and explanations

An **evaluator** scores one characteristic of an output. Some are deterministic calculations; **AI-assisted** evaluators use a judge model, named by a model deployment in the evaluator configuration.

| Category | Built-in evaluators | Judge model |
| --- | --- | --- |
| General purpose | Coherence, Fluency | Yes |
| Textual similarity | Similarity, F1 Score, BLEU, GLEU, ROUGE, METEOR (need ground truth) | Similarity only |
| RAG | Retrieval, Document Retrieval, Groundedness, Groundedness Pro (preview), Relevance, Response Completeness (preview) | Yes, except Document Retrieval and Groundedness Pro |
| Risk and safety | Hate and Unfairness, Sexual, Violence, Self-Harm, Protected Materials, Indirect Attack, Code Vulnerability, Ungrounded Attributes, Prohibited Actions, Sensitive Data Leakage | No: hosted by the Foundry evaluation service |
| Agent | Task Adherence, Task Completion and Intent Resolution (all three preview), Tool Call Accuracy, Tool Selection, Tool Input Accuracy, Tool Output Utilization, Tool Call Success, and others | Mostly yes |

Safety evaluators don't need a `deployment_name`. The four content evaluators return a **0–7 severity score** (very low 0–1, low 2–3, medium 4–5, high 6–7) with a default threshold of 3: a score at or below the threshold passes. Protected material, code vulnerability, indirect attack, prohibited actions and sensitive data leakage return pass or fail. The report also gives a **defect rate**: the percentage of responses with undesired content. Prohibited Actions and Sensitive Data Leakage (preview) apply to agent targets only; Indirect Attack applies to model targets only.

**Explanation tooling.** AI-assisted and safety evaluators return a `reason` next to the score, so a reviewer can see why a response failed:

```json
{
  "name": "Violence",
  "metric": "violence",
  "score": 0,
  "label": "pass",
  "reason": "The response refuses to provide harmful content.",
  "threshold": 3,
  "passed": true
}
```

Evaluators are declared as testing criteria and bound to the data with mappings (`{{item.x}}` for a dataset field, `{{sample.output_text}}` for the response generated during the run):

```text
testing_criteria = [
    {
        "type": "azure_ai_evaluator",
        "name": "violence",
        "evaluator_name": "builtin.violence",
        "data_mapping": {"query": "{{item.query}}", "response": "{{sample.output_text}}"},
    },
    {
        "type": "azure_ai_evaluator",
        "name": "groundedness",
        "evaluator_name": "builtin.groundedness",
        "initialization_parameters": {"deployment_name": "gpt-4.1-mini"},
        "data_mapping": {"context": "{{item.context}}", "response": "{{sample.output_text}}"},
    },
]
```

The **AI Red Teaming Agent** goes one step further: it generates adversarial prompts with Microsoft's open-source PyRIT framework (attack strategies such as Base64, Flip, CharSwap, ROT13, Crescendo), sends them to the model or agent, scores the responses with the safety evaluators and reports an **Attack Success Rate (ASR)**, the percentage of successful attacks. Agent risk categories (Prohibited Actions, Sensitive Data Leakage, Task Adherence) run in the cloud only. Cloud red teaming is available in East US 2, France Central, North Central US and Sweden Central. It supports text scenarios only.

| Requirement | Use |
| --- | --- |
| Score a test dataset for harmful content before release | Risk and safety evaluators |
| Actively attack the app to find jailbreak weaknesses | AI Red Teaming Agent |
| Understand why a response got a low score | The evaluator's `reason` |
| Check the quality of production traffic over time | Continuous evaluation on sampled traffic |

> **Exam trap.** The red teaming agent and the safety evaluators are not alternatives to guardrails. Red teaming finds weaknesses before release; guardrails enforce limits on every request after release.

<!-- section: auditing | objectives: 1.4.3 -->
## Auditing: traces, provenance and approvals

**Trace logging.** Foundry tracing follows OpenTelemetry and stores traces in the **Application Insights** resource connected to the project. A trace records each step of a run in order: user input, model calls, tool calls with their arguments and results, token counts and durations. Spans follow the GenAI semantic conventions (`invoke_agent`, `execute_tool`, attributes such as `gen_ai.tool.call.arguments`). Server-side tracing of prompt agents needs no code once Application Insights is connected (**Agents > Traces > Connect**). Reading traces requires **Log Analytics Reader** on the resource, plus Privileged Monitoring Data Reader if the tables are protected. The portal shows the traces of the past 90 days; stored data follows the Application Insights and Log Analytics retention settings.

Client-side instrumentation of an application:

```text
import os
os.environ["AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING"] = "true"
# Records message content: development only, unless compliance allows it
os.environ["OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"] = "true"

from azure.monitor.opentelemetry import configure_azure_monitor

connection_string = project.telemetry.get_application_insights_connection_string()
configure_azure_monitor(connection_string=connection_string)
```

Traces can contain prompts, outputs and tool arguments. Treat them as production logs: restrict access, apply retention, never put secrets or tokens in prompts or span attributes, and redact personal data before it reaches telemetry.

**Provenance metadata** records where content comes from:

- **Content Credentials.** Images generated by the DALL-E and GPT-image-1 series in Azure OpenAI carry a cryptographically signed C2PA manifest: `description` "AI Generated Image", `softwareAgent` ("Azure OpenAI DALL-E" or "Azure OpenAI ImageGen") and `when` (creation time). They are applied automatically. Anyone can check them with the Content Credentials Verify site or the Content Authenticity Initiative open-source tools.
- **Citations.** Retrieval tools return citation annotations that link each answer to its source document; protected material for code returns the source repository and its license.
- **Versions.** Agent versions are snapshots, so a trace can be tied to the exact instructions and tools that produced it.

**Approval workflows.** A high-impact action waits for a human decision, and both the request and the decision are logged. For MCP tools in Foundry Agent Service, `require_approval` makes the agent emit an `mcp_approval_request` item instead of calling the tool; the application shows the tool name and arguments to a person and sends back an `mcp_approval_response` (see [Agent oversight and tool access](#agent-governance)).

> **Exam tip.** "Prove later which tool the agent called, with which arguments, and what it returned" is tracing in Application Insights. "Show that an image was generated by AI" is Content Credentials. "A manager must confirm before the agent calls the payment API" is an approval workflow.

<!-- section: agent-governance | objectives: 1.4.4 -->
## Agent oversight and tool access

An agent decides on its own which tool to call. Governance keeps that decision inside limits at three levels: what the agent may call, when a human must agree, and what the agent's identity can reach.

**Oversight modes** for MCP tools (`require_approval`):

| Value | Behavior |
| --- | --- |
| `"always"` (default) | Every call to this server waits for approval |
| `"never"` | Calls run without approval |
| `{"never": ["tool1"]}` | No approval for the listed tools; approval for the others |
| `{"always": ["tool1"]}` | Approval only for the listed tools |

```text
tool = MCPTool(
    server_label="contoso-erp",
    server_url="https://erp.contoso.com/mcp",
    allowed_tools=["get_order", "update_order"],
    require_approval={"always": ["update_order"]},
    project_connection_id="erp-connection",
)
```

The approval response goes back in the **same conversation**, with `approval_request_id` set to the `id` of the request item and `approve` set to `True` or `False`.

**Constraints:**

- `allowed_tools` restricts the agent to the listed tools of an MCP server. Omitted or empty, **all** the server's tools are available.
- The **instructions** state the task and its limits; Task Adherence (a guardrail risk and an evaluator, both in preview) checks that the agent stays within them.
- Guardrail controls on **tool call** and **tool response** (preview) scan what the agent sends to and receives from tools.
- With function calling, the application runs the function, so it can refuse or ask for confirmation before any side effect.
- Microsoft doesn't test or verify the third-party remote MCP servers that you connect: treat their tool descriptions and results as untrusted input that can carry indirect prompt injection.

**Tool-access controls** decide what a tool call can actually do:

| Mechanism | Role |
| --- | --- |
| Project connection | Stores the tool's credentials (key, OAuth, managed identity); no secret in code or prompts |
| Agent identity | A Microsoft Entra identity per agent (blueprint plus instance identity); starts with **no** permissions |
| Project managed identity | Used by connections configured for project managed identity authentication |
| Azure RBAC or data-plane roles | Granted to that identity on the target, at the narrowest scope |
| On-behalf-of (OBO) passthrough | The tool runs with the signed-in user's permissions, where the tool supports it; an agent identity acting on behalf of the user is in preview |

> **Exam trap.** `require_approval` defaults to `"always"`, and an empty `allowed_tools` means every tool, not none. To let an agent read freely but confirm writes, list the tools in `allowed_tools` and require approval only for the write tool.

> **Exam trap.** A new agent identity has no role assignment, and existing assignments don't move when a legacy agent is migrated. "The agent gets 403 from the storage account" means a missing role on the target for the identity the connection uses.

<!-- section: key-points -->
## Key points

- Guardrail = controls (risk + intervention points + action). Default Microsoft.DefaultV2: four harms at medium, user prompt attack detection, protected material; indirect attacks off.
- Agents add tool call and tool response intervention points (agent guardrails are preview); an agent guardrail fully replaces the model guardrail.
- Blocked prompt: HTTP 400 `content_filter`. Blocked completion: `finish_reason` `content_filter`.
- Evaluators score, guardrails block. Safety evaluators: 0–7, threshold 3, no deployment needed; the `reason` explains the score.
- AI Red Teaming Agent: PyRIT attacks, Attack Success Rate.
- Audit: OpenTelemetry traces in Application Insights (Log Analytics Reader), Content Credentials (C2PA) on generated images, logged approvals.
- MCP: `require_approval` (default `"always"`), `allowed_tools` (empty = all). Agent identity starts with no permissions: grant least privilege on the target.
