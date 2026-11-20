# Q-saa-c03-1b — report

53 questions in `content/saa-c03/questions/secure/`, prefix `saac03-1b-` (single 44, multi 9; difficulty 16 / 26 / 11). Validator: 0 problem(s).

Per objective: 1.1.9 ×7, 1.1.10 ×7, 1.1.11 ×7, 1.2.1 ×7, 1.2.2 ×7, 1.2.3 ×6, 1.2.4 ×6, 1.2.5 ×6.

## Deviations / decisions
- **No scoring NOTE on multi questions.** The guide's "NOTE: Each correct selection is worth one point." is Microsoft-specific; AWS multiple response is all-or-nothing (blueprint `scoring.multi: all_or_nothing`, SPECS-AWS §3.3), so the stems end with "(Choose two.)" / « (Choisissez deux réponses.) » only. Add the NOTE if the reviewer wants it.
- The course chapters did not exist yet; facts are from the AWS pages listed in each question's references (all fetched on 2026-11-19).
- Security Hub is named **AWS Security Hub CSPM** (current name of the product that runs the FSBP standard checks and aggregates GuardDuty/Inspector/Macie findings, per its user guide). The exam guide still says "AWS Security Hub".
- French: "SCP" / "RCP" kept as acronyms, expanded at first use as « politique de contrôle des services (SCP) » / « politique de contrôle des ressources (RCP) » (BRIEF-AWS: policy → politique; the fr_fr exam guide uses « stratégies »). "VPC peering" → « appairage de VPC »; "user pool" → « groupe d'utilisateurs », "identity pool" → « pool d'identités »; "trail" → « journal de suivi ».

## Points a reviewer may want to check
- `saac03-1b-ecs-secret-injection`: the ECS pages list `secretsmanager:GetSecretValue` for the execution role; `kms:Decrypt` for a customer managed key is stated by ECS only for Parameter Store / private registry secrets, and by Secrets Manager for any principal reading a CMK-encrypted secret.
- `saac03-1b-rcp-data-perimeter`: in a real RCP an exception for AWS service principals (`aws:PrincipalIsAWSService`) is needed; this is said in the explanation, not in the option.
- `saac03-1b-apigw-resource-policy-ip`: AWS WAF with an IP set would also block other sources; it is deliberately not offered as an option.
