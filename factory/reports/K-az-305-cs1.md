# K-az-305-cs1 — report

3 case studies, 18 questions (6 each), all `status: draft`. Validator: `21 files, 0 problem(s)`.

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `az305-cs1a-trey-research` | Genomics; HPC batch and storage move to Azure | alignment-compute (4.1.5, dropdown, 2), nas-transfer (4.3.5, single, 2), raw-files-storage (2.2.3, dropdown, 3), report-immutability (2.2.4, single, 1), node-identity (1.2.3, single, 2), lims-target (2.1.1, single, 1) |
| `az305-cs1b-blue-yonder` | Airline; multi-region cloud-native application | global-entry (4.4.5, single, 1), bookings-database (3.2.2, dropdown, 3), messaging-services (4.2.2, dragdrop, 2), loyalty-cosmos (3.2.3, yesno, 2), customer-identity (1.2.2, single, 1), partner-gateway (4.2.3, single, 2) |
| `az305-cs1c-humongous-insurance` | Insurance; datacenter exit, hybrid, governance | vm-assessment (4.3.2, multi, 2), broker-access (1.3.3, single, 2), claimshub-backup (3.1.2, dropdown, 3), log-destinations (1.1.2, dragdrop, 1), hybrid-connectivity (4.4.2, single, 3), governance (1.3.2, yesno, 2) |

Mix: single 9, dropdown 4, yesno 2, dragdrop 2, multi 1. Difficulty: 5 easy, 9 medium, 4 hard. Domains: identity 5, data 3, continuity 3, infrastructure 7.

## Verification

Every reference was fetched on 2026-11-17 (titles are the page H1). WebFetch hit its hourly limit after the first 10 pages; the remaining 13 were fetched after the limit reset, before finishing.

## Points to review

- `az305-cs1b-bookings-database`: the In-Memory OLTP page says Hyperscale "supports a subset of In-Memory OLTP objects" and lists memory-optimized tables among the objects to remove before scaling to Hyperscale; the Hyperscale limitations page itself was not fetched.
- `az305-cs1a-node-identity`: the Batch page documents only user-assigned identities for pools; the explanation of the system-assigned option relies on its life cycle (one identity per pool, new role assignments per run), not on a stated "not supported".
- `az305-cs1c-claimshub-backup`: the immutable vault page does not mention roles; the explanation therefore does not claim "whatever the role". UK South / UK West pairing is taken from general knowledge, not from a fetched page.
- `az305-cs1c-vm-assessment`: agent-based dependency analysis now exists only in the classic Azure Migrate view (no new onboarding, deprecation announced for end of 2026); option a stays a valid distractor because it installs agents.
- `az305-cs1b-loyalty-cosmos`: read-your-writes in session consistency assumes the same session token; the case requirement was worded "same client session" for that reason.
- Overlaps with other agents' content, same topic but different decision or format: `az305-cs3c-access-governance` (entitlement management in a dragdrop), `az305-cs3a-region-restriction` (Allowed locations), `az305-cs3a-hybrid-connectivity` (answer there is ExpressRoute plus VPN backup). The first idea for case C (application proxy) was dropped because the series `az305-sr1-intranet-remote` already tests it.
