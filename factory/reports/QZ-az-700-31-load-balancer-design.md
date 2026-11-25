# QZ-az-700-31-load-balancer-design — report

File: `content/az-700/quizzes/31-load-balancer-design.yaml` (10 questions, `az700-qz-31-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Objectives: 3.1.1 (q1, q3), 3.1.2 (q4, q8), 3.1.3 (q5, q6), 3.1.4 (q2, q7), 3.1.5 (q9, q10). Positions 6–10: single, single, multi, yesno_statements, dropdown.

Pages fetched (Nov 2026): load-balancer-overview, components, skus, distribution-mode-concepts, admin-state-overview, load-balancer-ha-ports-overview, gateway-overview, cross-region-overview, load-balancer-standard-availability-zones (title now "Reliability in Azure Load Balancer"), outbound-rules.

## Chapter wrong or out of date against Learn

- **Distribution modes table** (section "Features and capabilities"): the chapter says that **Client IP and protocol** (3-tuple) makes "a TCP control channel and a UDP data flow from one client reach the same instance". This is wrong. The protocol is part of the 3-tuple hash, so a client's TCP and UDP flows can reach different instances. Only **Client IP** (2-tuple) guarantees that they reach the same one. Learn gives the media-upload case (TCP control + UDP data) as a source IP affinity scenario, and RD Gateway as the 3-tuple scenario. The mock-exam question `az700-3a-lb-persistence-media-upload` answers Client IP, which contradicts the chapter. Please fix the chapter.
- **HA ports**: the chapter says "one HA ports rule per internal frontend". Learn allows several HA ports rules if each one uses a unique frontend IP address and all of them have Floating IP enabled. Learn also says that flow symmetry isn't supported for NVAs placed between a public and an internal load balancer, and recommends Gateway Load Balancer for that case.
- **Admin state Down**: established TCP connections persist, but existing UDP flows move to another healthy instance. The setting applies per backend pool: a VM in two pools isn't affected in the other pool. It can't be set when you create a NIC-based pool. None of this is in the chapter.
- **Zones**: Learn now recommends zone-redundant frontends for every workload, including workloads deployed in a single zone. To change the zone configuration, you create a new frontend IP configuration and move the rules to it; clients must then use the new address. Neither point is in the chapter.

## Doubts

- q2: Learn's overview names on-premises access to an internal load balancer, and the SKU page confirms access through global VNet peering. Access from peered spokes in the same region is implied (it's standard behaviour), but no page I fetched states it word for word.
- q7: the answer relies on the limit of one NIC-based public load balancer and one NIC-based internal load balancer per availability set (components page, and in the chapter).
