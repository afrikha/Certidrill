# QZ-az-120-41-performance-costs — notes

## Chapter vs current Learn (to fix in the chapter, not done here)

- Section `resize-vms`: "You can't resize directly between a series with a temporary disk and one without" is too broad. The Learn FAQ "Azure VM sizes with no local temporary disk" now says the resize between disk and diskless sizes **is supported for Linux VMs**; only Windows is limited to disk→disk and diskless→diskless, with the workaround "move pagefile.sys to C:, snapshot the OS disk, create a new diskless VM from the snapshot". The SAP planning guide still says the resize fails (no OS distinction). q7 uses Windows only, to stay true for both pages.
- Section `resize-vms`: "Generation 1 VMs can't move to Generation 2-only families such as Mv2". The SAP planning guide says so, but the page "Azure support for Generation 2 VMs" now documents an upgrade of existing Gen1 VMs to Gen2 through the Trusted launch security type. Whether that path applies to M/Mv2 SAP VMs wasn't verified; I dropped a planned question on it. The chapter should qualify the sentence (and mock question `az120-2a-vm-selection-facts` s3 relies on "must deploy a new VM").
- Everything else checked in the chapter matches Learn: five Advisor categories; quality checks hourly, >100 checks, keep-alive 30 minutes maximum, 7-day filter after VIS deletion; NVA unsupported, peered VNets unsupported and billed, NSGs at subnet level, NICs share bandwidth; reservations applied first, savings plans not refundable, same total cost monthly/up front, 50,000 USD refund limit, exchange restriction from February 1, 2027; ANF 1 TiB minimum in 1-TiB increments; NSE facts (SPS 04+, 10% buffer cache, reversible, no disk-size reduction).

## Facts not verified, so left out

- Logon groups (SMLG) for application-server load distribution: no Learn page found that states it (the chapter has no reference either).
- Write Accelerator / Premium SSD log latency rules for E-series HANA VMs: not re-verified, not used.
- Ultra Disk performance-change frequency limits: not verified, not used.

## Design notes

- q10 uses fictional hourly rates given in the stem (1.00 / 0.70 USD) so that the computation depends only on the documented mechanics (reservation first, use-it-or-lose-it commitment, overage at pay-as-you-go).
- q8 overlaps in method with mock `az120-1a-size-anf-pool` (pool sizing), but tests a different decision: auto vs manual QoS at a fixed level, and the throughput left in a manual QoS pool.
- q6 (`dragdrop`, reuse true): the "no effect" result fits only the second-NIC change; acceptable for a classification item.
- q2 explanation says data archiving "isn't reversible": Learn states it indirectly ("NSE … reversible (unlike data archiving)").
