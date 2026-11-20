# Q-sap-c03-1b — report

54 questions in `content/sap-c03/questions/architecture/`, prefix `sapc03-1b-`, 6 per objective (1.1.10–1.1.13, 1.2.1–1.2.4, 1.3.1).
Types: 45 single, 9 multi (all choose 2 of 5). Difficulty: 8 easy / 27 medium / 19 hard. Correct single positions: a 11, b 12, c 11, d 11.
Validator: `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-1b-` → 0 problem(s).

## Verified on AWS pages (Nov 2026) and used as deciding facts
- ALB: LCU reservation (min 100 LCU, size from per-minute Sum of PeakLCUs); automatic target weights anomaly mitigation only with weighted random, ≥3 targets, not with Lambda targets; ALB as NLB target (`alb` target group, same VPC/account); endpoint services need NLB or GWLB.
- API Gateway: REST private integrations now use VPC link V2 to ALB or NLB directly; HTTP APIs have no API keys, usage plans, request validation or WAF; WebSocket quotas (2 h, 10 min idle, 128 KB, 32 KB frames); Lambda authorizer only on `$connect`; WebSocket access control lists IAM and Lambda authorizers (no Cognito authorizer).
- CloudFront: Functions vs Lambda@Edge table (10 KB/2 MB vs 50 MB/10,240 MB, 10,000 rps per Region, no body for Functions, geolocation not in L@E viewer events); Functions can now make one network call to an origin of the same distribution (so no question relies on "Functions cannot make network calls"); KeyValueStore needs runtime 2.0; L@E: us-east-1, no env vars/VPC/layers/arm64; origin failover only GET/HEAD/OPTIONS; VPC origins do not support L@E origin triggers; response headers policies.
- SQS fair queues (MessageGroupId on standard queues); SNS FIFO → SQS FIFO or standard, not Lambda/HTTP directly; Kinesis EFO (20 consumers provisioned, ~70 ms).
- Quotas: IAM roles 1,000 default / 10,000 max; Cognito user pools per Region 1,000 / 10,000 max; app client WriteAttributes defaults.
- Bedrock: geographic vs global CRIS and SCP requirements; application inference profiles; IAM principal cost allocation exists since 2026 (Q designed so callers share one role); Guardrails enforcement via Organizations Bedrock policies (management-account guardrail, numeric version, ApplyGuardrail in resource policy); batch inference 50 % cheaper on supported models (pricing page; not cited, BRIEF reference rule); prompt caching (Nova: system/messages); prompt routing Nova Lite/Pro.
- AgentCore: Runtime (microVM per session, 8 h), Gateway (OpenAPI/Smithy/Lambda → MCP, semantic tool search), Identity (USER_FEDERATION, token vault, refresh tokens), Memory, Code Interpreter, Browser, Policy (Cedar, GA March 2026).
- SageMaker AI: options table (25 MB/60 s real-time, 4 MB/60 s serverless, 1 GB/1 h async), serverless exclusions (no GPU, no MME, 50 endpoints/Region, 1–6 GB), scale to zero only with inference components, batch transform InputFilter/JoinSource/OutputFilter, shadow tests and deployment guardrails.
- Knowledge Bases: hybrid search only RDS, OpenSearch Serverless, MongoDB; S3 Vectors (float only, hierarchical chunking not recommended); BDA/FM parsers; GraphRAG S3 only, 1,000 files per data source; metadata filters.
- Networking: DX path selection (longest prefix → local pref communities → AS_PATH); TGW route priority (static > … > DXGW > Connect > VPN), no ECMP across attachment types; SiteLink on private and transit VIFs (FAQ); Cloud WAN DXGW attachment (no static routes to it); BFD async enabled on AWS side; FIS `aws:directconnect:virtual-interface-disconnect`, stop conditions, experiment scheduler.

## Not fully verified (general knowledge, kept because standard)
- WebSocket: authorizer principal ID/context available to later route integrations of the connection.
- OpenSearch Serverless bills compute capacity while idle (used only as a cost argument against it).
- Kinesis records can be delivered more than once (duplicates); EventBridge gives no ordering guarantee.
- Restoration of BGP sessions when an FIS experiment stops (action described as temporary).

## Notes
- No answer depends on Lambda timeout limits, Migration Hub, ADS, Snow Family, OpsWorks or Amazon Q Developer; AppSync avoided (not in the profile's in-scope list).
- Course chapters for these objectives did not exist yet; questions rely on AWS documentation only.
