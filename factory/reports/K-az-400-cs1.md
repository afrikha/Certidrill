# K-az-400-cs1 — report

3 case studies, 18 questions (validator: 0 problem(s)).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| az400-cs1a-consolidated-messenger | Parcel delivery; GitHub Enterprise Cloud + Actions, Azure Container Apps, App Configuration, Application Insights | 4.2.2 dropdown d3, 2.1.2 yesno d2, 3.4.7 single d2, 3.4.1 single d2, 4.3.6 multi d1, 5.2.3 dropdown (KQL) d2 |
| az400-cs1b-humongous-insurance | Insurance; Azure DevOps (Repos, Boards, classic release to YAML), App Service slots + Azure SQL, on-premises service | 3.3.8 dragdrop d1, 3.4.3 ordering d2, 3.3.2 single d2, 4.2.3 dropdown d2, 4.1.6 single d1, 1.2.1 single d1 |
| az400-cs1c-southridge-video | Game studio; GitHub repos built by Azure Pipelines, Azure Boards, Azure Artifacts, Managed DevOps Pools | 2.2.2 dragdrop d2, 2.2.6 ordering d3, 1.3.5 single d1, 3.1.2 multi d3, 3.6.2 dropdown d3, 3.3.3 single d2 |

## Facts not printed on the referenced Learn pages (checked elsewhere or general knowledge)

- GitHub OIDC subject formats (`repo:<org>/<repo>:environment:<name>`, `ref:refs/heads/...`, `pull_request`): the Learn pages say the subject autopopulates but do not print it; formats are GitHub's documented token claims.
- CODEOWNERS behaviour (locations, automatic review request, enforcement only with "Require review from Code Owners", admins exempt unless "Do not allow bypassing the above settings"): verified on docs.github.com; the Learn training units referenced cover it only partially.
- Targeting filter giving a consistent result per user: standard feature management behaviour, not stated on the fetched page.
- Pipeline caching: the NuGet tab of the Learn page could not be read; the Cache@2 key/path in the question follow the generic key format of the page and define NUGET_PACKAGES in the snippet.
- Git submodules (cross-repository sharing) are not covered by the Learn pages referenced in az400-cs1c-repo-scaling.

## Decisions

- No Microsoft Teams question: the Azure Pipelines Teams integration URL now redirects to the Teams connectors page, so its current support status could not be confirmed.
- Container Apps now has a "Deployment labels (preview)" revision mode; it is not offered as an option to avoid a second defensible answer.
- One WebFetch rate-limit pause during the task; no fact was written without a fetch or a stated source above.
