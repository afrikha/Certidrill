# Q-scs-c03-3b report

47 questions in `content/scs-c03/questions/infrastructure/`, prefix `scsc03-3b-`.

- Objectives: 3.2.3 ×8, 3.2.4 ×8, 3.2.5 ×8, 3.2.6 ×8, 3.2.7 ×8, 3.3.1 ×7.
- Types: single 36, multi 7, ordering 2, dragdrop 2 (the task's mix adds up to 48, so one single was dropped).
- Difficulty: 7 easy, 24 medium, 16 hard.

## Deviations and choices
- 3.2.6: CodeGuru Security and Q Developer appear only as wrong options (closed). The correct answers use Inspector Code Security, the CodePipeline InspectorScan action, the Inspector Jenkins plugin (SBOM Generator + Scan API) and Image Builder Inspector scans.
- 3.2.7: OWASP LLM risks are named without LLM0x numbers, because the 2025 and 2026 editions rank them differently.
- The ordering item for 3.2.4 orders events of an automated Inspector → EventBridge → Automation → Inspector rescan flow, not configuration steps. Configuration steps had no strict order.
- Overlap with SAP-C03 was avoided: different decisions were tested for Inspector Code Security, InspectorScan, guardrail enforcement and PII filters.

## Facts not verified on a fetched page (general AWS knowledge, low risk)
- Enhanced scanning does not support manual StartImageScan scans. This is used in an explanation and is consistent with sapc03-1a-ecr-scan-filters.
- ECR image layers come from Amazon S3, so private Fargate tasks need an S3 endpoint for the GuardDuty agent pull. The GuardDuty page only mentions the S3 prefix list on 443.
- Inspector closes a finding after the rescan that follows remediation.
- Max errors semantics of maintenance window rate controls. The CLI reference page could not be fetched.
- Network Firewall stateless default action "forward to stateful rule groups" is used without the literal enum name.
- Amazon Bedrock `maxTokens` inference parameter and AWS WAF size constraint rule.
- Exact ECR re-scan duration values were not verified and are therefore not given.
