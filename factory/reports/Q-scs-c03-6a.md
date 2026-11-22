# Q-scs-c03-6a — report

48 questions in `content/scs-c03/questions/governance/` (prefix `scsc03-6a-`), 8 per objective 6.1.1–6.1.5 and 6.2.1.
Types: single 37, multi 7, ordering 2, dragdrop 2. Difficulty: 8 easy, 23 medium, 17 hard. Validator: 0 problem(s).

## Notes and deviations

- One stem (`scsc03-6a-root-assumeroot-endpoint`) shows an AWS CLI command in a `bash` fence; the other code is in `json` fences.
- Landing zone 4.0: `governance-drift.html` and `key-changes-lz-v4.html` say drift notifications go to EventBridge in the management account, but `drift.html` still describes the SNS topic in the audit account. The drift question says "version 4.0" in its stem and cites the 4.0 pages.
- Not checked on an AWS page (general knowledge, used only in distractor explanations): the AWSControlTowerAdmins group gives management-account admin access; IAM Access Analyzer analyzers cannot be shared through AWS RAM; what PowerUserAccess allows.
- Left out on purpose: Security Hub CSPM central configuration (the AWS page now calls it a legacy feature and recommends Security Hub policies, which are not documented well enough yet); Detective delegated administrator details (the pages are incomplete); the `cloudformation:RoleArn` condition key; the AssumeRoot maximum session duration.
- I checked the overlap with sap-c03: the GuardDuty, Control Tower, StackSets and RCP questions there test other decisions (ALL vs NEW, register OUs, parameter overrides, data perimeter).
