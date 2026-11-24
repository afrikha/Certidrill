# QZ-ai-200-32-functions — report

Quiz: `content/ai-200/quizzes/32-functions.yaml`, 10 questions (`ai200-qz-32-01` to `-10`), checker 0 problem(s), 0 warning(s).

Objectives: 3.2.1 (Q1, Q4, Q5, Q6, Q7, Q10), 3.2.2 (Q2, Q3, Q8, Q9). Positions 6–10: single, single, yesno_statements, multi, dragdrop.

Mock-exam questions of 3.2.1–3.2.2 (71 files, including cs1c, cs2b, cs3c, cs4b, sr1 and sr2) were read first. The quiz tests other decisions: `connection=` takes a setting name (no `%`, no value), which files are required in Azure, Flex instance memory 4,096 MB, `blob_input` with a JSON-property binding expression, Event Grid trigger vs HTTP trigger for the validation handshake, App Service authentication vs function keys, `maxAutoLockRenewalDuration` vs lock duration, timeouts per plan, Flex per-function scaling groups, and the retry mechanism per trigger.

## Chapter out of date or wrong against current Learn (not edited)

1. **Python versions on Flex Consumption.** The chapter says "Python 3.10 and later". The Flex Consumption page I fetched lists Python 3.10, 3.11, 3.12, 3.13, 3.14 and 3.15. That is consistent, but a table of supported versions could be added. Not tested.
2. **Flex Consumption limitations missing from the chapter**: app initialization times out after 30 seconds (not configurable); `WEBSITE_TIME_ZONE`/`TZ` aren't supported; no in-place migration to or from Flex (create a new app and redeploy); the regional quota is 250 cores by default, and always-ready instances count against it. Possibly worth a line. Not tested.
3. **Per-function always-ready setting.** The chapter shows only `--settings http=2`. Learn also documents `durable=`, `blob=` and `function:<FUNCTION_NAME>=n` for individual functions, and `--always-ready-instances` at creation time. Not tested.
4. **"Learn suggests Data Owner for accurate scaling of the Service Bus trigger"** (configuration section): I did not fetch the manage-connections page that has the role table, so this is not verified. Not tested.
5. **Default authorization level.** The HTTP trigger page says only "When a level isn't explicitly set, authorization defaults to the `function` level". It doesn't state a Python v2-specific default for `FunctionApp(http_auth_level=...)`. The chapter's statement matches this general rule. Not tested directly.

## Unverified / doubts

- Q6 (App Service authentication on a **Premium** plan): Securing Azure Functions says App Service authentication with Microsoft Entra ID is the way to authenticate clients, and that keys only make endpoints harder to reach. I chose Premium on purpose: neither the Securing page nor the Flex Consumption page says whether App Service authentication is supported on Flex Consumption.
- Q7: Learn states the defaults (lock renewal 5 min for single-message functions, lock duration 1 min by default and 5 min at most, and that an expired lock makes the message available for redelivery). The exact timing of automatic renewal relative to lock expiry isn't documented. The stem uses the 1-minute default lock so that 8–9 minute executions clearly outlast the renewal window. With a 5-minute lock, the last renewal could carry the lock past 9 minutes.
- Q8 s2: Learn gives 10 minutes as the maximum timeout on Consumption. It doesn't say whether a `functionTimeout` above 10 minutes is rejected or capped, so the statement only says that 15-minute executions can't complete.
- Q4: Learn's Python blob input sample binds the blob to a `str` parameter (it also documents `InputStream`/SDK types). `InputStream` and `bytes` were left out of the options to avoid two valid answers. The JSON-payload binding expression is documented in general terms ("trigger payload is JSON"), with an HTTP example and no Service Bus one.
- Q10: the item "Maximum delivery count of the Service Bus queue" follows the chapter (the runtime abandons on exception, and Service Bus dead-letters after `MaxDeliveryCount`). The error-handling page lists Service Bus retries as "Binding extension, host.json (5.x)" without detail.
- Inconsistency on Learn: the Cosmos DB input binding page shows `collection_name`/`connection_string_setting` in its Python v2 sample but `container_name`/`connection` in the decorator table. That's why the quiz avoids a Cosmos DB input question.
- French: « file d'attente de messages incohérents (poison) » for the poison queue, « nombre maximal de remises » for max delivery count, and « mode peek-lock » kept in English, as in the chapter and the bank.
