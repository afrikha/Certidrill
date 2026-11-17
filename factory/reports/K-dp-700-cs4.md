# K-dp-700-cs4 — report

2 case studies, 12 questions (prefix `dp700-cs4`), validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| dp700-cs4a-city-power | Electricity distributor: smart-meter eventstream to eventhouse (array expansion), Azure SQL billing mirroring, SharePoint tariffs, Activator | 2.2.4 multi, 2.3.4 single, 2.2.9 dropdown (KQL), 1.4.1 single, 3.1.4 single, 3.1.1 single |
| dp700-cs4b-fourth-coffee | Coffee roaster / retail: warehouse star schema, CSV loads with COPY INTO, deployment pipeline across split Eng/Data workspaces, masking, endorsement | 1.2.3 single, 1.3.6 single, 1.3.4 yesno, 2.1.1 dropdown (T-SQL), 2.2.9 single, 3.2.6 single |

Difficulty: 2 easy, 7 medium, 3 hard. Type mix is single-heavy (8 of 12); no drag-and-drop.

## Deviations and overlaps with the parallel agents

- I first wrote 6 questions that repeated the same decision with the same answer as cs1 or cs3. I replaced them: accelerated shortcut (cs3a), workspace roles (cs3a), RLS predicate code (cs3b), blob event trigger + `TriggerEvent.FileName` (cs3c), query insights `long_running_queries` (cs3b) and KQL update policy (cs1a, almost identical).
- Partial overlaps that remain:
  - `dp700-cs4b-endorse-warehouse` vs `dp700-cs1b-endorse-label`. Both use Promoted vs Certified permissions, but mine asks which badge to choose: Certified vs Master data vs sensitivity label.
  - `dp700-cs4b-masking-statements` vs `dp700-cs3b-masking`. Both rely on Contributor having CONTROL/UNMASK. Mine tests column-scoped UNMASK vs the Contributor role and WHERE-clause inference.
  - `dp700-cs4b-lakehouse-rule` vs `dp700-cs3b-deploy-rule`. Both create the rule on the target stage, but mine is about a notebook default lakehouse rule (Other) when auto-binding does not apply across workspaces.
- cs2 was still being written when I finished. Its 6 questions checked at the end do not overlap.

## Facts to double-check

- `dp700-cs4a-expand-readings`: Learn says Expand "creates a new row for each value within an array". It does not say outright that the other event fields are copied to each row. The question relies on that, which is the usual behaviour.
- `dp700-cs4a-ingestion-failures`: workspace monitoring is preview. Learn says the ingestion results logs cover *queued* ingestion. Learn does not say which ingestion method an eventstream Eventhouse destination uses. The answer works because `.show ingestion failures` keeps only 14 days and the requirement asks for 30.
- `dp700-cs4a-billing-mirroring`: the tutorial says Contributor lacks Reshare and that Member or Admin is needed to create the mirror. The workspace roles table lists Contributor as able to create mirroring items. Workspace roles are not tested, to avoid this contradiction.
- `dp700-cs4b-copy-into`: Learn does not describe what MATCH_COLUMN_COUNT does in detail; it is used only as a distractor. Using ERRORFILE without a credential on a public account is not documented, so the template includes ERRORFILE_CREDENTIAL with SAS, the only type Fabric supports.
- The study guide lists 3.2.6 "T-SQL errors"; the update-conflict question uses error 24556 from "Transactions in Fabric Data Warehouse".
