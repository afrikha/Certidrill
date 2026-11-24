# QZ-az-305-32-high-availability — report

File: `content/az-305/quizzes/32-high-availability.yaml` (10 questions, `az305-qz-32-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Objectives: 3.2.1 (Q1, Q3, Q6, Q8), 3.2.2 (Q5, Q9, Q10), 3.2.3 (Q2, Q4, Q7). Positions 6-10: dropdown, single, multi, yesno_statements, dropdown.

## Chapter out of date or imprecise against current Learn

- **Geo priority replication.** The chapter says it "guarantees an RPO of 15 minutes or less for block blobs". Learn ("Azure Storage Geo Priority Replication") describes something narrower:
  - An SLA that the Last Sync Time of block blob data stays within 15 minutes for 99.0% of the billing month.
  - Billed per GB since 1 January 2026, and enabled per account (GRS/GZRS, "Blob only").
  - Exclusions: append/page blob API calls in the last 30 days, more than 35 Gbps or more than 100 CopyBlob/s.
  - Turned off by an unplanned failover.
  
  The page doesn't say whether the feature is GA, so the quiz doesn't use it. Rewording suggestion: "an optional, billed feature with an SLA of a Last Sync Time within 15 minutes for block blobs".
- **SQL Managed Instance zone redundancy.** Learn marks zone redundancy GA for Next-gen General Purpose, which needs Azure Elastic SAN ZRS and isn't available in some regions. The General Purpose and Business Critical tiers aren't labelled. The chapter says "General Purpose, Business Critical" and doesn't mention Next-gen. Q9 uses Business Critical.
- **SQL MI DR-only secondary.** Learn says Microsoft provides free vCores to match the primary, but compute and storage of the secondary are still charged. The chapter's "pays no SQL Server license" is consistent but terse.
- **PostgreSQL HA and Burstable.** Learn says that zone-redundant HA isn't supported in the Burstable tier. It says nothing about same-zone HA there. The chapter's "HA isn't available in the Burstable tier" could not be confirmed for same-zone HA. The HA page also doesn't state how the standby is billed (the chapter says "billed like the primary").
- **VM SLA 99.99% across zones.** This figure isn't on "Availability options for Azure Virtual Machines" (only the 99.95% availability set figure is), and I didn't fetch the SLA page. Q8 doesn't use the number.
- **Composite SLA.** The Well-Architected Framework now says "composite SLO" (product of the contributing values). The chapter's "components in series multiply their SLAs" matches it.

## Unverified facts avoided

- Billing of Hyperscale named replicas isn't stated on "Hyperscale secondary replicas" (HA replicas are billed at the primary's compute rate). Q10's explanation for the named-replica distractor relies only on "Hyperscale only, separate database with its own service objective".

## Reference URLs to watch

- `https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-availability-zones` now serves "Reliability in Azure Load Balancer".
- `https://learn.microsoft.com/en-us/azure/well-architected/reliability/highly-available-multi-region-design` now serves "Architecture strategies for designing for redundancy".
- The PostgreSQL HA concepts page moved to `/azure/postgresql/high-availability/concepts-high-availability`. The old `/flexible-server/` URL failed.
