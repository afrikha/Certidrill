# QZ-sc-500-12-key-vault — notes

`content/sc-500/quizzes/12-key-vault.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.2.1 (q6), 1.2.2 (q3), 1.2.3 (q4, q10), 1.2.4 (q2, q8), 1.2.5 (q1, q7), 1.2.6 (q5), 1.2.7 (q9). Positions 6–10: dropdown, single, multi, ordering, yesno_statements.

## Chapter vs current Learn (fix in the chapter, not done here)

- **FIPS levels** ("About keys"): software-protected keys are FIPS 140-2 Level 1. Premium HSM-protected keys are FIPS 140-2 Level 2 on HSM Platform 1 and FIPS 140-3 Level 3 on HSM Platform 2, which "now protects all new keys and key versions". The chapter says "FIPS 140 Level 1" for Standard. That's imprecise but not wrong. Premium also has oct-HSM (AES) keys, which are **preview** in vaults.
- **Recovering a vault**: the soft-delete page doesn't name Key Vault Contributor. It says the user "who has the privilege to create a key vault under the resource group" can recover it. The built-in role (Microsoft.KeyVault/*, NotActions purge) matches the chapter.
- **"About Azure Key Vault secrets"** still says access control for secrets is "at the level of the key vault". The RBAC guide allows assignments on individual secrets in two documented cases (q4 relies on it). The chapter agrees with the RBAC guide. The two Learn pages disagree.
- **Secrets scanning roles**: the Defender for Cloud page lists Security Reader, Security Admin, Reader, Contributor and Owner as "permissions needed to use secrets scanning", not specifically to view findings. The chapter says "Viewing findings requires...". That's close enough, but slightly stronger than Learn.
- **Defender for Key Vault response**: for an unauthorized application or user, Learn's step 2 tells you to remove the principal from the **access policy** settings. The chapter turns this into "role assignment or access policy". That's reasonable for Azure RBAC vaults, but it isn't the page's wording.
- `--enable-rbac-authorization` defaults to true in the CLI reference ("If null or not specified, the vault is created with the default value of true"). Azure RBAC is the default from API version 2026-02-01. Both match the chapter.

## Not verified on a fetched page

- Key Vault Purge Operator's exact actions (the built-in roles page was cut off before it). The q3 explanation (it purges, doesn't recover) comes from the chapter and from the mock question `sc500-1b-kvs-purge-operator`.
- The firewall limits (200 VNet rules, 1,000 IPv4 rules, 15 minutes) aren't on the service endpoints page. They aren't used in the quiz.
- q2: the trusted services table has no Azure DevOps entry, and the page has no note about it. "Not a trusted service" comes from its absence from the list and from the chapter. In the explanation, the fix (a self-hosted agent in an allowed subnet) is general practice.
- q7: Learn doesn't say whether AutoRenew sends notifications. To avoid depending on this, both CAs in the stem are non-integrated.

## Design notes

- I avoided the decisions of the 49 mock questions on 1.2.x. The new decisions are: get on an expired secret, Azure DevOps outside the trusted services, the recovery role (Key Vault Contributor, not Purge Operator), an assignment scoped to one secret, Security Reader for findings, how many vaults (per application and per environment) and which tier, vault-wide certificate contacts, the private DNS zone and its VNet link, the response order for an unknown IP, and data roles that are ignored under access policies but take effect after the switch.
- q6 uses `shuffle: false` (the vault count is ascending). The correct tier is in a different position across slots.
- 1.2.6 is saturated in the bank: plans, the agentless toggle, DevOps/IaC, recommendation names, the explorer, remediation order and the CMK scanner are all covered. I put it at position 5 (difficulty 2) with a role decision, and kept the hard positions for objectives that still had untested traps.
