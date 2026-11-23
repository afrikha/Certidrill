An agent is a foundation model in a loop: it reasons about a goal, chooses a tool, observes the result and decides what to do next until the task is done. Production agents also need memory, guardrails on what they may do, limits on how long they may run, humans in the loop for risky decisions and reliable tools. This chapter covers the AWS building blocks for each of these: Strands Agents and Amazon Bedrock AgentCore, multi-agent patterns, AWS Step Functions for structured reasoning and approvals, tool definitions, and Model Context Protocol (MCP) servers on AWS Lambda and Amazon ECS.

<!-- section: agent-memory-state | objectives: 2.1.1 -->
## Autonomous agents with memory and state

**Which agent platform for a new design**:

| Component | Role |
| --- | --- |
| Strands Agents | Open-source SDK (Python and TypeScript) with a model-driven agent loop: you give a model, a system prompt and tools; the model plans and calls tools until it produces a final answer |
| AgentCore Runtime | Serverless hosting for agents and tools built with any framework (Strands Agents, LangGraph, CrewAI, LlamaIndex, OpenAI Agents SDK...) and any model; supports MCP and A2A |
| AgentCore Memory | Managed short-term and long-term memory, shareable across agents |
| AgentCore Gateway | Turns APIs, Lambda functions and services into MCP tools, and connects existing MCP servers |
| AgentCore Identity, Policy, Observability | Agent identity and credentials, deterministic control of tool calls, OpenTelemetry tracing in CloudWatch |

> **Exam trap.** Amazon Bedrock Agents (now Agents Classic) has been closed to new customers since July 30, 2026. Questions may still mention action groups or agent aliases; for a new agent, choose Strands Agents or another framework hosted on AgentCore Runtime. Bedrock Knowledge Bases and Guardrails are not affected.

**State levels**:

| Level | Where it lives | Example |
| --- | --- | --- |
| Within one invocation | The agent's message history, managed by a conversation manager (sliding window by default in Strands, summarization as an alternative) to fit the context window | Tool results of the current task |
| Within a session | AgentCore Runtime session: a dedicated microVM per session, up to 8 hours per lifecycle, stopped after 15 minutes of inactivity by default; memory and disk are ephemeral unless session storage is configured | A file the agent wrote during the conversation |
| Across turns | AgentCore Memory short-term memory: events written with `CreateEvent` per actor and session | "What about tomorrow?" understood as a follow-up |
| Across sessions | AgentCore Memory long-term memory: strategies extract records from events (semantic facts, user preferences, summaries, episodes); built-in, built-in with overrides, or self-managed | "The customer prefers window seats" |
| Business state | DynamoDB, under your control | Order status, approval status |

Each invocation of an AgentCore Runtime agent carries a `runtimeSessionId` (at least 33 characters, unique per user or conversation): reusing it routes to the same session, a new one isolates users.

**Multi-agent systems**:

| Pattern | How it works | Use it when |
| --- | --- | --- |
| Agents as tools (Strands) | An orchestrator agent calls specialist agents like tools | Default starting point: one coordinator, several experts |
| Workflow (Strands) | Your code calls agents in a fixed order | Steps known in advance |
| Graph (Strands) | Agents as nodes, edges fixed, parallel or conditional, loops allowed | Execution path controlled in code (route on a validator's verdict) |
| Swarm (Strands) | Agents hand tasks to one another without a fixed path | Exploratory work (brainstorming, incident analysis) |
| Agent-to-Agent (A2A) | Agents running as separate services talk over the A2A protocol | Agents owned by different teams or built with different frameworks |
| Agent Squad | Open-source framework (formerly Multi-Agent Orchestrator): a classifier routes each query to the most suitable specialized agent; a `SupervisorAgent` coordinates sub-agents in parallel | Many specialized assistants behind one entry point |

MCP standardizes agent-tool interactions: the agent is an MCP client that discovers tools (name, description, input schema) at run time instead of hard-coding them.

<!-- section: reasoning-patterns | objectives: 2.1.2 -->
## Structured reasoning with ReAct and chain-of-thought

**ReAct** (reason and act) alternates thought, action and observation: the model reasons about the next step, calls a tool, reads the result, and repeats. Strands Agents implements it natively. When the steps must be visible, auditable and bounded, implement the loop in **Step Functions**:

```text
Init (iteration = 0)
  -> Reason: Task bedrock:invokeModel (or Lambda calling Converse) with goal, history and tool list
  -> Choice on the model output:
       stopReason = tool_use and iteration below the limit -> Act
       final answer                                         -> Validate
       iteration limit reached                              -> Escalate
  -> Act: Lambda runs the tool, appends the observation, iteration + 1 -> back to Reason
  -> Validate: Lambda checks the answer format and sources -> Succeed
```

- The optimized integration `arn:aws:states:::bedrock:invokeModel` calls a model without Lambda. The request body is limited to 256 KiB: for larger inputs, use `Input` with an `S3Uri`, and `Output` to write the response to S3.
- State payloads are limited to 256 KiB: keep long histories in S3 or DynamoDB and pass references.
- A Standard workflow has 25,000 execution history events: a long loop must stop or continue as a new execution before reaching it.

**Chain-of-thought** in a workflow: one state asks the model to produce a plan (numbered steps), a Map state executes the steps, and a final state asks the model to synthesize. Separating planning from execution makes each prompt simpler and each step testable.

| Requirement | Choice |
| --- | --- |
| Flexible tool use, least code | Strands Agents on AgentCore Runtime |
| Every step logged, deterministic limits, visual audit trail | Step Functions ReAct loop |
| Fixed sequence of prompts with branches | Bedrock Flows |
| Long-running process with waits of hours or days | Step Functions Standard workflow |

<!-- section: safeguards | objectives: 2.1.3 -->
## Safeguarded agent workflows

Autonomy without limits produces loops, runaway costs and unauthorized actions. Combine four safeguards:

| Safeguard | Implementation |
| --- | --- |
| Stopping conditions | Iteration counter checked in a Choice state; maximum tokens or cost budget; explicit "task complete" signal; Strands stop reasons such as `limit_turns` and `limit_total_tokens` end the loop gracefully |
| Timeouts | `TimeoutSeconds` on Task states and on the state machine; `HeartbeatSeconds` for callbacks; Lambda function timeout (maximum 1,800 seconds) shorter than the caller's timeout |
| Resource boundaries | IAM execution role per agent or tool with least privilege: only the required actions, model ARNs and resources; permissions boundaries for roles created by automation; resource-based policies on Lambda functions; AgentCore Policy to restrict which tools an agent may call and under which conditions |
| Circuit breakers | After N failures of a tool or model within a window, stop calling it for a cool-down period and return a fallback; state kept in DynamoDB, checked by the workflow before the call |

Step Functions error handling for agent tasks:

```json
{
  "CallTool": {
    "Type": "Task",
    "Resource": "arn:aws:states:::lambda:invoke",
    "Parameters": { "FunctionName": "inventory-tool", "Payload.$": "$" },
    "TimeoutSeconds": 30,
    "Retry": [
      {
        "ErrorEquals": ["Lambda.TooManyRequestsException", "States.Timeout"],
        "IntervalSeconds": 2,
        "BackoffRate": 2,
        "MaxAttempts": 3
      }
    ],
    "Catch": [
      { "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "RecordFailureAndFallback" }
    ],
    "Next": "Reason"
  }
}
```

Limits: Standard workflows run up to 1 year, Express workflows up to 5 minutes; both fail with `States.Timeout` beyond that.

An IAM policy that bounds an agent's tool role (read-only order lookups, one table, one Region):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:eu-west-1:111122223333:table/Orders"
    }
  ]
}
```

> **Exam trap.** A system prompt that says "never delete records" is not a safeguard. The control is the IAM role of the tool (no delete permission) or a policy on the tool call; the prompt only reduces how often the model tries.

<!-- section: model-coordination | objectives: 2.1.4 -->
## Coordinating multiple models

One model rarely gives the best quality, latency and cost on every subtask. Coordination patterns:

| Pattern | How | Example |
| --- | --- | --- |
| Specialized FMs per task | Route each subtask to the model best suited to it | A multimodal model reads scanned invoices, a text model drafts the reply, an embedding model searches policies |
| Model cascade | Start with a small, fast model; escalate to a larger model when confidence is low or validation fails | Tier-1 support answers |
| Ensemble with aggregation | Several models (or several samples) answer in parallel; custom logic aggregates by majority vote, highest score, or a judge model choosing the best | High-stakes classification |
| Planner and workers | A capable model plans, cheaper models execute steps | Research and report generation |
| Model selection framework | Rules or a classifier pick the model from task type, input length, language, tenant tier and budget; the mapping is configuration, not code | Multi-tenant platform |

Implementation on AWS: a Step Functions **Parallel** state calls several models and a Lambda function aggregates; the model map lives in AWS AppConfig (or Parameter Store) so that switching models needs no deployment; Bedrock cross-Region inference profiles raise throughput for each model; CloudWatch metrics per model (latency, errors, tokens) feed the selection rules.

> **Exam tip.** "Reduce cost without lowering quality on hard questions" points to a cascade or router (small model first, escalate on low confidence), not to replacing the model everywhere.

<!-- section: human-in-the-loop | objectives: 2.1.5 -->
## Human review and collaboration

Humans add judgment where errors are costly: approving actions, correcting outputs, labeling feedback.

**Approval with Step Functions** (`.waitForTaskToken`):

1. A Task state with a `.waitForTaskToken` resource sends the proposed action and `$$.Task.Token` to a reviewer (SNS email, SQS queue read by a review app, EventBridge).
2. The workflow pauses (up to the one-year execution limit) without consuming compute.
3. The review app calls `SendTaskSuccess` (approve, with the reviewer's edits as output) or `SendTaskFailure` (reject).
4. `HeartbeatSeconds` or `TimeoutSeconds` escalates if nobody answers; a timed-out task fails with `States.Timeout`.

```json
{
  "RequestApproval": {
    "Type": "Task",
    "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
    "Parameters": {
      "QueueUrl": "https://sqs.eu-west-1.amazonaws.com/111122223333/refund-approvals",
      "MessageBody": { "refund.$": "$.proposedRefund", "taskToken.$": "$$.Task.Token" }
    },
    "TimeoutSeconds": 86400,
    "Next": "ExecuteRefund"
  }
}
```

Callbacks and `.sync` work only in **Standard** workflows; Express workflows support request-response only. Task tokens must be returned by a principal in the same AWS account.

**Feedback collection**: an Amazon API Gateway endpoint (authenticated with Cognito or IAM) receives ratings, corrections and comments, a Lambda function validates and stores them in DynamoDB or S3 with the invocation ID, and the data feeds prompt refinement, evaluation datasets and dashboards.

**Human augmentation patterns**:

| Pattern | When |
| --- | --- |
| Human approves before action | Irreversible or financial actions (refunds, account changes) |
| Confidence-based routing | Only low-confidence or high-risk outputs go to a reviewer |
| Human edits the draft | Customer-facing letters, legal summaries |
| Sampling audit | A percentage of automated outputs reviewed after the fact |

> **Exam trap.** Amazon Augmented AI (A2I) and SageMaker Ground Truth are named in the exam guide but closed to new customers since July 30, 2026. For a new human review workflow, build it with Step Functions task tokens, API Gateway and a review application.

<!-- section: tool-integration | objectives: 2.1.6 -->
## Reliable tool integrations

In Bedrock, the model never calls a tool itself: it returns a request, and the application (or the agent framework) runs the tool and returns the result.

Converse flow:

1. The request includes `toolConfig.tools[].toolSpec` (`name`, `description`, `inputSchema.json`) and optionally `toolChoice`.
2. The model answers with `stopReason` `tool_use` and a `toolUse` block (`toolUseId`, `name`, `input`).
3. The application validates the input, runs the tool and sends a `toolResult` block with the same `toolUseId`, the content and `status` `success` or `error` (status supported by Amazon Nova and Anthropic Claude 3 and 4 models).

| `toolChoice` | Effect |
| --- | --- |
| `auto` (default) | The model decides whether to call a tool or answer in text |
| `any` | The model must request at least one tool |
| `tool` | The model must request the named tool (Anthropic Claude 3 and Amazon Nova models) |

**Standardized function definitions**: one clear name per tool, a description that says when to use it and when not to, typed parameters with `enum` values and `required` fields, and `"strict": true` so that Bedrock validates the tool name and input against the schema.

**Lambda as a reliable tool**:

- Validate parameters again in the function (types, ranges, authorization of the caller for that record): the model's input is untrusted.
- Return errors as structured tool results ("order not found", "date must be in the future") so the model can correct itself; the Strands agent loop also returns tool failures to the model instead of ending.
- Make write operations idempotent (an idempotency key from the `toolUseId` or the business request).
- Set a timeout and retries for downstream calls, and keep responses small (summaries, not whole records).

**Strands custom behaviors**: tools are Python functions decorated with `@tool` (the docstring and type hints become the description and schema); hooks on the agent's lifecycle events (before and after model calls and tool calls) add logging, metrics, input checks or approvals without changing the loop.

```text
from strands import Agent, tool

@tool
def get_order_status(order_id: str) -> dict:
    """Return the shipping status of one order. Use only for order IDs that start with ORD-."""
    if not order_id.startswith("ORD-"):
        return {"status": "error", "content": [{"text": "Invalid order ID format"}]}
    return {"status": "success", "content": [{"text": lookup_status(order_id)}]}

agent = Agent(system_prompt="You are a support assistant.", tools=[get_order_status])
```

<!-- section: mcp-extensions | objectives: 2.1.7 -->
## Extending FMs with MCP servers

An **MCP server** exposes tools (and resources and prompts) through a standard protocol; any **MCP client** (Strands Agents, other frameworks, IDE assistants) can discover and call them. Hosting choices:

| Requirement | Host |
| --- | --- |
| Lightweight, stateless tools (lookups, conversions, single API calls), pay per request | AWS Lambda with the streamable HTTP transport, behind a function URL or API Gateway |
| Complex tools: long-running operations, large dependencies, connection pools, in-memory state or sessions | Amazon ECS on AWS Fargate behind an Application Load Balancer, scaled with Service Auto Scaling |
| Managed hosting with session isolation and identity for MCP servers or agents | AgentCore Runtime (MCP protocol supported) |
| One governed endpoint for many tools, APIs and existing MCP servers | AgentCore Gateway: Lambda, OpenAPI and Smithy targets become MCP tools; MCP targets are aggregated into one virtual MCP server; semantic tool selection lets agents find the right tool among thousands; OAuth inbound authorization and credential injection outbound |

**MCP client libraries** give every agent the same access pattern. In Strands Agents, `MCPClient` wraps a transport (stdio for local servers, streamable HTTP for remote servers including IAM- or OAuth-protected ones, SSE for older servers) and is passed to the agent as a tool provider:

```text
from mcp.client.streamable_http import streamablehttp_client
from strands import Agent
from strands.tools.mcp import MCPClient

catalog = MCPClient(lambda: streamablehttp_client("https://tools.example.com/mcp"))

with catalog:
    agent = Agent(tools=catalog.list_tools_sync())
    agent("Which products are low on stock in the Lyon warehouse?")
```

The agent must run inside the `with` block (or receive the client itself as a tool provider, which manages the connection lifecycle).

> **Exam trap.** Lambda suits stateless MCP servers but not tools that keep long-lived connections or session state between calls. "The tool keeps a browser session open" or "loads a 4 GB model in memory" points to ECS (or AgentCore Runtime), not Lambda.

<!-- section: key-points -->
## Key points

- New agents: Strands Agents (or another framework) on AgentCore Runtime, with AgentCore Memory, Gateway, Identity, Policy and Observability. Bedrock Agents Classic is closed to new customers.
- Memory: conversation manager inside an invocation, Runtime session (microVM, up to 8 hours, 15-minute idle default), AgentCore Memory short-term events and long-term strategies, business state in DynamoDB.
- Multi-agent: agents as tools, workflow, graph, swarm, A2A; Agent Squad routes with a classifier.
- Step Functions: ReAct loops with `bedrock:invokeModel` (256 KiB, S3 input and output), Choice-based stopping conditions, `Retry` and `Catch`, timeouts and heartbeats, approvals with `.waitForTaskToken` (Standard only).
- Safeguards: iteration and budget limits, timeouts (Lambda maximum 1,800 seconds), least-privilege IAM per tool, circuit breakers; prompts are never the control.
- Tools: `toolSpec` with JSON schema, `toolChoice` `auto` / `any` / `tool`, `toolResult` with `status` `error`, `strict` schemas, validation and idempotency in Lambda.
- MCP: Lambda for stateless lightweight servers, ECS for complex or stateful ones, AgentCore Gateway to turn APIs and Lambda functions into MCP tools; Strands `MCPClient` as the standard client.
