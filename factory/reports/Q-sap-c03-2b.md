# Q-sap-c03-2b — report

56 questions in `content/sap-c03/questions/security/` (prefix `sapc03-2b-`), 8 per objective (2.2.2, 2.2.3, 2.2.4, 2.3.1, 2.3.2, 2.3.3, 2.3.4). Types: single 46, multi 10 (one "Choose three"). Difficulty: 8 easy, 28 medium, 20 hard. Validator: 0 problem(s).

## Facts used without a dedicated fetch (believed correct, reviewer may double-check)

- Aurora replicas cannot be created in another account (distractor in `aurora-clone-share-kms`).
- CloudHSM cluster backups are service-managed, not objects in a customer bucket (`cloudhsm-cross-region-dr`, option d).
- Transit gateway route tables and CloudWatch log groups/metrics are not AWS RAM shareable resources (inferred from the "Shareable AWS resources" list; `tgw-ram-org-share`, `ram-external-partner`, `observability-plus-centralization`).
- AWS Config supports a delegated administrator for organization aggregators; Security Lake supports a delegated administrator and several rollup Regions.
- ALB trust stores accept certificate revocation lists (page only says "optionally, with revocation checks").
- A Private CA's key algorithm cannot be changed after creation (`private-ca-mldsa-hierarchy`, option a).
- NLB TLS listeners offer the same PQ security policy family as ALB (stated as a premise in `scp-elb-pq-policy`, not decisive).

## Deviations / notes

- `ct-register-existing-ous`: the Control Tower "Register an existing OU" page says mandatory controls are enabled on registration, but chapter 23 states that since landing zone 4.0 mandatory controls are no longer applied by default. The question was reworded so it does not depend on mandatory controls.
- RCP service list now has 85 services (fetched 2026-11-20); questions rely only on S3, SQS, Secrets Manager, STS, KMS being covered and on IAM, CloudTrail and Elastic Load Balancing not being covered.
- `cloudhsm-quorum-co` references the quorum page whose current title names the CMU tool.
