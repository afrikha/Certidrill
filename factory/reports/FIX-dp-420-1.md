# FIX-dp-420-1 — chapters 11 to 15 and 21 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-420 11-resource-models-sdk 12-database-operations 13-data-models-partitioning 14-change-feed 15-ai-assisted-tools 21-security-controls` 0 problems; `content:validate --cert dp-420` 0 problems, 0 warnings; `check-quiz dp-420` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers are untouched.

## 11-resource-models-sdk

| Finding | Learn | Change |
| --- | --- | --- |
| A client or request can "never strengthen" consistency | Partly wrong. how-to-manage-consistency: the `ConsistencyLevel` override can only relax. `ReadConsistencyStrategy` (preview, .NET SDK 3.46+, Java SDK 4.69+, Direct mode only, not Gateway) can set a stronger read per request | consistency paragraph: the rule is now tied to `ConsistencyLevel`, plus the preview exception. Key points bullet updated |
| Newtonsoft.Json "13.0.3 or later" | Confirmed with a nuance (performance-tips-dotnet-sdk-v3): 13.0.3+ minimum for SDK 3.47.0+, 13.0.4 minimum for SDK 3.54.0+. Still required with `UseSystemTextJsonSerializerWithOptions` | SDK paragraph: "(13.0.4 or later with SDK 3.54.0+)" |
| R RU/s "available, and billed" in each region | The reporter found that choose-offer says to multiply cost by regions; request-units says "available" only | None (I didn't re-fetch either page) |
| Shared database throughput (from the ch13 report, also in ch11) | Confirmed (set-throughput): "not recommended for most workloads" | throughput section: short caveat added |

## 12-database-operations

| Finding | Learn | Change |
| --- | --- | --- |
| An item `ttl` of `null` inherits the container default | **Not confirmed.** Both time-to-live pages (azure/cosmos-db, updated 2026-04-27, and cosmos-db, updated 2025-11-10) say "Setting TTL to null on an item isn't supported" and say to omit the property instead. The example tables never have `null` as an item value | None. `dp420-1b-ttl-yesno` s1 is still correct |
| URL moves | The `/azure/cosmos-db/` URLs still resolve | None |

## 13-data-models-partitioning

| Finding | Learn | Change |
| --- | --- | --- |
| Global secondary indexes missing | The global-secondary-indexes page (updated 2026-06-02) has no preview label; a devblog of 2026-06-02 announces GA. Facts: read-only container with its own partition key, synced through the change feed, eventually consistent, autoscale only, replace and delete on the source cost 50–100 % extra. Partitioning page: GSIs can replace a partition key change, and serve several query patterns | Technique row (materialized view or GSI); "Changing the key later" paragraph: new sentence; cross-partition anti-pattern row; Key points |
| Multi-tenant table: container per tenant offered for performance isolation | Confirmed (Architecture Center, updated 2026-10-22): container per tenant and database per tenant are "not recommended". Partition key per tenant and account per tenant are recommended. Hierarchical keys are for many tenants (hundreds or more) with similar usage, read-heavy. For write-optimized workloads or low cardinality, use a synthetic key or `/id`. Isolate a few very large tenants in their own accounts | "Fits" column of 4 rows; new sentence after the table |
| Shared throughput can't be converted | Confirmed (set-throughput): no conversion either way, move the data (container copy jobs) | Anti-pattern row: fix is now a new container plus a data move |
| Hierarchical keys: low cardinality, splits | Confirmed (hierarchical-partition-keys): at least thousands of first-level values; a split takes 4–6 hours; with low first-level cardinality and a key already at 20 GB, use a synthetic key instead | Design rules sentence |
| Cost Estimator is preview | Confirmed (estimate-ru-with-capacity-planner, 2026-07-21: "in public preview"). The chapter already says so | None in the chapter; bank question rewritten (below) |

## 14-change-feed

| Finding | Learn | Change |
| --- | --- | --- |
| Latest version can drop changes with multiple write regions | Confirmed (change-feed, "Work with the Change Feed", 2026-05-18) | multi-region paragraph: new sentence |
| First-ever delegate failure isn't retried from a lease | Confirmed (change-feed-processor, 2026-05-18) | Delivery guarantee paragraph: new sentence |
| TTL deletes in all versions and deletes appear only when purged | **Not confirmed.** I couldn't find the sentence: change-feed-modes (2026-06-02) and change-feed don't say when TTL deletes appear. The cosmos-db/change-feed-modes URL failed to load | None |
| Python all versions and deletes needs 4.9.1b1 (a beta) | **Not confirmed.** change-feed-pull-model and change-feed give no Python version, and change-feed-modes gives no SDK versions | None (the chapter keeps "4.9.1b1 or later"). See human decisions |
| Change feed processor with all versions and deletes is preview | Learn pages disagree: change-feed-processor (2026-05-18) says "in preview … starting with version 3.60.0". change-feed-modes (2026-06-02, more recent) and change-feed-pull-model have no preview label. A devblog of 2026-06-02 announces GA, processor included | None. Flagged for a human decision |
| Container copy jobs are preview | Confirmed (how-to-container-copy, 2026-08-26, H1 "(Preview)"). The chapter already says so. Objective 1.4.5 names the feature | None. Bank questions kept (see below) |
| Cross-account copy relies on an unfetched page | Confirmed (how-to-container-copy): source identity set as default identity; role `00000000-0000-0000-0000-000000000002` created on the **destination** account at scope `/` | None. `dp420-1e-copy-cross-account` is correct |

## 15-ai-assisted-tools

| Finding | Learn | Change |
| --- | --- | --- |
| MCP Toolkit "read-only" | Ambiguous: model-context-protocol-toolkit (2026-06-02) says "Full CRUD operations" under Capabilities and "Read-only operations" under Considerations. All 7 tools only read, and the identity gets Data Reader. No preview/GA label | None (the chapter says read-only, which matches the tools). Flagged |
| Install table: Codex command, Grok Build, Kimi Code CLI | Confirmed (agent-kit/setup, 2026-10-29) | Codex row: exact command. Two new rows: Grok Build, Kimi Code CLI |
| "The repository ranks data modeling and partition key design as most critical" | Not on Learn (the reporter says the GitHub README shows it). The sentence names the repository as its source | None. Flagged |

## 21-security-controls

| Finding | Learn | Change |
| --- | --- | --- |
| Safe key rotation should say "(preview)" | **Not confirmed on Learn.** how-to-rotate-keys (2026-10-20) has no preview label. "Preview" appears only in the capability name `EnableKeyCheckBeforeRegenerationPreview`, which the chapter already shows | None |
| CosmosBackupOperator "change backup retention" | Learn pages differ. The built-in roles page lists only `backup/action` and `restore/action` ("submit restore request"). periodic-backup-restore-introduction (more specific) says CosmosBackupOperator, Owner or Contributor "are allowed to request a restore or change the retention period" | None (the chapter follows the specific page) |
| DocumentDB Account Contributor | Confirmed (built-in roles, databases): `databaseAccounts/*` with no NotActions | Table row: it can also list and regenerate keys and write data plane role definitions and assignments |
| Separate identities: cite the page | Confirmed (security, "Secure your account") | Link added to the sentence (EN `/en-us/`, FR `/fr-fr/`) |
| TLS: "Enforce TLS 1.3" | The security page recommends TLS 1.3. self-serve-minimum-tls-enforcement: `minimalTlsVersion` accepts only `Tls12`, TLS 1.2 is the service-wide minimum since 2025-08-31, and TLS 1.3 has been supported since 2025-03-31. TLS 1.3 can't be enforced through the setting | Transport sentence: `Tls12` only, the 2025-08-31 minimum, TLS 1.3 supported |
| Network security perimeter status | how-to-configure-nsp: "Network Security Perimeter is in public preview" | Table row: "(preview)" |
| FR « appairés » | Guide: « peering » | « réseaux connectés par peering » (2 places) |

## Mock-exam bank questions changed

- `questions/develop/dp420-1d-cost-estimator-tool.yaml` (1.3.8, single, difficulty 1): **rewritten.** The old correct answer was the Azure Cosmos DB Cost Estimator, which is in public preview, and objective 1.3.8 doesn't name it. The new question covers a steady 40,000 RU/s load for three years. Answer: standard throughput with a three-year reserved capacity purchase (reserved-capacity page, no preview label). Distractors: autoscale (1.5× rate), serverless (pay per RU, no reservations), and free tier (1,000 RU/s only). Same id, type, objective and difficulty. The new references are reserved-capacity and plan-manage-costs, both fetched. The id still says "cost-estimator-tool", because ids can't change.
- `questions/develop/dp420-1d-model-statements.yaml` (1.4.2): s2 (EN + FR) now says "on a batch after earlier batches were checkpointed". The explanation now gives the first-ever-execution exception (change-feed-processor). The answer is still Yes.

## Checked and left unchanged

- Consistency: `dp420-1a-cons-multiwrite-strong`, `-cons-session-token`, `-sdk-python-client`, `-sdk-python-region` and quiz 11 q10 talk about `ConsistencyLevel`, which can still only relax. None offers `ReadConsistencyStrategy`. The Python SDK doesn't have it.
- TTL: `dp420-1b-ttl-yesno` (null unsupported, confirmed).
- Partitioning: `dp420-1c-tenant-isolation-model` (account per tenant, still recommended), `dp420-1d-tenant-20gb` (6,000 tenants, so the hierarchical key is right), `dp420-sr1-tenant-activity-*`, `dp420-1d-capacity-mode-map` (it already says shared throughput is not recommended). No bank question on 1.3.x or 1.4.x has a materialized view as its only answer where a GSI would also be valid.
- Copy jobs: `dp420-1e-copy-change-pk`, `-copy-hpk-limit`, `-copy-cross-account`, `-copy-cli-create` and the other `dp420-1e-copy-*` questions. These are preview, but objective 1.4.5 names the feature ("Implement copy container jobs"), so they're kept. Flagged below.
- All versions and deletes with the processor: `dp420-cs1a-catalog-sync-feed` and `dp420-cs4b-hold-expiry` (correct option `GetChangeFeedProcessorBuilderWithAllVersionsAndDeletes`). Kept, because the Learn status is ambiguous and objective 1.4.4 names the mode. `dp420-1d-avad-python` is also kept: its stem says the installed SDK supports the mode.
- Roles: `dp420-2a-authz-roles-match`, `-authz-operator-role`, `dp420-cs3b-data-rbac`, `dp420-cs1a-checkout-access`, `dp420-cs4a-masking-roles`, `dp420-1a-sdk-managed-identity`. Each explanation of DocumentDB Account Contributor is correct in its scenario (Entra data access or keys disabled).
- Network: `dp420-2a-net-feature-match` (NSP is not an option) and `dp420-2a-net-portal-access` ("TLS 1.2 is already the minimum for every account" matches the TLS page).

## Quiz files

None changed. The six quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- **Change feed processor + all versions and deletes: preview or GA?** change-feed-processor (2026-05-18) says preview. change-feed-modes (2026-06-02) has no label, and the GA devblog (2026-06-02) includes the processor. The chapter has no preview mention, and `dp420-cs1a-catalog-sync-feed` and `dp420-cs4b-hold-expiry` use the processor builder as their answer. The objective names the mode.
- **Python all versions and deletes version (4.9.1b1, beta).** I didn't find it on any fetched Learn page. Confirm the source or remove the version from chapter 14. `dp420-1d-avad-python` doesn't depend on it.
- **Container copy jobs are preview, but objective 1.4.5 names them.** Several bank questions make a copy job the correct answer (`dp420-1e-copy-*`). Kept as the rules allow.
- **Functions trigger with all versions and deletes.** The chapter says ".NET isolated worker model only". The GA devblog says isolated and in-process. Not re-checked on the Learn Functions trigger page.
- **MCP Toolkit operations.** Learn says both "Full CRUD" and "Read-only". The chapter says read-only.
- **"The repository ranks … most critical"** (ch15): the source is the GitHub README, not Learn.
- **Safe key rotation status**: a devblog says preview; Learn has no label apart from the capability name.
- **Python `ReadConsistencyStrategy`**: Learn shows it only for .NET and Java. The chapter names only those two.

## French terms not settled (not in the glossary)

- « index secondaire global » (global secondary index, GSI): ch13, my own term, not checked on fr-fr Learn.
- « Centre des architectures » (Azure Architecture Center): ch13.
- « pool de débit d'une flotte » (fleet throughput pool): ch13, follows chapter 24's « pool de débit ».
- « abandonner une modification » (latest version "drops" a change): ch14.
- « préversion » is in the glossary (preview) and is used as is.
