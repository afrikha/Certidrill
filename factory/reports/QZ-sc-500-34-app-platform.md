# QZ-sc-500-34-app-platform — report

File: `content/sc-500/quizzes/34-app-platform.yaml` (10 questions, `sc500-qz-34-01` to `-10`). Check: `npx tsx factory/check-quiz.ts sc-500 34-app-platform` → 0 problem(s), 0 warning(s).

Objectives: 3.3.3 (Q1, Q10 yes/no), 3.3.4 (Q2), 3.3.8 (Q3), 3.3.7 (Q4), 3.3.2 (Q5 yes/no), 3.3.5 (Q6), 3.3.6 (Q7 yes/no), 3.3.9 (Q8 multi), 3.3.1 (Q9 drag and drop).

## Chapter issues against current Learn (chapter not edited)

- **APIM table** (3.3.9): "`rate-limit` / `rate-limit-by-key` (not in Consumption)" and "`quota` / `quota-by-key` (not in Consumption)" read as if `rate-limit` isn't in Consumption. Learn: `rate-limit` applies to **all tiers, Consumption included**. `rate-limit-by-key` lists Developer, Basic, Basic v2, Standard, Standard v2, Premium, Premium v2, so not Consumption. Suggested wording: "the `-by-key` variants aren't available in Consumption". I didn't check quota tiers.
- **APIM tiers**: Learn (Upgrade and scale) says you can't upgrade from or downgrade to the Consumption tier. Q8 avoids depending on this: its correct option is "publish through an instance in Standard v2". The chapter could add it.
- **ACR ABAC mode** (3.3.3): the chapter says Owner, Contributor and Reader have no data plane access in ABAC mode. It doesn't say that the legacy **AcrPull, AcrPush and AcrDelete aren't honored** either (Learn ABAC page; Q10 s1 relies on it). It also doesn't say that switching modes invalidates the credentials issued before the switch (HTTP 401). Both are worth adding.
- **ACR roles**: Learn's "Azure Container Registry Microsoft Entra permissions and role assignments overview" now presents Container Registry Repository Reader/Writer/Contributor as the data plane roles, recommending Repository Writer for CI/CD. The chapter still presents AcrPull/AcrPush/AcrDelete as the authorization roles. They're still valid in RBAC-only mode, but the chapter may be falling behind Learn.
- **Front Door**: Front Door (classic) retires on March 31, 2027 (Learn). The chapter doesn't mention it. That's fine for scope, but scenarios should use Standard/Premium.

## Doubts / partly verified facts

- Q7 s2: Learn doesn't say in so many words that the trigger's inbound IP restriction also applies to callers that use OAuth. It describes the restriction as the IP ranges the trigger accepts, with an exception only for the Workflow Triggers - Run operation and API Management. The answer (No) relies on that reading.
- Q7 s3: Learn says `0.0.0.0-0.0.0.0` blocks anyone from inputs and outputs and that only an administrator can remove it. It doesn't name roles. The quiz says a Logic App Contributor can't view them.
- Q2: the Learn ingress page doesn't state whether Container Apps peer-to-peer encryption is GA. A Microsoft message-center relay (non-Learn) reports it as generally available.
- Q3: the managed rules must be enabled manually on the premium WAF policy copy after the upgrade (Learn), and the quiz's explanation says so.
