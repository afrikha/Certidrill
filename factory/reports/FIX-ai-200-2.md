# FIX-ai-200-2 — chapters 31, 32, 41 and 42 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-200 31-messaging-events 32-functions 41-secrets-configuration 42-observability` 0 problems; `content:validate --cert ai-200` 0 problems, 0 warnings; `check-quiz ai-200 31-messaging-events 32-functions 41-secrets-configuration 42-observability` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. The only code change is one comment in 31 (role name), made the same way in both languages.

## 31-messaging-events

| Finding | Learn | Change |
| --- | --- | --- |
| Role name "Event Grid Data Sender" | Confirmed wrong: the role table on event-grid/security-authorization says `EventGrid Data Sender` (the prose on that page also uses other spellings; the table is followed) | Code comment, publisher table and Key points: `EventGrid Data Sender` (the bank already used it) |
| 401 contradiction on the delivery page | Not a contradiction: the "not retried" table lists 401 for webhooks only, and the status-code table says 401 from an Azure resource endpoint is retried after 5 minutes or more (delivery-and-retry) | Retries paragraph: the Azure-resource 401 case in parentheses |
| Dead-letter timing (optional) | Confirmed: 5 minutes after the last attempt; dropped if the dead-letter location is unavailable for 4 hours | One sentence in the retries paragraph |
| `HeaderSizeExceeded` missing | Confirmed (service-bus-dead-letter-queues) | New row in the reason table |
| Deferred messages that expire | Confirmed: not moved to the DLQ, by design | One sentence after the reason table |
| "Sessions and duplicate detection are chosen when the queue or subscription is created" | Partly wrong. Sessions: queue or subscription, only at creation (enable-message-sessions). Duplicate detection: queue or **topic**, only at creation; the window (10 minutes by default, 20 seconds to 7 days) can be changed later (enable-duplicate-detection, duplicate-detection) | Sentence rewritten |
| TTL checked only at the next attempt; duplicates within 3 minutes; delayed delivery to failing endpoints | Not needed (QZ report: none required) | None |

## 32-functions

| Finding | Learn | Change |
| --- | --- | --- |
| Python versions on Flex Consumption | Confirmed: 3.10 to 3.15 (flex-consumption-plan) | "Python 3.10 and later" became "Python 3.10 to 3.15" |
| Flex limitations missing | Confirmed: initialization times out after 30 seconds and can't be configured; `WEBSITE_TIME_ZONE`/`TZ` not supported; no in-place migration to or from Flex; 250 cores (512,000 MB) per subscription and region by default, always-ready instances count (flex-consumption-plan) | One sentence in the Flex specifics paragraph |
| Per-function always-ready setting | Confirmed: groups `http`, `durable`, `blob`, or `function:<FUNCTION_NAME>=n`; `--always-ready-instances` at creation, `az functionapp scale config always-ready set --settings` later (flex-consumption-how-to) | New short paragraph after the Flex specifics. The code block is unchanged |
| "Learn suggests Data Owner for accurate scaling" | Confirmed (functions-bindings-service-bus-trigger, Scaling permissions): Azure Service Bus Data Owner or a custom role with `Microsoft.ServiceBus/namespaces/*/read`; without it the extension silently falls back to less accurate peek-based estimation. The manage-connections page has no Service Bus role table | Parenthesis in the configuration section made precise |
| Default authorization level | No contradiction (QZ report) | None |

## 41-secrets-configuration

| Finding | Learn | Change |
| --- | --- | --- |
| Order of the single-credential rotation | Confirmed wrong: the function generates the password, creates the new secret version, then updates SQL Server; between the two steps the secret can't authenticate; Event Grid retries for two hours if a step fails (key-vault/secrets/tutorial-rotation) | Single-credential bullet rewritten |
| Purge protection can't be disabled | Confirmed: "cannot be disabled or overridden by anyone including Microsoft" (key-vault-recovery). The soft-delete page doesn't say it | Purge-protection sentence: "once enabled, it can't be disabled" |
| Key Vault Purge Operator | Learn is inconsistent: the rbac-guide role table says "Allows permanent deletion of soft-deleted vaults"; soft-delete-overview cites it as an example of a role with the purge permission on secrets, keys and certificates | None (the chapter follows the role table). For a human decision |
| CLI listing default vs provider | Confirmed: `az appconfig kv list` without `--label` lists all labels, `'\0'` is the null label; `--auth-mode` default `key` (CLI reference). The provider's "no `selects` loads only unlabeled key-values" was already in the chapter | One sentence after the CLI paragraph |
| Snapshot selector combined with other selectors | Not documented | None |

## 42-observability

| Finding | Learn | Change |
| --- | --- | --- |
| Histogram for p95 (otel-custom trap) | Confirmed wrong: Azure Monitor flattens a histogram into Min, Max, Average, Sum and Count; "support for percentiles is underway" (opentelemetry-add-modify) | Trap reworded: p95 comes from `percentile(DurationMs, 95)` on `AppRequests`/`AppDependencies` rows |
| `service.namespace` prefix | Not confirmed as a format: Learn says the cloud role name "uses `service.namespace` and `service.name`", falling back to `service.name` (opentelemetry-configuration) | Sentence reworded to Learn's wording, with no format |
| Recommended distro | Confirmed: add-modify says to use the Microsoft OpenTelemetry Distro for .NET, Node.js and Python; no preview label seen | None (the Exam tip already says it) |
| Python sampling options | The configuration page shows only `OTEL_TRACES_SAMPLER`/`_ARG` for Python. The distro readme (v1.8.12) documents `sampling_ratio` and `traces_per_second`, says environment variables take precedence, and gives both "rate-limited, 5 traces per second" as the default sampler and `sampling_ratio` "defaults to 1.0" | None (the chapter matches the readme). Readme inconsistency noted for a human |
| Broken reference `distributed-trace-data` | Not used anywhere in ai-200 content | None |

## Mock-exam bank questions changed

None. No question of objectives 3.1.1, 3.1.2, 3.2.1, 3.2.2, 4.1.1, 4.1.2, 4.2.1 or 4.2.2 is contradicted by a verified fact.

## Checked and left unchanged

- Event Grid role: `ai200-3a-eg-publisher-role`, `-eg-publish-cloudevent`, `-eg-topic-schema-cli`, `-eg-setup-order`, `ai200-cs2c-defect-events` already use `EventGrid Data Sender`.
- 401: `ai200-3a-eg-ttl-attempts` and `ai200-3a-eg-delivery-statements` say 400/401/403/413 aren't retried **for webhooks**, which matches Learn.
- DLQ and sessions: `ai200-3a-dlq-reasons` (has `HeaderSizeExceeded`), `ai200-3a-deferred-lines`, `ai200-3a-session-*`, `ai200-3a-dedup-window`, `ai200-3a-duplicate-sends`, `ai200-cs4a-fraud-routing` (option e, wrong anyway, says "enable sessions on fraud-review"; its explanation stays right).
- Functions: `ai200-3b-flex-scale-config`, `-flex-max-instances`, `-flex-limits`, `-plan-migration` (Python 3.10 to 3.15), `-timer-behavior` (`WEBSITE_TIME_ZONE` unsupported), `ai200-cs4b-partner-plan`, `ai200-cs2b-host-storage`, `ai200-3b-order-host-identity`.
- Key Vault: `ai200-4a-soft-delete-facts`, `-purge-reuse`, `-near-expiry-missing`, the rotation questions (`ai200-4a-dual-rotation-steps`, `ai200-cs3a-rotation-trigger`, `ai200-sr1-rotated-key-*`, `ai200-sr2-partner-secret-*`); none relies on the single-credential order.
- Observability: `ai200-4b-metric-instruments`, `-kql-histogram-average`, `-observable-gauge` (no histogram percentile), `-sampler-precedence`, `-distro-options`. `ai200-4b-role-name-options` and `ai200-4b-role-instance` say the role name is `service.name` "prefixed by"/"combined with" `service.namespace`: not contradicted by Learn (which gives no format), so not changed, but now worded differently from the chapter.

## Quiz files

None changed. The four quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- Key Vault Purge Operator: role table (vaults only) vs soft-delete page (example for purging secrets, keys, certificates).
- Python distro readme: two default samplers (rate-limited 5 traces/s vs `sampling_ratio` 1.0).
- Cloud role name format with `service.namespace`: not documented; the bank (`ai200-4b-role-name-options`, `ai200-4b-role-instance`) says "prefixed".
- Chapter 31 EN is about 2,400 words, above the 2,200 guide range (it was already 2,324 before; check-cert doesn't flag it).
- French terms used, not in the glossary: « lettres mortes » / « file d'attente de lettres mortes », « rubrique » (topic), « messages différés », « cœurs » (cores), « centiles » (percentiles), « estimation par lecture (peek) », « étiquette nulle » (null label), « protection contre le vidage » / « vider » (purge).
