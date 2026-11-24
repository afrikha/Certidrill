# QZ-sc-500-43-sentinel-collection — report

File: `content/sc-500/quizzes/43-sentinel-collection.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).

Objectives: 4.2.4 (q1, q10), 4.2.5 (q5, q6), 4.2.6 (q3, q7), 4.2.7 (q4, q9), 4.2.10 (q2, q8). Positions 6–10 formats: yesno_statements, dragdrop, single, single, dropdown.

## Facts I inferred (not stated word for word on Learn)
- q6: port 28330. Learn says messages "arrive on port 514 and forward to port 28330" (connect-cef-syslog-ama). The quiz takes that to mean 28330 is a local port between the daemon and the AMA, so the appliances don't need to reach it.
- q9: Learn says Azure Monitor doesn't update DCRs automatically when a table schema changes (create-custom-table). The quiz goes further: a field missing from the DCR stream declaration never reaches the table, so the fix is to update the declaration. Learn doesn't state the drop behaviour explicitly.
- q10: Contributor can register the `SecurityInsights` resource provider (standard Azure RBAC). I didn't fetch a page for this.

## Chapter `43-sentinel-collection` against current Learn
- Azure Storage Account row: "one policy per service (blob, queue, table, file)". I couldn't verify this. The diagnostic-settings page only says you configure the parent account (Transaction metric) and each child storage-type resource. Not used in the quiz.
- Custom tables: the create-custom-table page now names the third plan **"Auxiliary / Lake"**. The chapter says "Auxiliary".
- Purview Audit retention: audit-search says E5 keeps Microsoft Entra ID, Exchange and SharePoint records for one year. The chapter also lists OneDrive. This is minor; OneDrive is probably covered by SharePoint records.
- The Defender for Cloud connector page title is "Ingest Microsoft Defender for Cloud alerts into Microsoft Sentinel" (title tag) / "...to Microsoft Sentinel" (H1). The quiz uses the H1, as the bank does.
- q10 uses Sentinel in the Azure portal, as the bank does. I didn't check the retirement date of the Azure portal experience.

No mock-exam question found wrong.
