# QZ-dp-600-21-get-data — report

File: `content/dp-600/quizzes/21-get-data.yaml` (10 questions, `dp600-qz-21-01` to `-10`). `npx tsx factory/check-quiz.ts dp-600 21-get-data`: 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (q1, q8), 2.1.2 (q3), 2.1.3 (q2, q4, q7, q9), 2.1.4 (q6), 2.1.5 (q5, q10). Formats 6–10: multi, single ×3, dropdown.

The mock bank already covers 2.1.x very densely (≈80 questions). The quiz uses decisions the bank doesn't test: privacy level, which items can hold shortcuts, the PostgreSQL CDC source in Real-Time hub, pipeline vs copy job for orchestration, eventhouse availability off/on (soft delete, restore), the 1 GB limit of shortcut caching, a scoped connection for an external user, metadata mirroring of Databricks with auto-sync, and the Direct Lake "nothing to export" trap.

## Facts verified on Learn (fetched)

- Shortcuts are created in lakehouses and KQL databases; caching applies to GCS, S3, S3 compatible and gateway shortcuts, with 1–28 days of retention, and files over 1 GB aren't cached (onelake-shortcuts).
- Privacy level: "doesn't affect DirectQuery connections" (data-source-management); its role when combining sources (power-query/privacy-levels).
- Eventhouse OneLake availability: turning it off soft deletes the data; turning it back on makes all data available again, including the backfill. Rename, alter column type, RLS, delete/truncate/purge are blocked while it is on.
- Mirroring Azure Databricks: metadata only, data accessed through shortcuts; "Automatically sync future catalog changes for the selected schema" is on by default.
- PostgreSQL CDC source of Real-Time hub: the database must be publicly accessible (or use VNet injection), and Basic is the only authentication.
- Semantic model OneLake integration: Import tables only, F or P SKUs, `.SemanticModel` folder.

## Doubts and unverified points

- **Mirroring Azure Databricks GA status**: neither the overview, the tutorial nor the limitations page has a preview label, and the mirroring overview lists it without "(preview)". I treated it as GA (q9 correct answer). Check this again if a label appears.
- **Office 365 Outlook activity** (q4, correct option): I'm confident the activity name is right, but I didn't fetch its page.
- **Cross-workspace three-part names**: Learn ("Query the warehouse or SQL analytics endpoint") describes cross-database queries only "in the current active workspace" and doesn't say how to cross workspaces. I left this decision out.

## Chapter issues against current Learn (chapter not edited)

- **Shortcut identity (section ingest-or-access)**: the chapter says internal shortcuts always use the caller's identity. Learn adds an exception: with Direct Lake over SQL, or T-SQL in delegated identity mode, the caller's identity isn't passed to the shortcut target. Learn recommends Direct Lake over OneLake or T-SQL user identity mode instead. This is worth a sentence in the chapter.
- **Gateway checkbox (section data-connections)**: Learn says that for cloud connections created through Dataflow Gen2, the "can be used with on-premise data gateways and VNet data gateways" setting "isn't currently enforced: all shareable cloud connections work through a gateway if one is present." The chapter presents the checkbox without this caveat.
- **Shortcut targets/holders**: Learn now also mentions eventhouse **database shortcuts**, which share all or some subitems of a database. The chapter doesn't mention them. This is minor.
- **Copy job and pipelines**: Learn says a copy job can also run as a **copy job activity** inside a pipeline. The chapter's table could say so.
