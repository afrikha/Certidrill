An agent in Foundry Agent Service is a saved, versioned definition (a model, instructions and tools) that decides on its own which tool to call to reach a goal. You call it through the Responses API, keep the conversation on the service, connect it to data and APIs, combine several agents when one isn't enough, put humans in the loop for risky actions, and watch it in production. Exam questions ask which tool or pattern fits, how to complete the code that creates or calls an agent, and how to read its traces and evaluation results.

<!-- section: agent-design | objectives: 2.2.1 -->
## Roles, goals, conversation tracking and tool schemas

The **instructions** define the agent's role and goal. Write them as a contract: who the agent is, what it must achieve, what is out of scope, when to use each tool, what to do when information is missing, and the output format.

```text
from azure.ai.projects.models import PromptAgentDefinition

agent = project.agents.create_version(
    agent_name="returns-agent",
    definition=PromptAgentDefinition(
        model="gpt-4.1-mini",
        instructions=(
            "You are the returns assistant of Adatum Retail. Goal: resolve return requests. "
            "Use get_order before answering any question about an order. "
            "Never promise a refund above 500 USD: hand off to a human instead. "
            "Answer in at most five sentences."
        ),
        tools=[order_tool],
    ),
)
```

Agent types:

| Type | What you provide | Fits |
| --- | --- | --- |
| Prompt agent | Model, instructions, tools; Foundry runs it | Most business agents, no infrastructure to manage |
| Hosted agent | Your code (Agent Framework, LangGraph, OpenAI Agents SDK or other) as a container image or a .zip package | Custom orchestration, multi-agent systems, custom protocols |

Each `create_version` call creates a new **version**: you can compare versions and roll back.

**Conversation tracking** decides where the history lives:

| Approach | How | Use |
| --- | --- | --- |
| Conversation object | `conversation = openai.conversations.create()`, then `responses.create(conversation=conversation.id, ...)` | Multi-turn chats with an agent; the service stores the items |
| Response chaining | `previous_response_id=` the last response | Only where the runtime supports it; some agent runtimes reject it |
| Stateless | The application resends the whole history | Full control, but more input tokens each turn |
| Long-term memory | A memory store, across sessions | Remember preferences between conversations, not within one |

**Tool schemas.** A function tool is described by a name, a description that tells the model when to use it, and parameters in JSON Schema:

```json
{
  "type": "function",
  "name": "get_order",
  "description": "Get the status, items and total of an order by its order number.",
  "parameters": {
    "type": "object",
    "properties": {
      "order_id": { "type": "string", "description": "Order number, for example SO-10023" }
    },
    "required": ["order_id"],
    "additionalProperties": false
  },
  "strict": true
}
```

`required` lists the arguments the model must supply, `additionalProperties: false` forbids others, and `strict: true` enforces the schema where the runtime supports it. Clear names and descriptions are what make the model pick the right tool.

> **Exam trap.** The conversation object keeps the context of one conversation. It doesn't remember the user next week: that is long-term memory. And memory isn't a way to give the agent company documents: that is retrieval.

<!-- section: retrieval-functions-memory | objectives: 2.2.2 -->
## Agents with retrieval, function calling and memory

**Retrieval.** Attach a knowledge tool: file search (`FileSearchTool(vector_store_ids=[...])`, one vector store per agent), the Azure AI Search tool on an existing index, or a Foundry IQ knowledge base. Ask for citations in the instructions, or the response may have none.

**Function calling** with an agent. The application, not the service, runs the function:

```text
with project.get_openai_client(agent_name=agent.name) as openai:
    conversation = openai.conversations.create()
    response = openai.responses.create(conversation=conversation.id, input="Where is order SO-10023?")

    outputs = []
    for item in response.output:
        if item.type == "function_call" and item.name == "get_order":
            result = get_order(**json.loads(item.arguments))
            outputs.append(FunctionCallOutput(
                type="function_call_output",
                call_id=item.call_id,
                output=json.dumps(result),
            ))

    response = openai.responses.create(conversation=conversation.id, input=outputs)
    print(response.output_text)
```

Runs expire 10 minutes after creation: return tool outputs before then, and for slow work return a status and poll separately. The portal can run an agent that has function tools but can't execute the functions or edit their definitions; use the SDK or REST API.

**Memory** (preview) is a managed long-term store attached to an agent with the memory search tool (recommended) or managed through the memory store APIs.

| Memory type | Stores |
| --- | --- |
| User profile | Durable preferences: language, defaults, accessibility needs |
| Chat summary | Distilled summaries of earlier conversations |
| Procedural | Reusable routines inferred from earlier interactions |

The service extracts, consolidates (merges duplicates, resolves conflicts) and retrieves memories. Memories are partitioned by **scope**; with the memory search tool, scope `{{$userId}}` resolves it from the caller's identity. Memory needs a chat model deployment and an embedding model deployment, supports up to 100 scopes per store and 10,000 memories per scope, and doesn't support virtual network integration. Because an LLM writes the memories, they can carry prompt injection: validate content with Azure AI Content Safety.

> **Exam tip.** "Remember that this customer prefers French across sessions" is memory. "Answer from the product catalog" is retrieval. "Check the live stock level" is a function or API tool.

<!-- section: agent-tools | objectives: 2.2.3 -->
## Integrating agent tools

| Tool | Gives the agent | Who executes |
| --- | --- | --- |
| Function calling | Your own code | Your application |
| OpenAPI | A REST API described by an OpenAPI 3.0 or 3.1 spec | The service calls the API |
| Model Context Protocol (MCP) | The tools of a remote MCP server | The MCP server |
| Azure Functions | A function app as a tool | Azure Functions |
| Azure AI Search, file search, Foundry IQ | Knowledge stores and search | The service |
| Web search, Grounding with Bing | Current public web information | The service |
| Code interpreter | Python in a sandbox, for calculations, charts and file processing | The service |
| Agent-to-agent (A2A) | Delegation to another agent | The remote agent |
| Content Understanding Tool | Multimodal files turned into Markdown or schema fields | Content Understanding |

OpenAPI tool rules: every operation needs an `operationId` (letters, `-` and `_`), request bodies are `application/json`, one API key scheme per tool. Authentication goes through a project connection: anonymous, API key, bearer token in a custom keys connection, or project managed identity with the **audience** of the target API (for example `https://storage.azure.com`).

```text
weather_tool = OpenApiTool(
    openapi=OpenApiFunctionDefinition(
        name="get_weather",
        spec=openapi_spec,
        description="Retrieve weather information for a location.",
        auth=OpenApiAnonymousAuthDetails(),
    )
)
```

MCP: `server_label` (unique per agent), `server_url`, `project_connection_id` for credentials, `allowed_tools`, `require_approval`. Non-streaming MCP calls time out after 100 seconds. A private MCP server needs the standard agent setup with your own virtual network.

Azure AI Search tool: targets one index through a connection; the Foundry account's managed identity needs Search Index Data Contributor and Search Service Contributor for keyless access. **Toolboxes** group tools behind one managed MCP endpoint so several agents reuse them and their credentials.

| Requirement | Tool |
| --- | --- |
| Call an internal REST API that has a published spec, no client code | OpenAPI |
| Run logic that must stay in the application (local database, user session) | Function calling |
| Reuse a vendor's tools exposed by an MCP server | MCP |
| Compute an aggregate from an uploaded CSV | Code interpreter |
| Read invoices and contracts of any format into fields for the agent | Content Understanding |

> **Exam trap.** With function calling, the response stops at a `function_call` item until your code returns the output. With OpenAPI or MCP, the service makes the call itself. "The agent must call the API without the client application running any code" excludes function calling.

<!-- section: multi-agent | objectives: 2.2.4 -->
## Orchestrated multi-agent solutions

Use several agents when one agent would need too many tools or conflicting instructions, when tasks need different models or permissions, or when steps can run in parallel. Otherwise, one agent is simpler and cheaper.

| Pattern (Agent Framework) | Behavior | Fits |
| --- | --- | --- |
| Sequential | Agents run one after the other; each output feeds the next | Draft, review, polish |
| Concurrent | Agents run in parallel; results are combined | Independent analyses, lower latency |
| Handoff | Control moves to the agent best suited to the context | Triage and routing to specialists |
| Group chat | Agents collaborate in a shared conversation | Debate, critique, refinement |
| Magentic | A manager agent plans and calls specialists dynamically | Open-ended tasks with no fixed plan |

Ways to build them in Foundry:

| Option | Use |
| --- | --- |
| **A2A tool** (A2A 1.0, generally available) | A Foundry agent calls one remote agent and keeps control of the conversation; the target needs incoming A2A enabled and the caller the Foundry Agent Consumer role on its project |
| **Microsoft Agent Framework** workflows, deployed as a hosted agent | Code or declarative YAML orchestration with the patterns above; the recommended path |
| **Foundry workflows** (preview) | Visual designer with sequential, group chat and human in the loop templates; retires December 1, 2026 (export the YAML) |

The classic **connected agents** tool isn't available in the new Foundry Agent Service: migrate to the A2A tool or to workflows.

> **Exam trap.** Multi-agent isn't the answer to "the agent needs one more data source": add a tool. Choose multi-agent for separation of responsibilities, permissions or models.

<!-- section: safeguards-approval | objectives: 2.2.5 -->
## Autonomous and semiautonomous workflows with safeguards

| Mode | Agent behavior | Typical use |
| --- | --- | --- |
| Autonomous | Calls tools and completes the task without waiting | Read-only lookups, reversible low-risk actions |
| Semiautonomous | Proposes the action, waits for a human decision on defined steps | Payments, deletions, external messages, changes to records |

Safeguards to combine:

- **Approval flow on tools**: MCP `require_approval` returns an `mcp_approval_request`; your app collects the decision and sends an `mcp_approval_response` in the same conversation. In Agent Framework workflows, a tool that requires approval pauses the workflow with a `function_approval_request`.
- **Human input steps**: in Agent Framework, an executor calls `ctx.request_info(...)`; the workflow emits a `request_info` event, waits, and resumes in the `@response_handler` method when the response arrives. **Checkpoints** save pending requests so a workflow can resume later.
- **Function tools**: your code can validate arguments and refuse or confirm side effects before running anything.
- **Limits in instructions and tools**: amount thresholds, `allowed_tools`, least-privilege identities.
- **Guardrails** on tool call and tool response, and Task Adherence.
- **Logging**: every approval and tool call traced.

Order of a semiautonomous refund flow:

1. The agent gathers the facts with read-only tools (no approval).
2. It proposes the refund call; the tool requires approval.
3. The application shows the tool name and arguments to an approver.
4. The approver accepts or rejects; the decision is sent back with the request ID.
5. The agent completes or explains the refusal; the trace records the whole sequence.

> **Exam trap.** Writing "always ask before refunding" in the instructions is a request to the model, not a control. A guaranteed human approval comes from the tool configuration or the workflow, outside the model's decision.

<!-- section: monitor-agents | objectives: 2.2.6 -->
## Monitoring, evaluating and debugging agents

**Monitoring.** With Application Insights connected, the agent's **Monitor** tab (preview) shows token usage, latency, run success rate, evaluation scores and red teaming results, and alerts can be set on them. Learn's guidance: latency above 10 seconds suggests throttling or slow tools; a success rate below 95% needs investigation.

**Continuous evaluation** scores sampled production responses with chosen evaluators; **scheduled evaluation** runs on a timetable against test data or traces to catch drift:

```text
rule = project.evaluation_rules.create_or_update(
    id="returns-agent-safety",
    evaluation_rule=EvaluationRule(
        display_name="Returns agent safety",
        action=ContinuousEvaluationRuleAction(eval_id=eval_object.id, max_hourly_runs=100),
        event_type=EvaluationRuleEventType.RESPONSE_COMPLETED,
        filter=EvaluationRuleFilter(agent_name="returns-agent"),
        enabled=True,
    ),
)
```

`max_hourly_runs` (default 100) caps evaluation runs per hour; runs beyond it are skipped. The project's managed identity needs the Foundry User role for continuous evaluation.

**Agent evaluators**:

| Question | Evaluator |
| --- | --- |
| Did the agent understand what the user wanted? | Intent Resolution |
| Did it follow its instructions and constraints? | Task Adherence |
| Did it finish the task with a usable result? | Task Completion |
| Right tools, right parameters, no redundant calls? | Tool Call Accuracy |
| Necessary tools chosen, no unnecessary ones? | Tool Selection |
| Arguments valid against the schema and grounded? | Tool Input Accuracy |
| Tool results actually used in the answer? | Tool Output Utilization |
| Tool calls ran without technical errors? | Tool Call Success |
| Expected sequence of steps? | Task Navigation Efficiency |

Tool and task evaluators read the agent's structured output (`{{sample.output_items}}`), which includes the tool calls. Learn advises avoiding the tool evaluators when the conversation calls Azure AI Search, Bing grounding, code interpreter or web search.

**Error analysis** reads the trace of a failed run: the `execute_tool` span shows the arguments and result of each call, and durations show where latency comes from.

| Symptom in the trace | Likely cause | Fix |
| --- | --- | --- |
| No tool call, invented answer | Tool description unclear, or instructions don't require the tool | Improve the description or instructions |
| Tool called with a wrong argument format | Weak schema | Add descriptions, `required`, `strict` |
| Tool error, then the agent gives up | API failure or missing role for the identity | Fix permissions, add a retry |
| Correct tool result ignored in the answer | Low Tool Output Utilization | Revise instructions |

Then cluster failures, change one thing, re-evaluate and compare versions.

> **Exam tip.** "Which step made the agent slow?" is a trace question. "How often does the agent pick the wrong tool across 500 conversations?" is an evaluation question.

<!-- section: key-points -->
## Key points

- Prompt agent = model + instructions + tools, created with `agents.create_version`; hosted agent = your own code, run by Foundry.
- Conversations keep one session's history; memory (preview) keeps user profile, chat summary and procedural memories across sessions.
- Function calling: your app runs the function; OpenAPI and MCP: the service calls them. Runs expire after 10 minutes.
- OpenAPI needs `operationId`; MCP calls time out at 100 seconds; Azure AI Search tool targets one index.
- Multi-agent: A2A tool for delegation, Agent Framework for orchestration patterns; Foundry workflows designer retires December 1, 2026; connected agents aren't available.
- Guaranteed human approval comes from tool or workflow configuration, not instructions.
- Monitor tab: tokens, latency, success rate, evaluations. Continuous evaluation rule: `max_hourly_runs` 100.
- Agent evaluators: Intent Resolution, Task Adherence, Task Completion, Tool Call Accuracy and the other tool evaluators.
