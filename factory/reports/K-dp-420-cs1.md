# K-dp-420-cs1 — report

3 case studies, 18 questions (all `status: draft`):

- `dp420-cs1a-adventure-works` (retail e-commerce, .NET): bulk import (1.2.4), all versions and deletes change feed processor (1.4.4), composite index (2.3.1), server-side latency (2.3.4), data plane RBAC scope (2.1.2), full-text search (3.1.1).
- `dp420-cs1b-humongous-insurance` (multitenant SaaS, Python, fleets): HPK + TTL container creation (1.1.5), fleet pool (2.4.1), vector query on a sharded DiskANN index (3.1.4), dynamic data masking side effects (2.1.4), Python change feed pull model (1.4.2), fleet analytics (2.4.2).
- `dp420-cs1c-trey-research` (pharma RAG assistant with agent memory, Python): vector policy float16 + spherical quantizer + excluded path (3.1.2), missing full-text index (3.1.6), one item per turn (3.2.1), semantic memory (3.2.3), Python client with Entra + preferred_locations (1.1.6), Private Link (2.1.3).

Mix: single 8, dropdown 7, multi 2, yesno 1; difficulty 4 easy / 10 medium / 4 hard.

## Deviations and notes

- Case studies cs2a, cs4a and cs4b, written in parallel, already test PPAF prerequisites, conditional patch, transactional batch, Fabric mirroring prerequisites and OPENJSON, CDBPartitionKeyRUConsumption KQL, hybrid RRF, sharded DiskANN configuration, conversation container key/TTL and DDM role selection. I redesigned my cases to avoid testing the same decisions (for example the vector question tests the query, not the shard key; the DDM question tests side effects, not roles).
- Preview features used (as stated on Learn, Nov. 2026): all versions and deletes mode of the change feed processor (.NET 3.60.0+), fleets and fleet analytics (fleet analytics explicitly preview; the course chapter says fleets are preview). The fleet-analytics question says so in its explanation.
- Learn does not say whether fleet pooling requires autoscale dedicated throughput; the pool question avoids depending on it.
- The case A tab states that the all versions and deletes mode is enabled (the course chapter mentions a portal feature toggle that the Learn change-feed-modes page does not show).
- `ChangeFeedOperationType.Create/Replace/Delete` and `ItemResponse.ETag`-style SDK members not shown verbatim on a fetched page: only `Delete` (shown on Learn) is the correct answer; `Create`/`Replace` are distractors.
