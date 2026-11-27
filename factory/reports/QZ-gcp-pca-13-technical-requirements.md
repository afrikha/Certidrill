# QZ-gcp-pca-13-technical-requirements — notes

`content/gcp-pca/quizzes/13-technical-requirements.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.2.1 (q1), 1.2.2 (q2, q6), 1.2.3 (q3), 1.2.4 (q8, q10), 1.2.5 (q9), 1.2.6 (q4), 1.2.7 (q5, q7). Positions 6–10: single ×3, multi ×2 (q7, q10).

## Chapter vs current docs (fix in the chapter, not done here)

- **Autoscaler limits**: the autoscaler overview says autoscaling can't be used with unmanaged groups, MIGs with stateful configuration, **or MIGs with VM repairs turned off**. The chapter mentions only the first two.
- **Cloud Run maximum instances**: the docs say the maximum "can be exceeded for a brief period" during traffic spikes. The chapter presents the maximum as a hard way to protect a database; it should say to keep headroom (q10 does).
- **Zonal vs regional GKE**: the chapter's table gives "Regional GKE cluster" for zone failures but doesn't say that a multi-zonal cluster still has a single control plane in one zone, or that a zonal cluster can't be converted to a regional one (both from "About cluster configuration choices"). These are the facts behind q6; worth a sentence and a trap callout.
- **Spanner backups**: a backup survives the deletion of its source database but can't outlive its parent instance; database deletion protection can't be enabled from the console and isn't inherited by backups or restored databases. The chapter's Spanner row could add these points.
- **Cloud SQL final backup**: retention 30 days by default, 1–365 days for standard backups (up to 10 years for enhanced backups); automated backups are deleted one per day after the instance is deleted. The chapter only says "final backup on deletion".
- **Gemini Cloud Assist**: since April 10, 2026, creating, running and editing investigations requires Premium Support or access through the account team (the chapter says this). The overview page now also lists third-party integrations (Slack, WhatsApp, ServiceNow), an agent identity and MCP support. The overview page fetched today doesn't contain the data residency / CMEK warning that the chapter's trap quotes; it links to a separate data governance page that I didn't fetch. Check that page before keeping the trap as written.
- Confirmed as written: WAF five core principles and six pillars; Cloud SQL HA standby can't serve reads, failover about 60 seconds; GPU VMs and TPUs can't live migrate (60-minute notice, 10 minutes for A4X, A4 and A3 Ultra); predictive autoscaling is CPU only, needs 3 days of history, daily and weekly patterns only; Spanner PITR 1 hour by default, up to 7 days, no protection against a dropped database; Spanner leader can move only to the other read-write region of a dual- or multi-region configuration; Asynchronous Replication target RPO one minute, same continent only.

## Not verified on a fetched page

- The 10-minute stabilization period for scale-in (chapter) isn't in the parts of the autoscaler pages I could read; q8 doesn't rely on its value.
- q5: that a stopped Cloud SQL instance still incurs storage charges is general knowledge, not quoted from a fetched page.
- q10: Memorystore for Valkey used as a cache with key expiration is standard Valkey behavior; the fetched overview page doesn't describe caching explicitly.
- q3: availability of G2 VMs in several zones of the chosen region is assumed (no region is named).

## Design notes

- The bank already tests, for these objectives and related ones, reservations for DR capacity, Backup for GKE cross-region restore, regional disks with force-attach, Asynchronous Replication, Cloud SQL Enterprise Plus DR replica with write endpoint, and Spanner version retention with stale reads. I avoided those decisions. New decisions: core principle vs pillar principles, HA standby vs read replica, GPU VMs and live migration, App Hub–scoped investigation, final backup on deletion, multi-zonal vs regional GKE control plane, Spanner deletion protection plus backup schedule, scale-in controls for unplanned bursts, Spanner default leader placement, Cloud Run maximum instances plus a cache to protect Cloud SQL connections.
- Gemini Cloud Assist is Preview; it is the correct answer only in q4, which tests objective 1.2.6 directly (allowed by the exam profile).
