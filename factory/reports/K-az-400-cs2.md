# K-az-400-cs2 — report

3 case studies, 18 questions, prefix `az400-cs2`, validator 0 problems.

- cs2a Trey Research (biopharma, Azure DevOps + Azure SQL + on-premises lab servers): 4.1.6, 3.3.7, 3.4.8, 4.2.3, 2.2.6, 2.1.2.
- cs2b Relecloud (video streaming, GitHub Enterprise Cloud + Azure Container Apps): 4.2.2, 4.1.2, 3.4.1, 4.3.6, 5.2.4, 4.3.4.
- cs2c Fourth Coffee (retail, GitHub repos + Azure Boards/Pipelines/Artifacts + App Service slots + App Configuration): 1.3.5, 3.1.2, 3.4.3, 3.4.6, 3.3.9, 2.1.3.

Types: single 7, dropdown 4 (YAML x3, KQL x1), multi 2, dragdrop 2, yes/no 2, ordering 1. Difficulty: 5 easy, 9 medium, 4 hard.

## Points to review

- Web fetch quota ran out before I could fetch GitHub's OIDC page. The claim in `az400-cs2b-oidc-login` that a job that references an environment gets an `environment:` subject comes from GitHub's documented behavior (Learn's Entra trust page only says the subject must match exactly).
- `SqlAzureDacpacDeployment@1` lists `servicePrincipal` as an AuthenticationType value, but the Learn page doesn't document how it works. The question assumes it uses the service principal of the ARM service connection.
- Stakeholder approvals for YAML environments are not documented, so `az400-cs2a-qa-access` tests only Boards, dashboards and the lack of code access.
- No Microsoft Learn page covers the CodeQL-in-a-container scenario (4.3.5), so I didn't write a question on it.
- The dropdown questions use `language: yaml`, which the validator accepts.
