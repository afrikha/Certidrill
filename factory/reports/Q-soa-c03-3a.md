# Q-soa-c03-3a — QUESTIONS SOA-C03, domain deployment (3.1.1–3.1.3)

- 57 questions, prefix `soac03-3a-`: 19 per objective; single 47, multi 10; difficulty 18 easy / 28 medium / 11 hard. Validator: 0 problem(s).
- Course chapter 31-provisioning did not exist yet: questions written from AWS documentation only (all references fetched 2026-11-20).
- Avoided duplicates of SAA/DVA decisions (change set preview, drift detection, DeletionPolicy alone, termination protection + DeletionPolicy, ECR tag-pattern lifecycle, ECR immutability/replication/scanning, smallest-subnet calculation, secondary CIDR, ROLLBACK_COMPLETE, UPDATE_ROLLBACK_FAILED, preserve resources, CAPABILITY_NAMED_IAM).
- Recent features used (verified on current AWS pages): AMI deregistration protection with cooldown, block public access for AMIs, Allowed AMIs with declarative policies, deregister-image --delete-associated-snapshots, Image Builder lifecycle policies, ECR sinceImagePulled, CloudFormation IaC generator, custom resource ServiceTimeout, `cdk deploy --revert-drift`, `cdk diff --fail`.
- Points to watch in review:
  - `soac03-3a-ts-subnet-free-addresses`: "a subnet's CIDR block cannot be resized" is from the VPC CIDR page wording (VPC blocks) plus common knowledge for subnets; the subnet page does not state it explicitly.
  - `soac03-3a-ts-cfn-signal-endpoint`: that cfn-signal with --stack/--resource calls the CloudFormation API (SignalResource) is not stated verbatim on the fetched pages; the stem gives the log line to the endpoint so the answer does not depend on it.
  - Distractor explanations state that service-linked role permissions cannot be edited (Image Builder SLR) — general IAM rule, not re-fetched.
- Multi stems keep the "NOTE: Each correct selection is worth one point." line, as in the existing SAA/DVA banks.
