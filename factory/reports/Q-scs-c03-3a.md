# Q-scs-c03-3a — report

48 questions in `content/scs-c03/questions/infrastructure/`, prefix `scsc03-3a-`, 8 per objective (3.1.1–3.1.4, 3.2.1–3.2.2).
Types: single 37, multi 7, ordering 2, dragdrop 2 (single is one below the target of 38, multi matches 7). Difficulty: 7 easy / 24 medium / 17 hard.
Validator: `CERT=scs-c03 npx tsx factory/validate.ts --prefix scsc03-3a-` → 0 problem(s).

## Facts not read on a fetched page (general knowledge, judged safe; recheck at review)
- Amazon Data Firehose supports Splunk as a destination (the WAF Firehose page does not say it).
- AWS Config managed rule name `alb-waf-enabled` (distractor only).
- Managed rule group names `AWSManagedRulesAmazonIpReputationList`, `AWSManagedRulesAnonymousIpList`, `AWSManagedRulesACFPRuleSet` (distractors).
- `ec2:Owner` condition key on RunInstances image resources (distractor in allowed-amis-declarative).
- Deprecated AMIs remain launchable by AMI ID (explanation in disable-vulnerable-ami).
- IMDSv2 hop limit 1 blocks non-host-network pods from IMDS (EKS best practice; the Pod Identity page only says "restrict IMDS access").
- KMS actions listed for cross-account EBS use of a shared AMI key (share-encrypted-ami-ou) and `aws:PrincipalOrgPaths` in a key policy.
- Security Lake query subscriber: the RAM / resource-link mechanics are deliberately not stated.

## Notes
- AWS WAF docs now say "protection pack (web ACL)"; questions keep "web ACL" (reference titles copied as the pages show them).
- The WAF docs say the Anti-DDoS managed rule group (AWSManagedRulesAntiDDoSRuleSet) becomes the default from March 26, 2026, superseding Shield Advanced L7 automatic mitigation; scsc03-3a-anti-ddos-amr uses it and no question makes legacy L7AM the answer.
- Lambda page titles now read "Event Function(s)" (copied as fetched).
- Topics also in sap-c03 (Shield proactive engagement, CloudFront VPC origins, Security Lake custom source, Pod Identity cross-account, PassRole for ECS) were tested from different angles (SRT access, custom header + prefix list, custom-source step order, IMDS isolation, PassedToService for EC2).
