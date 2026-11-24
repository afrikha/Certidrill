# QZ-sc-100-42-applications — report

File: `content/sc-100/quizzes/42-applications.yaml` (10 questions; `npx tsx factory/check-quiz.ts sc-100 42-applications` → 0 problem(s), 0 warning(s)).

Coverage: 4.2.2 (q1), 4.2.1 (q2), 4.2.3 (q3), 4.2.4 (q4), 4.2.5 (q5, q9), 4.2.8 (q6), 4.2.6 (q7), 4.2.7 (q8, q10). Formats 6–10: single, yesno_statements, dragdrop, multi, dropdown.

The mock bank has ~55 questions on 4.2.x; the quiz tests other decisions: reading data in transit = Information disclosure; foundational CSPM when there's no budget; production fixes fed back to the dev backlog; branch policy "prohibit the most recent pusher"; Entra + CA / DeployIfNotExists / CMK mapping; Front Door (classic) migration to Premium because of managed rules; federated credential subject per branch and CA for workload identities not applied through groups; OWASP findings → APIM controls (tokens, wildcard operations, separate instances/versions, managed identity to back ends); internal App Service app (private endpoint vs VNet integration vs access restrictions); APIM internal mode behind Application Gateway WAF_v2, rate-limit-by-key vs quota-by-key.

## Facts verified on Learn (fetched 2026-11-24)
CSPM plans (foundational free, MCSB, AWS/GCP; Defender CSPM additions); DevOps support matrix; STRIDE definitions (threats page); WAF SE:02 (fixes from production back into the lifecycle); Azure Repos branch policies; CA for workload identities (single-tenant SPs only, Block only, group assignment doesn't enforce, license); workload identity federation (issuer/subject/audience exact, case-sensitive; user-assigned MI or app registration); APIM OWASP mitigations; APIM internal VNet + Application Gateway; Defender for APIs; Front Door WAF tiers; Front Door (classic) migration (retires 2027-03-31, managed rules → Premium, no downgrade, zero downtime, DNS cutover by 2028-03-31); App Service networking features; DeployIfNotExists; Storage CMK.

## Not verified on a fetched page
- STRIDE "property violated" column (Authentication, Integrity...): not on the threats page; standard mapping.
- q2: Defender for Cloud Apps doesn't assess resources against MCSB (knowledge).
- q5/q9: Conditional Access requiring a compliant device for an App Service app with Entra authentication (knowledge; no page fetched).
- q7 s2: GitHub subject format includes the branch (`ref:refs/heads/...`) — the federation page only says the subject must match exactly.
- q4 French: Azure DevOps fr-fr labels of "Prohibit the most recent pusher..." not checked (rendered as « interdit au dernier auteur d'un envoi d'approuver »).

## Chapter 42 vs current Learn
- DevOps security table: agentless code scanning is still **(Preview)** on "Support and prerequisites" (prerequisite for SBOM queries and one of the scanner options); the chapter lists it without a preview mark. SBOM queries exist for Azure DevOps and GitHub only; GitLab findings need GitLab Ultimate. Worth stating.
- WAF table, Application Gateway for Containers: the WAF page shows no GA/preview status, supports only DRS 2.1 (no CRS), Bot Manager 1.0/1.1, Gateway API resources only (no Ingress mention), no HTTP DDoS ruleset. Check its release status before keeping it as a plain recommendation.
- Front Door: the classic migration rules (managed rules force Premium, zero-downtime migration, DNS cutover deadline March 31, 2028) aren't in the chapter; q6 relies on the chapter's "Standard = custom rules only" plus the retirement date. Worth one line.
- Front Door Standard supports rate limit rules (custom); Premium only adds grouping by country/ASN/JA4 (preview). The chapter's Standard row ("custom rules only") is right but could say rate limiting is included.
- Workload identities: CA for workload identities also requires selecting service principals directly (group membership doesn't scope the policy) and targeting All resources; not in the chapter (q7 s3 tests it).
- API section: the internal-mode APIM + Application Gateway WAF_v2 pattern (publish a subset of APIs externally) isn't in the chapter; q10 relies on it. Worth adding to the OWASP/"Security misconfiguration" row or a design rule.
- Secure development: WAF SE:02 doesn't use the term "shift left"; Learn's wording is "integrate fixes from production issues back into the development lifecycle".
