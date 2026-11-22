# C-scs-c03-2 — COURSE SCS-C03, chapters 21, 22, 31, 32 (2026-11-22)

## Output
- `content/scs-c03/course/chapters/{21-response-plan,22-security-events,31-edge-security,32-compute-security}.{en,fr}.md`, status draft (course.yaml unchanged).
- 4 chapters x 2 languages; 21 objectives covered (2.1.1-2.1.4, 2.2.1-2.2.5, 3.1.1-3.1.4, 3.2.1-3.2.7).
- `check-cert.ts scs-c03 21-response-plan 22-security-events 31-edge-security 32-compute-security`: course problems (your chapters) 0. Code blocks identical EN/FR (diff checked); French typography checked by script.
- English prose (without code and tables): 1,092 / 1,477 / 1,626 / 1,609 words; with tables 2,080-2,770 (wc), in line with the sap-c03 models.

## Verified on AWS pages (WebFetch, 2026-11-22)
WAF rate-based settings (windows 60/120/300/600 s, default 300, minimum limit 10, aggregation and custom keys incl. JA3/JA4), JA3/JA4 only on CloudFront and ALB with fallback, geo match labels and CloudFront geo restriction behaviour, Anti-DDoS AMR (`AWSManagedRulesAntiDDoSRuleSet`, default for HTTP floods since March 26, 2026), Shield Advanced resources, health-based detection, SRT role (`drt.shield.amazonaws.com`, `AWSShieldDRTAccessPolicy`, no SSE-KMS log buckets), proactive engagement, Marketplace rule groups, Firewall Manager policy types, Security Lake native sources and custom-source rules (OCSF 1.3 or earlier, Parquet, 50 sources), CloudTrail Lake closure (May 31, 2026) and CloudWatch alternative, Incident Manager closure (November 7, 2025), Security Incident Response service, OpsCenter, FIS actions, Resilience Hub, ARC capabilities, forensics orchestrator architecture, SG connection tracking, `AWSRevokeOlderSessions`, Detective, Extended Threat Detection, suppression rules, Security Hub (new), Inspector EC2/ECR/Lambda/code security/SBOM Generator, GuardDuty Runtime Monitoring and Malware Protection (EC2, S3), Session Manager prerequisites, EC2 Instance Connect and Endpoint, IMDS options, Image Builder and STIG components, Allowed AMIs, Patch Manager, Bedrock Guardrails, `bedrock:GuardrailIdentifier`, guardrail enforcements (`BEDROCK_POLICY`), OWASP LLM Top 10 2025, OAC, VPC origins, response headers policies, CloudFront viewer headers, S3 CORS, IoT policies, Object Lock, `aws:Ec2InstanceSourceVpc`.

## Kept from the profile / A-aws-7 (not re-verified here)
- CodeGuru Security discontinued November 20, 2025 (the English doc page fetched still served the old preview text; the end-of-support page exists in other locales).
- Q Developer new sign-ups closed May 15, 2026 (the IDE end-of-support page fetched confirms only April 30, 2027 and Kiro).
- ARC readiness check closed to new customers April 30, 2026.

## General knowledge used, not confirmed on a fetched page (to review)
- One logging destination per web ACL (API array of one item); `aws-waf-logs-` prefix confirmed for S3 only.
- Automation actions `aws:approve`, `aws:createTags` and the YAML runbook shape; `CreateSnapshots` / `ModifyInstanceAttribute Groups` via `aws:executeAwsApi`.
- Snapshots encrypted with the default AWS managed key cannot be shared; GuardDuty severity names; Detective "new geolocation" profile panels.
- ECS/Lambda trust principals and task vs execution role split; `AWS-UpdateLinuxAmi` / `AWS-UpdateWindowsAmi`; Config rule `ec2-managedinstance-patch-compliance-status-check`; `ssm:resourceTag/...` condition and session ARN pattern; AMI block public access; ECR tag immutability and image signing; Shield `DDoSDetected` metric; Admin protection rule group wording.

## Deliberately left out
- `AWSSupport-ContainEC2Instance` runbook (page not retrievable), Shield Advanced "IPv4 only" note, ECR rescan default durations (doc lists 7 days for activations on or after October 15, 2026), Inspector EC2 default scan mode (doc contradicts itself), Firewall Manager third-party firewall policies (not on the page fetched).
