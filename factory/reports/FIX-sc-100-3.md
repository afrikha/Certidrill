# FIX-sc-100-3 — chapters 34, 41, 42 and 43 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-100 34-network-sse 41-microsoft-365 42-applications 43-data` 0 problems; `content:validate --cert sc-100` 0 problems, 0 warnings; `check-quiz sc-100 34-network-sse 41-microsoft-365 42-applications 43-data` 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables and callouts. No code block, section marker or callout count changed. The shared WebFetch budget ran out several times; each fetch was retried after a wait, and every change below rests on a page fetched today.

## 34-network-sse

| Finding | Learn | Change |
| --- | --- | --- |
| TRv2: data plane protection is preview | Confirmed (entra/external-id/tenant-restrictions-v2, 2026-11-04): "Data plane protection (preview)"; authentication plane is GA; UTR gives "data plane protection for Microsoft Graph only". The UTR how-to has no preview label | TRv2 table, UTR row: "(data plane protection is in preview)" |
| Web content filtering: "evaluation stops" vs "most restrictive wins" | Confirmed contradiction: how-to-configure-web-content-filtering (2026-09-16) has both sentences. The baseline tutorial (2026-04-21) says all matching security profiles are processed in priority order and doesn't say whether evaluation stops | None. For a human decision (below) |
| Threat intelligence evaluation order; URL indicators on HTTPS | Confirmed (how-to-configure-threat-intelligence, 2026-04-18): TLS inspection > web content filtering > threat intelligence > file type > DLP > third-party; TLS inspection needed for URL indicators on HTTPS | Capabilities table, threat intelligence row |
| Remote network licensing "(coming soon)" | Confirmed (overview, 2026-04-15): the Internet Access license for remote network internet traffic is "coming soon"; at least 50 combined P1 and Internet Access licenses. But the web content filtering page (2026-09-16) says the baseline profile applies to remote network traffic | None (the 50-license sentence is right). For a human decision |
| Per-app: no overlap between Private Access apps; no nested groups | Confirmed (how-to-configure-per-app-access): segments can't overlap within or between Private Access apps, only with Quick Access; "Nested groups are not supported" | private-access: new two-sentence paragraph after the licensing paragraph |
| Compliant network check is tenant-specific | Confirmed (how-to-compliant-network: "A user from fabrikam.com can't pass contoso.com's compliant network policy"). The page doesn't mention B2B guests | Microsoft traffic table, compliant network row |
| FR « Spokes appairés » | Glossary: « peering de réseaux virtuels », avoid « appairage » | « Spokes connectés directement entre eux par peering » |
| Security profile priorities 100 to 65,000 (not in the QZ report, checked in passing) | The tutorial gives 100 (highest) to 65,000 (lowest) for **policies within a profile**; profiles are processed in priority order; baseline = 65,000 | None |

## 41-microsoft-365

| Finding | Learn | Change |
| --- | --- | --- |
| Defender for Cloud Apps file policies retire | Confirmed (defender-cloud-apps/data-protection-policies): retire January 6, 2027; migrate to Purview DLP or auto-labeling policies | MDCA table, labels/external collaborators row: "File policies with governance actions … retire on January 6, 2027, so new designs use Purview DLP or auto-labeling policies" |
| Copilot Audit "prompts and responses in the unified audit log" | Confirmed inaccurate: audit-copilot (2026-08-26) lists message IDs, IsPrompt, JailbreakDetected, AccessedResources, SensitivityLabelId, no text. edisc-search-copilot-data (2026-06-29): prompts and responses are stored in the user's Exchange Online mailbox | Copilot table, Audit row reworded (record per interaction, not the text). The eDiscovery row was already right |
| DLP Copilot location name | Confirmed (dlp-microsoft365-copilot-location-learn-about, 2026-11-10): "Microsoft Copilot, Copilot Chat, and Copilot Cowork". SIT prompt blocking is preview; web search restriction and label blocking aren't | Copilot table, label row: "DLP policy for the Copilot location (named …)". The SIT row's "(prompt blocking in preview)" stays |
| MDO Plan 1 in E3/G3 | Confirmed (mdo-about, 2026-05-21): "Microsoft 365 E3/G3 and Microsoft 365 Business Premium" | Licensing sentence |
| Defender for Cloud: risk-based Cloud Secure Score | Confirmed (secure-score-security-controls, 2026-06-30): Cloud Secure Score (risk-based) in the Defender portal, classic secure score still in the Azure portal, different models; Azure, AWS, GCP | Score table, Defender for Cloud row |
| "Require approved client app" retirement; Customer Key covers Copilot | Not fetched today; the chapter mentions neither | None |
| Communication Compliance covers Copilot | Consistent (QZ report) | None |

## 42-applications

| Finding | Learn | Change |
| --- | --- | --- |
| Agentless code scanning is preview; SBOM queries; GitLab | Confirmed (defender-for-cloud/devops-support, 2026-09-18): "Agentless code scanning (Preview)"; SBOM query for Azure DevOps and GitHub only, Defender CSPM, after an agentless code scan; GitLab code/IaC/secret/OSS recommendations need GitLab Ultimate | DevOps table: scanner row (preview mark, GitLab Ultimate), Defender CSPM row (SBOM scope) |
| Application Gateway for Containers WAF status | Page (2025-11-10) gives no GA or preview label. DRS 2.1 only (no CRS), Bot Manager 1.0/1.1, Gateway API resources only, no HTTP DDoS ruleset | WAF table, AGC row: features column. Release status for a human decision |
| Front Door (classic) migration rules | Confirmed (frontdoor/tier-migration, 2026-08-27): retires March 31, 2027; zero-downtime migration; a classic WAF policy with managed rules defaults to Premium; no downgrade from Premium; endpoint cutover by March 31, 2028 | Design rules bullet extended |
| Front Door Standard and rate limiting | Confirmed (afds-overview, 2026-10-22): Standard supports only custom rules; rate limiting and geo-filtering are custom-authored rule types; grouping by country/ASN/JA4 (preview) is Premium | WAF table, Standard row: "Custom rules only, which include rate limit and geo-filtering rules" |
| CA for workload identities: direct assignment, All resources | Confirmed (conditional-access/workload-identity, 2026-03-24): a policy assigned to a group containing a service principal isn't enforced; target All resources | Workload ID table, Conditional Access row |
| APIM internal mode behind Application Gateway WAF_v2 | Confirmed (api-management-howto-integrate-internal-vnet-appgateway, 2026-08-25): one instance for internal and external consumers, a subset of APIs external, WAF_v2 | api-security: new paragraph after the object-level authorization sentence |
| "Shift left" isn't Learn's wording in WAF SE:02 | Not refetched. The term isn't wrong, only not Learn's | None |

## 43-data

| Finding | Learn | Change |
| --- | --- | --- |
| Key Vault Premium FIPS level | key-vault/keys/about-keys (2026-07-30), the most specific page: Platform 1 HSM keys FIPS 140-2 Level 2, Platform 2 FIPS 140-3 Level 3, Platform 2 protects all new keys and versions. The TDE CMK page's "FIPS 140-2 Level 2" is the older platform | Key Vault table, Premium row: 140-3 Level 3 for new keys, older versions possibly 140-2 Level 2 |
| Always Encrypted: SGX end of support | Confirmed (always-encrypted-enclaves, 2026-10-01): Intel SGX enclaves end of support October 31, 2027; after that, DC-series databases move to standard-series with VBS enclaves; VBS on non-DC vCore and DTU | Encryption table, Always Encrypted row |
| Infrastructure encryption on an encryption scope | Confirmed (infrastructure-encryption-enable, 2026-10-27): account setting at creation only; on an account without it, a new encryption scope can enable it at scope creation, not changeable later; always Microsoft-managed key | Encryption table, infrastructure encryption row |
| DSPM naming | Confirmed (data-security-posture-management-learn-about): previous versions are now "Data Security Posture Management (classic)" and "DSPM for AI (classic)"; current DSPM covers AI apps and agents, with prompts and responses in activity explorer | AI data table, classification row: "Purview DSPM (AI apps and agents; the earlier product is now DSPM for AI (classic))" |
| Defender for Storage result channels, index tags | Consistent (QZ report) | None |

## Mock-exam bank questions changed

None. No question in objectives 3.4.1-3.4.4, 4.1.1-4.1.5, 4.2.1-4.2.8 or 4.3.1-4.3.7 is contradicted by a verified fact. None has a preview or retired feature as its correct answer.

## Checked and left unchanged

- 3.4.x: `sc100-3c-swg-statements` (SNI without TLS inspection; profiles processed by priority, 100 first, matches the tutorial; P1/P2 plus Internet Access); `sc100-3c-ms-exfil-design` (TRv2 + UTR + Microsoft profile; GPO is a distractor rejected for platform coverage); `sc100-3c-ms-token-replay`, `-ms-cross-tenant`, `-ms-licensing`, `-ms-source-ip`, `-swg-branch-baseline`, `-swg-rollout` (compliant network); `sc100-3c-pa-design-facts`, `-pa-statements`, `-pa-sensitive-app` (nested groups, overlaps).
- 4.1.x: `sc100-4a-mdo-campaign-air`, `-mdo-preset-strict`, `-mdo-mdca-statements` (plan features; none relies on which suites include Plan 1); `sc100-4a-mdca-session-download` (file policy is a distractor, explanation still right); `sc100-4a-copilot-oversight`, `-copilot-privacy-facts` (prompts in mailboxes, audit ≠ text: consistent); `sc100-4a-copilot-dlp-design`, `-copilot-label-dlp`, `-copilot-usage-rights`, `-copilot-hr-site`, `sc100-cs1b-copilot-controls`, `sc100-cs2c-copilot-unreleased` ("Copilot location" stays a valid generic name); `sc100-4a-score-board-kpi`.
- 4.2.x: `sc100-4a-portfolio-cspm-tiers` (the stem says agentless code scanning is enabled, but no statement depends on it); `sc100-4b-devops-statements`, `-devops-posture`, `sc100-4a-portfolio-devops-view` (GitLab); `sc100-4b-fd-standard-rules` (custom rules include rate limit and geo, now in the chapter too); `sc100-4b-ca-workload`, `-workload-risk`.
- 4.3.x: `sc100-4c-double-encryption` (correct: the account has Azure Files, and encryption scopes are Blob only), `-encryption-choices`, `-storage-design`, `-data-in-use`; `sc100-4c-ai-posture`, `-ai-user-context`, `-ai-data-statements` (use "DSPM for AI", see below).

## Quiz files

None changed. The four quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 42 q6 ("Standard supports custom rules only") stays consistent with the Standard row.

## For a human decision

- **Web content filtering precedence** (34): Learn contradicts itself ("evaluation stops" after a matching rule, against "most restrictive action wins" when policies conflict), and the tutorial says every matching profile is processed. The chapter keeps "evaluation stops at the first matching rule". Avoid allow-versus-block priority questions until Learn is consistent.
- **Baseline profile for remote networks vs "coming soon"** (34): the overview still says the Internet Access license for remote network internet traffic is "coming soon", but the web content filtering page applies the baseline profile to remote network traffic. The chapter wasn't changed.
- **Application Gateway for Containers WAF** (42): Learn gives no GA or preview label. The row stays a plain option. Confirm its release status before using it as a correct answer.
- **"DSPM for AI" in bank questions** (43): `sc100-4c-ai-posture`, `-ai-user-context` and `-ai-data-statements` use the name that Learn now labels "(classic)". The facts aren't contradicted, so the questions weren't changed. Naming choice for the owner.
- **Foundry audit wording** (4.3.4, not refetched): `sc100-4c-ai-controls-map` (t3 and explanation) says Purview data security for Foundry "captures prompts and responses in the unified audit log". For Microsoft 365 Copilot, Learn's audit record holds IDs, not text. Check whether the Foundry Purview page says the same before keeping it.
- **Chapter length**: 42 (≈2,500 words) and 43 (≈2,450) are above the 2,200-word guide figure, as they were before (validator doesn't flag it).

## French terms not settled (not in the glossary)

- « bascule » / « passage aux nouveaux points de terminaison » (endpoint cutover); « rétrogradation » (downgrade); « fin de support » (end of support); « niveaux de calcul » (compute tiers); « indicateurs d'URL » (URL indicators); « groupes imbriqués » (nested groups).
- « stratégies de fichiers » and « actions de gouvernance » (Defender for Cloud Apps file policies, governance actions); « Cloud Secure Score fondé sur les risques ».
- Carried over from the QZ report: « réinitialisation sélective » (selective wipe), « profil professionnel sur appareil personnel »; Secure Score still `undecided` in the glossary (the chapter uses « Niveau de sécurité Microsoft (Microsoft Secure Score) »).
- Location name "Microsoft Copilot, Copilot Chat, and Copilot Cowork" kept in English in FR, as a product UI name.
