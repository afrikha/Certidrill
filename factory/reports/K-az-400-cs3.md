# K-az-400-cs3 — report

3 case studies, 18 questions (validator: 0 problem(s)).

- az400-cs3a-wingtip-shipping (port logistics, GitHub Enterprise Cloud + Actions, Azure Container Apps): 6 questions (4.2.2, 4.1.1, 3.4.1, 4.3.2, 5.2.3, 1.3.5).
- az400-cs3b-proseware-games (game studio, Azure DevOps Repos/Pipelines/Artifacts, custom build images): 6 questions (2.1.3, 2.2.4, 3.3.2, 3.1.2, 3.6.4, 4.1.6).
- az400-cs3c-litware-energy (electricity distributor, App Service slots + Azure SQL dacpac, Key Vault variable group): 6 questions (3.4.8, 3.3.9, 3.4.3, 3.4.5, 4.2.1, 5.2.2).

Types: single 7, dropdown 5 (28 %, slightly above the 15–25 % profile range), multi 2, yesno 2, dragdrop 1, ordering 1. Difficulty 4/10/4.

## Points not verified on Learn (kept from general knowledge, low risk)

- System-assigned managed identities cannot carry federated credentials: Learn pages fetched only list app registrations and user-assigned managed identities (explanation worded accordingly).
- In deployment jobs, current-run artifacts download to `$(Pipeline.Workspace)/<artifact>` (used in az400-cs3c-prod-stage template, not tested by a slot).
- Key Vault Reader cannot read secret values (az400-cs3c-keyvault-group s3); RBAC built-in roles page not fetched.
- Git tag/push behaviour (`git push` does not push tags; `--all` pushes branches only) is standard Git, Learn page "Use Git tags" does not show the commands.
- WebFetch hourly limit was hit once; Azure Deployment Environments was dropped for lack of verification.

## Overlap with series

Series az400-sr1-boards-ab / sr2-boards-github (AB# in title vs description), sr2-lfs-assets and sr1-oidc-deploy exist. The cs3 questions test different decisions: repeated `Fixes` keyword for several work items, OIDC subject/permission/input completion, no LFS question.
