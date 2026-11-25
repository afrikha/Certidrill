The last implementation task covers how GenAI reaches users and business processes, and the tools developers use to build and fix it: API interfaces designed for token streams and slow models, low-code and declarative front ends (AWS Amplify, OpenAPI, Amazon Bedrock Flows), business workflows (CRM enhancements, document processing, Amazon Bedrock Data Automation), agent frameworks and orchestration patterns, AI coding assistants, and the logs and traces used to troubleshoot model calls. Several services named by the exam guide have changed status in 2026, so the exam's correct answer for a new design is the current option.

<!-- section: fm-api-interfaces | objectives: 2.5.1 -->
## API interfaces for GenAI workloads

A GenAI API differs from a CRUD API in three ways: responses are long and produced token by token, requests and responses are bounded by token limits, and calls fail by timeout or throttling more often.

| Concern | Design choice |
| --- | --- |
| Streaming responses | API Gateway REST API with response transfer mode `STREAM` on an `HTTP_PROXY` or `AWS_PROXY` integration (up to 15 minutes, beyond 10 MB), Lambda response streaming, or a WebSocket API that pushes deltas |
| Integration timeouts | REST default 50 ms to 29 seconds; raise it above 29 seconds only for Regional or private APIs (may reduce the account throttle quota), or stream; WebSocket integrations stay at 29 seconds |
| Input token limits | Validate size at the edge (`maxLength` in the request model); count tokens with the free `CountTokens` operation; trim or summarize old conversation turns; keep retrieved context within a token budget |
| Output token limits | Set `maxTokens` per use case; treat `stopReason` `max_tokens` as truncated output (continue or ask a shorter question) and `model_context_window_exceeded` as an input that must shrink |
| Model timeouts | SDK `read_timeout` above the longest expected generation (the botocore default is 60 seconds); retry `ModelTimeoutException` once, then reduce the request or stream |
| Retries | SDK `standard` or `adaptive` retry mode with exponential backoff and jitter; idempotency keys on asynchronous submissions so a retried `POST` doesn't create two jobs |
| Cost visibility | Return or log `usage.inputTokens` and `usage.outputTokens` per call, tagged with `requestMetadata` |

```text
# Python (boto3): keep a conversation under a token budget before calling the model
budget = 6000
count = runtime.count_tokens(modelId=MODEL_ID,
                             input={"converse": {"messages": history, "system": system}})
while count["inputTokens"] > budget and len(history) > 2:
    history = summarize_oldest_turns(history)   # replace old turns with a short summary
    count = runtime.count_tokens(modelId=MODEL_ID,
                                 input={"converse": {"messages": history, "system": system}})
```

> **Exam trap.** Increasing `maxTokens` doesn't fix `model_context_window_exceeded`: the input is too large. Reduce retrieved chunks, summarize history or pick a model with a larger context window.

<!-- section: accessible-interfaces | objectives: 2.5.2 -->
## Accessible AI interfaces: Amplify, OpenAPI and Bedrock Flows

**AWS Amplify AI kit** builds full-stack chat and generation features from declarative definitions:

| Element | Purpose |
| --- | --- |
| `a.conversation()` | Multi-turn chat route with streaming responses; owner-based authorization only; conversations and messages stored automatically in DynamoDB so users can resume them |
| `a.generation()` | Single request-response route (an AWS AppSync query), for example structured extraction or summaries; authorization for authenticated users, guests, groups or a public API key |
| `aiModel`, `systemPrompt` | Bedrock model and instructions of the route |
| `@aws-amplify/ui-react-ai`: `AIConversation`, `useAIConversation`, `useAIGeneration` | Ready-made React chat UI component and hooks |

```text
// TypeScript (Amplify Gen 2 data schema)
const schema = a.schema({
  chat: a.conversation({
    aiModel: a.ai.model("Claude 3.5 Haiku"),
    systemPrompt: "You answer questions about AnyCompany orders.",
  }).authorization((allow) => allow.owner()),
});
```

**OpenAPI for API-first development.** Teams agree on an OpenAPI definition before writing code, then import it into API Gateway (OpenAPI 2.0 or 3.0) with request models and the `x-amazon-apigateway-request-validators` extension, mock the integration for front-end teams, and generate client SDKs. The same definition documents the API for consumers and describes tools for agents.

**Amazon Bedrock Flows** (the exam guide's Prompt Flows) is a visual builder, also driven by API, that links prompts, models, knowledge bases and AWS services into a workflow without orchestration code:

| Node category | Nodes |
| --- | --- |
| Logic | Input (one per flow), Output (one or more), Condition, Iterator, Collector, DoWhile loop (default `maxIterations` 10) |
| Data processing | Prompt (inline or from Prompt management), Knowledge base, Lambda function, S3 storage, S3 retrieval, Lex, Agent, Inline code (Python 3.12, preview) |

The working draft is tested in the console; a **version** is an immutable snapshot; an **alias** points to a version, and applications call `InvokeFlow` on the alias. Rolling back means pointing the alias at the previous version.

> **Exam tip.** "Business analysts must assemble and change a prompt-plus-retrieval workflow without writing code" points to Bedrock Flows. "Front-end developers need a chat UI connected to Bedrock with the least code" points to the Amplify AI kit.

<!-- section: business-enhancements | objectives: 2.5.3 -->
## Business system enhancements

| Enhancement | Pattern |
| --- | --- |
| CRM: summarize a customer's history, draft a reply, classify a case | A Lambda function called by the CRM (webhook, Amazon AppFlow-synchronized data, or an Amazon Connect flow) reads the record, calls Bedrock, writes the result back through the CRM API |
| Document processing: extract, validate, route | Step Functions workflow started by an S3 upload: extraction, model-based classification and validation, a human review branch, writes to the system of record |
| Multimodal extraction at scale | Amazon Bedrock Data Automation (BDA) |

**Bedrock Data Automation** extracts insights from documents, images, video and audio through one API. **Standard output** returns default results per data type (document summaries, audio transcripts, video scene summaries). **Custom output** (documents, audio and images) uses **blueprints**, lists of fields to extract, custom or from the BDA blueprint catalog. A **project** groups standard output settings and blueprints. `InvokeDataAutomationAsync` takes the input and output S3 URIs, the data automation profile ARN, the project ARN and stage (or up to 40 blueprints), optional KMS encryption and an EventBridge notification; poll `GetDataAutomationStatus` or react to the event. Results include confidence scores and visual grounding.

```json
{
  "StartAt": "ExtractWithBDA",
  "States": {
    "ExtractWithBDA": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "start-bda-job",
        "Payload": { "objectKey.$": "$.detail.object.key", "taskToken.$": "$$.Task.Token" }
      },
      "Next": "CheckConfidence"
    },
    "CheckConfidence": {
      "Type": "Choice",
      "Choices": [
        { "Variable": "$.minConfidence", "NumericLessThan": 0.8, "Next": "HumanReview" }
      ],
      "Default": "WriteToERP"
    },
    "HumanReview": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
      "Parameters": {
        "QueueUrl": "https://sqs.eu-west-1.amazonaws.com/111122223333/review-queue",
        "MessageBody": { "doc.$": "$", "taskToken.$": "$$.Task.Token" }
      },
      "Next": "WriteToERP"
    },
    "WriteToERP": { "Type": "Pass", "End": true }
  }
}
```

Low-confidence extractions wait for a reviewer, who resumes the workflow with `SendTaskSuccess` (`.waitForTaskToken` is available in Standard workflows). The Step Functions Bedrock integration (`arn:aws:states:::bedrock:invokeModel`) accepts a body up to 256 KiB inline, or `Input` and `Output` S3 locations for larger payloads.

> **Exam trap.** Amazon Augmented AI (A2I) and SageMaker Ground Truth are closed to new customers since July 30, 2026. A new human-review step is built with Step Functions task tokens (queue, ticket or web form) rather than an A2I human loop.

<!-- section: developer-productivity | objectives: 2.5.4 -->
## Developer productivity tools

The exam guide names **Amazon Q Developer**. Its new sign-ups closed on May 15, 2026, its IDE plugins and paid subscriptions reach end of support on April 30, 2027, and AWS's successor is **Kiro**, an agentic IDE and CLI. Recognize Q Developer in a question as the guide's example; for a new team, the current tool is Kiro.

| Need | Kiro capability |
| --- | --- |
| Generate and refactor code from a requirement | Specs: requirements, design and a task list the agent implements step by step; chat for iterative work |
| Apply team conventions (SDK versions, logging format, error handling for Bedrock calls) | Steering files applied automatically to every request |
| AI component testing | Hooks triggered by file changes, tool use or task completion, for example regenerate tests and rerun the prompt evaluation when a template changes |
| API assistance with current documentation and internal APIs | MCP servers connected to the agent |
| Automation in pipelines | Kiro CLI with a headless mode for CI |
| Performance optimization | Ask the agent to profile and rewrite hot paths (client reuse, streaming, batching), reviewed like any change |

Generated code is reviewed and tested like human code; secrets never go in steering files or prompts.

<!-- section: advanced-genai-apps | objectives: 2.5.5 -->
## Advanced GenAI applications: agents, orchestration and prompt chaining

**Amazon Bedrock Agents (now Agents Classic) is closed to new customers since July 30, 2026.** New agents are built with an open-source framework and hosted on **Amazon Bedrock AgentCore** (Runtime, Memory, Gateway, Identity, Observability), which is framework- and model-agnostic.

| Framework or service | What it brings |
| --- | --- |
| Strands Agents | Open-source, model-driven SDK (Python and TypeScript): the model plans and calls tools in a loop; many model providers including Bedrock; custom tools, MCP servers, hooks, session persistence, OpenTelemetry; multi-agent patterns Agents as Tools, Swarm, Graph and Workflow; Agent2Agent (A2A); deployable to Lambda, Fargate, EKS, EC2 or AgentCore |
| Agent Squad (formerly Multi-Agent Orchestrator) | Open-source framework (Python and TypeScript) that classifies each request and routes it to the most suitable agent, keeps context across agents, and offers a `SupervisorAgent` that coordinates specialized agents in parallel |
| Step Functions | Deterministic orchestration of agent design patterns with audit history, retries, timeouts and human approval |
| Bedrock Flows and Prompt management | Prompt chaining with versioned prompts and no orchestration code |

Classic patterns and their Step Functions implementation:

| Pattern | Step Functions construct |
| --- | --- |
| Prompt chaining (output of one prompt feeds the next, with checks between steps) | Sequential Bedrock tasks with a `Choice` gate |
| Routing to specialized prompts or models | Classification task, then `Choice` |
| Parallelization (sections or votes) | `Parallel` state or `Map` state, then an aggregation step |
| Orchestrator-workers | A planning task returns subtasks, a `Map` state runs a worker per subtask, a synthesis task merges |
| Evaluator-optimizer | Generate, evaluate with a judge model, loop through `Choice` until the score passes or a maximum iteration count stops it |

**Prompt chaining in Bedrock** uses Prompt management versions (call `Converse` with the prompt version ARN as `modelId` and `promptVariables`, which requires `bedrock:RenderPrompt`), a Flow with successive Prompt nodes, or application code. Chaining small, focused prompts is easier to test and cheaper than one huge prompt.

> **Exam trap.** When a question needs the model to decide dynamically which tools to call, choose an agent framework (Strands Agents on AgentCore); when the steps are known in advance and must be auditable, choose Step Functions or Flows. A design that creates a new Bedrock Agents Classic agent is not valid for a new customer.

<!-- section: troubleshooting-tools | objectives: 2.5.6 -->
## Troubleshooting FM applications efficiently

**Model invocation logging** (disabled by default; per Region; CloudWatch Logs, S3 or both; bodies over 100 KB and binary data go to S3) records `Converse`, `ConverseStream`, `InvokeModel` and `InvokeModelWithResponseStream` calls made through the `bedrock-runtime` endpoint, with `modelId`, `identity.arn`, `requestMetadata`, `input.inputBodyJson`, `input.inputTokenCount`, `output.outputBodyJson` and `output.outputTokenCount`. **CloudWatch Logs Insights** queries these logs to analyze prompts and responses:

```text
fields @timestamp, modelId, requestMetadata.feature, input.inputTokenCount, output.outputTokenCount
| filter requestMetadata.feature = "ticket-summary"
| stats count(*) as calls, avg(input.inputTokenCount) as avgIn, max(output.outputTokenCount) as maxOut by modelId
| sort calls desc
```

Use cases: find the prompts behind bad answers, detect prompt growth (rising input tokens after a template change), compare models, and group recurring errors with the `pattern` command.

| Symptom | Tool |
| --- | --- |
| Slow answers: retrieval, model or retries? | Traces (ADOT instrumentation viewed in X-Ray and CloudWatch) across API Gateway, Lambda, Bedrock, the vector store |
| Token usage, latency and errors per model or agent | CloudWatch generative AI observability dashboards (model invocations, AgentCore agents) and Bedrock metrics such as `InvocationThrottles` and `TimeToFirstToken` |
| Recurring GenAI error patterns (throttling, truncation, guardrail interventions, malformed tool use) | Logs Insights `pattern` and `stats` on `stopReason` values logged by the application; CloudWatch alarms |
| Root cause analysis across signals | CloudWatch investigations, AWS DevOps Agent, or Kiro on the code base; Amazon Q Developer is the guide's example but is closed to new sign-ups |

> **Exam trap.** Model invocation logging is off by default and doesn't capture calls made on the `bedrock-mantle` endpoint. If a team "can't find the prompts" in CloudWatch, the fix is to enable invocation logging for the Region with the right modalities and destination, not to add X-Ray, which records timing, not prompt content.

<!-- section: key-points -->
## Key points

- GenAI APIs: stream (`STREAM` mode, Lambda streaming, WebSockets), respect integration timeouts, manage tokens with `CountTokens`, `maxTokens` and history summarization, retry with SDK backoff and idempotency keys.
- Amplify AI kit: `a.conversation` (streaming chat, stored history, owner auth) and `a.generation` (single AppSync query), `AIConversation` UI. OpenAPI import with validators for API-first. Bedrock Flows: nodes, immutable versions, aliases, `InvokeFlow`.
- Business workflows: Lambda for CRM enhancements; Step Functions for document pipelines with task-token human review; Bedrock Data Automation with standard output, blueprints, projects and `InvokeDataAutomationAsync`.
- Q Developer is closed to new sign-ups; Kiro (specs, steering, hooks, MCP, CLI) is the current AI developer tool.
- Agents: Strands Agents and Agent Squad on AgentCore; Agents Classic closed to new customers. Step Functions for chaining, routing, parallelization, orchestrator-workers and evaluator-optimizer loops.
- Troubleshooting: invocation logs plus Logs Insights for prompt and token analysis, ADOT and X-Ray traces for latency, generative AI observability dashboards, CloudWatch investigations for root cause.
