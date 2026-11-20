AI security questions describe an application that sends data to a model or lets an agent call tools, and a risk: an identity with too much access, prompts that leave the VPC or the geography, PII in prompts, responses or logs, a prompt injection, or an agent that acts without approval. The answer is a control you apply in code or configuration: IAM and SCP conditions, VPC endpoints, Amazon Bedrock Guardrails, Amazon Bedrock AgentCore features, approval steps, and log protection. Designing guardrail frameworks or choosing models is out of scope; applying them is in scope.

<!-- section: ai-access | objectives: 2.3.1 -->
## Requesting and managing access to AI services

In commercial Regions, most Amazon Bedrock serverless models are **enabled automatically**: there is no access request. The first `InvokeModel` or `Converse` call starts an AWS Marketplace subscription in the background, which can take up to 15 minutes to finalize.

| Item | Rule |
| --- | --- |
| Invoke a model | `bedrock:InvokeModel` (also used by `Converse`) and `bedrock:InvokeModelWithResponseStream` (streaming) on the model or inference profile ARN |
| First use of a third-party model in the account | The identity that triggers it needs `aws-marketplace:Subscribe`, `aws-marketplace:Unsubscribe`, `aws-marketplace:ViewSubscriptions`, and the account a valid payment method; later callers need only invoke permissions |
| Anthropic models older than Claude Opus 4.7 | A one-time first-time use form per account (or once in the organization's management account); until it is `AVAILABLE`, calls return `AccessDeniedException` |
| Prevent use of a model | Deny `bedrock:InvokeModel` (or `bedrock:*`) on its ARN in an SCP or IAM policy; deleting the model agreement alone doesn't block it |
| Cross-Region inference profile | Allow the profile and the destination Regions; an SCP that denies Regions must allow every Region of a geographic profile |
| AWS GovCloud (US) | Model access page still used to enable models |

Prefer roles and SigV4 to call Bedrock. **Amazon Bedrock API keys** exist for tools that need a bearer token (`Authorization: Bearer`, or the `AWS_BEARER_TOKEN_BEDROCK` variable):

| Key | Lifetime | Use |
| --- | --- | --- |
| Short-term | Up to 12 hours or the session duration, in one Region; inherits the generating principal's permissions | Production when a bearer token is required |
| Long-term | Until its expiration date; attached to a dedicated IAM user | Exploration only |

Control them with `iam:CreateServiceSpecificCredential` (with `iam:ServiceSpecificCredentialAgeDays` to cap age) and `bedrock:CallWithBearerToken` (deny it to forbid API keys; `bedrock:bearerTokenType` targets one type). Agents hosted on AgentCore are invoked with `bedrock-agentcore:InvokeAgentRuntime`, gateways with `bedrock-agentcore:InvokeGateway`, each scoped to the resource ARN.

> **Exam trap.** "Request model access on the Model access page" is outdated outside GovCloud. If a new model returns `AccessDeniedException`, check missing Marketplace permissions, the Anthropic use case form, an SCP deny, or an IAM condition (`aws:SourceIp` is absent on requests through a VPC endpoint).

<!-- section: ai-data-privacy | objectives: 2.3.2 -->
## Data privacy when sending data to AI services

Amazon Bedrock's data commitments answer "will our prompts train the model?":

| Commitment | Detail |
| --- | --- |
| No training on your data | Inputs and outputs aren't used to train or improve the base models |
| No sharing with model providers | Models run in model deployment accounts owned by the Bedrock service team; providers have no access to prompts, completions or logs |
| Region | Content is stored at rest in the Region of the call; customized models stay in that Region |
| Encryption | Always in transit (TLS 1.2 required) and at rest; customer managed KMS keys optional for resources such as custom models |

**Private connectivity** uses interface VPC endpoints (AWS PrivateLink), so instances without public IPs, NAT or internet gateway reach Bedrock:

| Endpoint service `com.amazonaws.<region>.*` | API |
| --- | --- |
| `bedrock-runtime` | `InvokeModel`, `Converse`, `ApplyGuardrail` |
| `bedrock` | Control plane (create guardrails, list models) |
| `bedrock-agent-runtime`, `bedrock-agent` | Knowledge base and agent APIs |
| `bedrock-mantle` | OpenAI-compatible endpoint |

With private DNS enabled, the SDK keeps its default endpoint name and needs no code change. An **endpoint policy** limits what passes through the endpoint (a model ARN, an action), and an IAM policy with `aws:SourceVpce` or `aws:SourceVpc` makes Bedrock usable only through the endpoint:

```json
{
  "Effect": "Deny",
  "Action": "bedrock:*",
  "Resource": "*",
  "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f67890" } }
}
```

**Data residency**: a geographic cross-Region inference profile (for example, US or EU) keeps processing inside its geography; a global profile can route to any supported commercial Region. Traffic between Regions stays on the AWS network, encrypted. CloudTrail records the call in the source Region, with the processing Region in `additionalEventData.inferenceRegion`.

> **Exam trap.** "EU customer data must be processed only in the EU" rules out a global inference profile: use an in-Region model ID or an EU geographic profile, and allow its Regions in the SCP.

<!-- section: ai-input-output-filtering | objectives: 2.3.3 -->
## Filtering model inputs and outputs

**Amazon Bedrock Guardrails** evaluates prompts and responses with configurable policies:

| Policy | What it does | Actions |
| --- | --- | --- |
| Content filters | Hate, insults, sexual, violence, misconduct, with strength `NONE`, `LOW`, `MEDIUM`, `HIGH` per category, for input and output | Block, or detect only |
| Prompt attack (content filter category, input only) | Jailbreaks, prompt injection, and prompt leakage (Standard tier) | Block, or detect only |
| Denied topics | Topics defined in natural language that the application must not discuss | Block |
| Word filters | Exact words and phrases, managed profanity list | Block |
| Sensitive information filters | PII types (`EMAIL`, `NAME`, `US_SOCIAL_SECURITY_NUMBER`, `AWS_SECRET_KEY`...) and custom regex, with separate input and output actions | `BLOCK`, `ANONYMIZE` (mask as `{EMAIL}`), `NONE` (detect) |
| Contextual grounding check | Responses not grounded in the source or irrelevant to the query | Block or flag |
| Automated Reasoning checks | Responses checked against logical rules you define | Validate |

Apply a guardrail in three ways:

| Method | When |
| --- | --- |
| `guardrailConfig` in `Converse` (`guardrailIdentifier`, `guardrailVersion`, `trace`), or headers on `InvokeModel` | Every model call; check `stopReason` equal to `guardrail_intervened` |
| `ApplyGuardrail` with `source` `INPUT` or `OUTPUT` | Check text without invoking a Bedrock model: another model, retrieved documents, tool results |
| Enforced by IAM: deny `bedrock:InvokeModel` unless `bedrock:GuardrailIdentifier` equals the approved guardrail ARN | Developers can't skip the guardrail |

**Input tagging** is required for prompt attack detection: wrap user input in `guardContent` (Converse) or `amazon-bedrock-guardrails-guardContent_xyz` tags (InvokeModel) so the developer's system prompt isn't flagged. Without tags, prompt attacks aren't filtered.

```python
# Python (boto3): check a tool result before giving it back to the model
check = runtime.apply_guardrail(
    guardrailIdentifier="gr-support", guardrailVersion="3",
    source="INPUT", content=[{"text": {"text": tool_output}}])
if check["action"] == "GUARDRAIL_INTERVENED":
    tool_output = check["outputs"][0]["text"]
```

> **Exam trap.** Guardrails don't evaluate tool definitions or tool results (`toolResult`), and sensitive information filters don't scan `toolUse` input. Indirect prompt injection through a web page or a document returned by a tool needs an explicit `ApplyGuardrail` call on that content, plus least privilege on the tools.

<!-- section: ai-agent-security | objectives: 2.3.4 -->
## Securing AI agent interactions

**Amazon Bedrock AgentCore** hosts and governs agents built with any framework. Its security controls:

| Risk | Control |
| --- | --- |
| One user's data leaks into another user's conversation | AgentCore Runtime runs each session in a dedicated microVM (isolated CPU, memory, file system), terminated and sanitized when the session ends; use a unique `runtimeSessionId` of at least 33 characters per user or conversation |
| Anyone can call the agent's tools | AgentCore Gateway inbound authorization: JWT (Cognito or another OIDC IdP) or IAM SigV4 with `bedrock-agentcore:InvokeGateway`; avoid `NONE` and `AUTHENTICATE_ONLY` in production |
| The agent calls a tool or passes parameters it shouldn't | Policy in AgentCore: deterministic rules in Cedar (or written in natural language and converted) in a policy engine attached to the gateway, evaluated on every tool call outside the agent's code |
| Credentials for third-party APIs in agent code | AgentCore Identity: workload identities, credential providers (OAuth, API keys) and user consent, instead of hard-coded secrets; on-behalf-of token exchange rather than token passthrough |
| An agent role that can do everything | One least-privilege execution role per agent or tool; session context keys (`aws:AgentCoreRuntimeSourceSid`) scope permissions to a session |

AgentCore doesn't map sessions to users for you: the backend must track which session IDs belong to which user. A session goes idle after 15 minutes without activity by default and lasts at most 8 hours by default; data that must persist goes to AgentCore Memory.

**Human-in-the-loop** approval for sensitive actions (refunds, deletions, payments):

| Pattern | How |
| --- | --- |
| Pause a workflow until a person approves | Step Functions `.waitForTaskToken` task (Standard workflows only): send `$$.Task.Token` to the approver (email link, queue, ticket), resume with `SendTaskSuccess` or `SendTaskFailure`; set `HeartbeatSeconds` or a timeout |
| Require a prior approval before a tool call | A Policy in AgentCore rule that denies the tool unless the session shows the approval |
| Confirm in the application | The tool returns a pending action to the user interface; the action runs only after an explicit confirmation |

> **Exam trap.** Amazon Bedrock Agents is now Bedrock Agents Classic, closed to new customers since July 30, 2026 (its return of control and user confirmation features remain for existing customers only). For a new agent, the answer is AgentCore; `.waitForTaskToken` doesn't exist in Express workflows.

<!-- section: ai-log-protection | objectives: 2.3.5 -->
## Protecting sensitive content in logs

**Model invocation logging** is disabled by default. Once enabled for the Region, it records full requests, responses and metadata of `InvokeModel`, `Converse` and their streaming versions on the `bedrock-runtime` endpoint, to CloudWatch Logs, S3 or both, in the same account and Region. Bodies over 100 KB and binary data go to S3 only. Calls on `bedrock-mantle` aren't logged.

Because these logs contain prompts and responses, protect them like the data itself:

| Control | How |
| --- | --- |
| Mask PII and secrets in the log group | CloudWatch Logs data protection policy; only principals with `logs:Unmask` see the values |
| Restrict readers | IAM on `logs:GetLogEvents`, `logs:StartQuery`, `s3:GetObject`; a separate log account or bucket |
| Encrypt with your key | KMS key on the log group; SSE-KMS on the bucket, whose key policy lets `bedrock.amazonaws.com` call `kms:GenerateDataKey` |
| Limit retention | Log group retention setting, S3 Lifecycle expiration |
| Log only what's needed | Choose the modalities (text, image, embedding, video); keep PII out of `requestMetadata` and of application log statements |

Application logs need the same care: log request IDs, token counts and guardrail actions, not raw prompts, and let a data protection policy catch what slips through. Traces from AgentCore Observability (OpenTelemetry) can also carry prompt content.

> **Exam trap.** A guardrail that masks PII changes what the model receives and returns, but model invocation logs still store the original request. Add a CloudWatch Logs data protection policy (or turn invocation logging off) to keep PII out of logs.

<!-- section: key-points -->
## Key points

- Bedrock serverless models are enabled on first invocation; Marketplace permissions for the first call, Anthropic first-time use form for older Claude models; block with an SCP or IAM deny.
- Prefer IAM roles; short-term Bedrock API keys for bearer tokens, long-term keys for exploration only; deny `bedrock:CallWithBearerToken` to forbid them.
- Bedrock doesn't train on or share prompts; PrivateLink endpoints (`bedrock-runtime`) with endpoint policies and `aws:SourceVpce`.
- Geographic inference profiles keep processing in a geography; global profiles don't.
- Guardrails: content filters, prompt attack (needs input tags), denied topics, word filters, PII block or mask, grounding; enforce with `bedrock:GuardrailIdentifier`; `ApplyGuardrail` for tool results and other models.
- AgentCore Runtime isolates sessions in microVMs; Gateway authenticates callers; Policy authorizes each tool call; Identity holds third-party credentials.
- Human approval: Step Functions `.waitForTaskToken` (Standard), AgentCore policies, application confirmation; Bedrock Agents Classic is closed to new customers.
- Invocation logging is off by default and stores raw prompts: mask with CloudWatch Logs data protection, encrypt with KMS, restrict and expire.
