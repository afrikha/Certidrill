Generative and agentic AI applications add three security questions to an architecture: what content may go into and come out of the model, what identity an agent uses when it calls tools and third-party APIs on behalf of a user, and which actions need a human decision before they run. This chapter covers content filtering and compliance controls with Amazon Bedrock Guardrails and their enforcement across accounts, access control for agents with Amazon Bedrock AgentCore Identity and Policy, and human approval workflows with AWS Step Functions.

<!-- section: guardrails | objectives: 2.5.1 -->
## Content filtering and compliance controls for generative AI

A **guardrail** is a Regional, versioned Bedrock resource that evaluates prompts and responses with one or more policies:

| Policy | Detects | Action |
| --- | --- | --- |
| Content filters | Hate, insults, sexual, violence, misconduct, with a strength per category; text and images | Block |
| Prompt attacks (content filter category) | Jailbreaks, prompt injection, prompt leakage (Standard tier) | Block |
| Denied topics | Topics you define in natural language (investment advice, competitors) | Block |
| Word filters | Exact words and phrases, managed profanity list | Block |
| Sensitive information filters | PII types and custom regex entities in inputs and outputs | Block or mask |
| Contextual grounding checks | Responses not grounded in the retrieved source, or irrelevant to the query | Block or flag |
| Automated Reasoning checks | Compliance of responses with rules written as a logical policy | Validation findings |

The Standard tier extends detection to code (comments, identifiers, string literals) and adds prompt leakage detection. Every guardrail needs a message for blocked inputs and outputs.

**Where a guardrail runs**

| Integration | Use |
| --- | --- |
| In the inference call (`InvokeModel`, `Converse` and their streaming forms) | Bedrock evaluates the prompt before the model and the response after it |
| `ApplyGuardrail` API | Evaluate any text without calling a Bedrock model: self-hosted models, SageMaker AI endpoints, third-party models, or intermediate agent steps |
| Knowledge bases and agents | Contextual grounding checks against retrieved passages to reduce hallucinations in RAG answers |

**Making the guardrail mandatory**

| Scope | Mechanism |
| --- | --- |
| One role or application | IAM policy with the `bedrock:GuardrailIdentifier` condition: allow inference only with the approved guardrail version, explicit deny otherwise |
| Every call in one account and Region | Account-level enforced guardrail configuration (`PutEnforcedGuardrailConfiguration`) |
| Every account of an OU or the organization | AWS Organizations Amazon Bedrock policy (`BEDROCK_POLICY`) referencing a numbered guardrail version in the management account, with a resource-based policy on the guardrail granting `bedrock:ApplyGuardrail` to the organization |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInferenceWithoutApprovedGuardrail",
      "Effect": "Deny",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:eu-west-1::foundation-model/*",
      "Condition": {
        "StringNotEquals": {
          "bedrock:GuardrailIdentifier": "arn:aws:bedrock:eu-west-1:111122223333:guardrail/gr-claims-assistant:3"
        }
      }
    }
  ]
}
```

Enforced guardrails at organization, account and request level all apply: the effect is a union in which the most restrictive control wins. Organization policies are configured per Region (one guardrail per Region), can include or exclude models (for example embedding models), and don't support Automated Reasoning policies. Guardrails used by an enforcement can't be deleted by default.

> **Exam trap.** Guardrails are Regional. A company that serves users from two Regions needs a guardrail and an enforcement entry in each Region; a guardrail created in us-east-1 doesn't protect calls made in eu-west-1.

> **Exam tip.** Blocked content is written in plain text to model invocation logs when logging is enabled. A stem that requires "no harmful content stored in logs" must restrict and encrypt the log destination, or exclude those logs, not only add filters.

<!-- section: agent-access | objectives: 2.5.2 -->
## Access controls for generative and agentic AI applications

An agent acts with two identities: the user who asked, and the workload that runs the agent. **AgentCore Identity** gives each agent a workload identity in a directory and manages both directions of authentication.

| Direction | Options | Design choice |
| --- | --- | --- |
| Inbound (who may invoke the agent on AgentCore Runtime or a Gateway) | IAM SigV4 (default), or a JWT authorizer: OIDC discovery URL, allowed audiences, clients, scopes and required custom claims (Cognito, Okta, Microsoft Entra ID or any OIDC provider) | One inbound type per runtime version; JWT when end users sign in to an identity provider, SigV4 for AWS workloads |
| Outbound (what the agent may call) | Credential providers: OAuth 2.0 client credentials (2LO, no user), authorization code with user consent (3LO), API keys | 3LO when the agent reads user-specific data (mail, drive, CRM); 2LO for system-to-system calls |
| Credential storage | Token vault, encrypted with service-managed or customer managed KMS keys, tokens bound to the workload identity and the user ID | No secrets in agent code or environment variables |

With a JWT authorizer, the runtime validates the user's token, exchanges it for a **workload access token** (`GetWorkloadAccessTokenForJWT`) passed to the agent, and the agent then calls `GetResourceOauth2Token`. If no valid token is cached for that user, the user receives an authorization URL, consents at the provider, and later calls reuse the cached token until it expires. A user ID passed in a request header instead of a JWT isn't verified against an authenticated identity, so AWS recommends JWT for production.

**AgentCore Policy** adds deterministic authorization at the Gateway, outside the agent's code, so a manipulated prompt can't talk the agent past it. Policies in Cedar (or written in natural language and converted to Cedar, then checked by automated reasoning for overly permissive or unsatisfiable rules) decide on the principal, the tool, the input parameters and session history, for example "refunds above 500 only for the supervisors group" or "no more than three transfers per session".

| Requirement | Control |
| --- | --- |
| Only approved foundation models may be used in the organization | SCP denying `bedrock:InvokeModel` except on the approved model or inference profile ARNs |
| An agent may only call the tools its role needs, with limits on arguments | AgentCore Gateway with AgentCore Policy |
| The agent reads each user's calendar with that user's permissions | AgentCore Identity 3LO credential provider, token vault per user |
| Fine-grained permissions inside the application (which documents a user can ask about) | Amazon Verified Permissions with Cedar policies, or metadata filters on knowledge base retrieval tied to the caller's attributes |
| The agent's own AWS permissions | Execution role with least privilege, permissions boundary, no long-term keys |

> **Exam trap.** Giving the agent's execution role broad access to every tenant's data and relying on the prompt to "only answer for the current user" isn't an access control. The decision must be enforced outside the model: user-scoped tokens, retrieval filters or policies evaluated at the Gateway.

<!-- section: human-oversight | objectives: 2.5.3 -->
## Human oversight and approval workflows for AI operations

High-impact actions proposed by a model (payments, account changes, production deployments, messages to customers) should pause for a human decision. **AWS Step Functions** implements the pause with the **wait for callback** pattern:

1. A Task state with the `.waitForTaskToken` suffix sends the task token (`$$.Task.Token`) and the proposed action to an approver channel: a Lambda function that notifies a ticketing tool, an SQS queue, or an SNS topic.
2. The workflow waits, without compute charges, until a principal of the same account calls `SendTaskSuccess` (approved, with the decision as output) or `SendTaskFailure` (rejected).
3. The next state executes the action, and a `Catch` sends a rejection or a timeout to a compensation step; the decision, the approver and the time are recorded in the execution history and CloudTrail.

```json
{
  "Comment": "Human approval before an AI agent executes a refund",
  "StartAt": "RequestApproval",
  "States": {
    "RequestApproval": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "notify-approvers",
        "Payload": { "taskToken.$": "$$.Task.Token", "proposal.$": "$.proposal" }
      },
      "TimeoutSeconds": 172800,
      "ResultPath": "$.approval",
      "Catch": [{ "ErrorEquals": ["States.Timeout", "States.TaskFailed"], "Next": "RecordRejection" }],
      "Next": "ApplyRefund"
    },
    "ApplyRefund": { "Type": "Task", "Resource": "arn:aws:states:::lambda:invoke", "Parameters": { "FunctionName": "apply-refund", "Payload.$": "$" }, "End": true },
    "RecordRejection": { "Type": "Pass", "End": true }
  }
}
```

| Design fact | Consequence |
| --- | --- |
| Callback (`.waitForTaskToken`) and `.sync` work only in Standard workflows | Express workflows (5 minutes maximum) can't wait for an approver |
| A callback task can wait until the Standard workflow limit of one year | Set `TimeoutSeconds` (and `HeartbeatSeconds` only if the approval system sends `SendTaskHeartbeat`) so a forgotten approval fails or escalates instead of hanging |
| A retried callback task gets a new token | Approvals sent with the old token fail; the approval tool must use the latest token |
| Tokens are accepted only from principals in the workflow's account | A cross-account approval tool calls through a role in that account |

Other approval points:

| Situation | Mechanism |
| --- | --- |
| A Bedrock agent must ask the end user before running an action group function | User confirmation on the function, or return of control so the application executes the action itself |
| Long-running agent logic in code, with a pause for an external decision | Lambda durable functions: checkpointed steps and waits, an execution can last up to one year, no charge while waiting |
| Tool calls that must never run without approval | AgentCore Policy denying the tool for the agent, so the action can only be executed by the approval workflow |
| Review of model output quality over time | Sampled invocation logs sent to reviewers, guardrail interventions monitored in CloudWatch |

> **Exam tip.** "The agent must wait up to 48 hours for a manager's approval, with the least operational overhead and a full audit trail" is a Standard workflow with `.waitForTaskToken`, a timeout and a rejection path; polling a DynamoDB status table from a scheduled Lambda function is the overhead the qualifier rejects.

<!-- section: key-points -->
## Key points

- Guardrail policies: content filters, prompt attacks, denied topics, word filters, sensitive information (block or mask), contextual grounding, Automated Reasoning.
- `ApplyGuardrail` protects models outside Bedrock and intermediate agent steps.
- Enforce guardrails with the `bedrock:GuardrailIdentifier` condition, account-level enforcement, or Organizations Bedrock policies; all levels apply and the most restrictive wins.
- Guardrails and their enforcement are Regional; reference numbered versions.
- AgentCore Identity: inbound SigV4 or JWT, outbound 2LO, 3LO or API keys, token vault per workload identity and user.
- AgentCore Policy enforces Cedar rules on tool calls at the Gateway, outside the agent's code.
- Human approval: Step Functions Standard with `.waitForTaskToken`, `SendTaskSuccess` or `SendTaskFailure`, timeouts and a rejection path; Express can't wait.
