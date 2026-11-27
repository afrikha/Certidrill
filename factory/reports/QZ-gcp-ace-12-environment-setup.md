# QZ-gcp-ace-12-environment-setup — notes

`content/gcp-ace/quizzes/12-environment-setup.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.6 (q1, q4, q10), 1.1.10 (q2), 1.1.7 (q3, q7), 1.1.11 (q5, q8), 1.1.9 (q6, q9). Positions 6–10: single ×3, multi ×2 (q9, q10).

## Chapter vs current docs (fix in the chapter, not done here)

- **Cloud Quotas gcloud commands**: the gcloud reference documents GA `gcloud quotas info list` and `gcloud quotas preferences create`, alongside alpha and beta variants. But the page "Manage quotas using the gcloud CLI" still tells users to run `gcloud components install beta`, and the local SDK 570 only has `gcloud beta quotas`. The chapter's GA commands match the reference. It could note that `--preferred-value` is the target total value, not an increment, and that `--email`, `--justification` and `--dimensions` are optional.
- **Gemini Cloud Assist setup**: the chapter says "plus `cloudasset.googleapis.com` and the other required APIs". The setup page lists the required APIs as `geminicloudassist.googleapis.com` (which also enables `cloudaicompanion.googleapis.com`), `cloudasset.googleapis.com`, `designcenter.googleapis.com`, `appoptimize.googleapis.com` and `apphub.googleapis.com`. It still states Preview, and its data-location and CMEK warning matches the chapter.
- **Auto mode subnet expansion**: the chapter doesn't say that automatically created subnets can be expanded only up to a /16 prefix, or that an expansion can't be undone ("Quickstart: Create and manage VPC networks"). Worth a line next to `expand-ip-range`.
- **Ops Agent**: the "Ops Agent overview" page doesn't say that the Ops Agent replaces the legacy agents or that those are deprecated. That statement in the chapter is unverified (not used in the quiz). The install page now also lists VM Extension Manager policies and installation during VM creation (VM Manager) as methods.
- **`_Default` buckets of folders and organizations**: confirmed 30 days and not configurable. Logging "Quotas and limits" says to route logs to a project bucket to keep them longer.
- Confirmed as written: `_Required` keeps 400 days and isn't configurable; `_Default` retention is configurable from 1 to 3,650 days in projects; Data Access audit logs are off by default except for some BigQuery services; Monitoring Viewer on the scoping project is enough to read the whole metrics scope, while adding projects needs Monitoring Admin on both projects; Cloud NAT is regional and runs on a Cloud Router; the auto-to-custom conversion is one-way; a VM's static external IP must be in the VM's region; Cloud Asset Inventory history covers 35 days; a feed takes up to 10 minutes to start.

## Doubts / not verified on a fetched page

- q2: the IP addresses page lists global external addresses only for external Application Load Balancers and external proxy Network Load Balancers. It doesn't say in so many words that a VM can't use a global address. The configure page says that a VM's external IP "must live in the same region as the zone of the instance".
- q4: the `_Required` contents in the explanation of option b (Admin Activity, System Event, Access Transparency) come from the chapter. The audit logs page that I fetched confirms Admin Activity and System Event only.
- q8: the explanation says Admin Activity entries record the change "with the principal who made them". That is standard audit-log content (`authenticationInfo`), but the overview I fetched describes what the logs record without listing their fields.
- I couldn't check the service agent's Pub/Sub Publisher requirement for asset feeds on the page I fetched, so the quiz doesn't use it.
- The local SDK has no beta component, and installing it is blocked by the proxy. I checked `gcloud quotas ...` on the online gcloud reference.

## Design notes

- I avoided the decisions of the 40 mock questions on these objectives. The new decisions are: enabling Data Access audit logs; the regional static external IP; quotas being per project; `_Default` retention without locking; Gemini Cloud Assist on a project added to a set-up folder; a regional Cloud NAT; the preferred value as a total; Admin Activity logs beyond the 35-day asset history; auto-to-custom conversion plus subnet expansion; and Monitoring Viewer on the scoping project plus the Ops Agent.
- Gemini Cloud Assist (Preview) is the correct answer only in q5, because objective 1.1.11 names it. The explanation states the Preview stage. No other Preview or deprecated feature is a correct answer.
