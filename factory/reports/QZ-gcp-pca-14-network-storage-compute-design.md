# QZ-gcp-pca-14-network-storage-compute-design — notes

`content/gcp-pca/quizzes/14-network-storage-compute-design.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.3.1 (q10), 1.3.2 (q5), 1.3.3 (q1, q9), 1.3.4 (q4, q8), 1.3.5 (q2, q7), 1.3.6 (q3), 1.3.7 (q6). Positions 6–10: single ×3, multi ×2 (q9, q10).

## Chapter vs current docs (fix in the chapter, not done here)

- **Interconnect 99.99 % topology is incomplete.** "Establish 99.99% availability for Dedicated Interconnect" now documents two topologies: four connections in two metros (VLAN attachments in two regions, a Cloud Router per region, global dynamic routing), **and a single-region topology** with four connections in one metro, across two facility and edge availability domain combinations, ordered in a connection group with the `PRODUCTION_CRITICAL` intended topology, attachments in the metro's low-latency region, and only in qualifying metros. The chapter says 99.99 % needs "two in each of two metros". The Cross-Cloud Interconnect overview also mentions the single-region option. Mock questions `gcppca-cs1b-interconnect-topology` and `gcppca-cs2b-interconnect-topology` use the single-metro production-critical topology as a distractor: check that their case texts state a metro-failure requirement.
- **Memorystore for Memcached**: the deprecation banner gives dates: no new instances in new projects from February 1, 2027, shutdown on January 31, 2029, and migration to Memorystore for Valkey is recommended. The chapter only says "deprecated".
- **Gemini models**: the model catalog now has a Gemini 4 family (4 Argon featured, GA) next to Pro, Flash and Flash-Lite. Flash-Lite is described as the most cost-efficient model for high-volume, low-latency traffic. The chapter's "Pro, Flash, Flash-Lite" guidance is still correct but could mention the new family. The quiz names no model version.
- **Cloud Run**: executables must be compiled for Linux 64-bit (no Windows containers); Windows Server nodes aren't available in GKE Autopilot. The chapter's compute table could state both (q3).
- **FQDN objects**: they are a component of firewall policy rules (Cloud NGFW Standard), resolved through Cloud DNS, up to 32 IPv4 and 32 IPv6 addresses per FQDN, no wildcards. The chapter mentions FQDN objects but not that VPC firewall rules don't support them.
- Confirmed as written: VPC global and subnets regional, custom mode recommended, auto mode 10.128.0.0/9; peering non-transitive with export/import of custom routes and custom advertisement on Cloud Router; restricted vs private VIPs; HA VPN over Cloud Interconnect requires encrypted VLAN attachments chosen at creation; MACsec on all 100 and 400 Gbps connections, 10 Gbps through the account team; Cross-Cloud Interconnect 10/100 Gbps (400 Gbps for AWS and OCI); Data Fusion runs pipelines on ephemeral Managed Service for Apache Spark clusters; Hyperdisk ML read-only multi-attach (2,500 instances up to 512 GiB); Spot VMs up to 91 % off; Flex-start up to seven days; calendar-mode reservations 1–90 days, up to 80 GPU VMs; sole-tenant maintenance policies.

## Not verified on a fetched page

- **Launch stage of Rapid Bucket / Rapid storage** (performance table of chapter 13): the Rapid Bucket page states no launch stage. I didn't use it in an answer.
- q7: that Bigtable latency is single-digit milliseconds and Firestore millisecond-level is general knowledge, not quoted from a fetched page; sorted sets are a standard Valkey data structure, not stated on the fetched Valkey overview.
- q6: attaching an existing Hyperdisk ML volume read-only through the instance template of a managed instance group is assumed; the Hyperdisk ML page describes read-only multi-attach without naming MIGs.
- q10: the 4 Gbps figure is not compared to a per-tunnel limit: the AWS page gives none, and the HA VPN over Interconnect page gives 250,000 packets per second per tunnel.

## Design notes

- The bank already tests Private Google Access for on-premises with restricted VIPs, the 99.99 % Interconnect topology (three questions), MACsec vs HA VPN over Interconnect, sole-tenant BYOL, calendar-mode reservations and Flex-start, peering custom route exchange, AlloyDB columnar engine and Autopilot. I avoided those decisions. New decisions: one global VPC with regional subnets, Cloud SQL for a regional MySQL lift, Compute Engine for a non-containerizable Windows app, Cloud Data Fusion for code-free pipelines, Gemini Flash-Lite for high-volume classification, Hyperdisk ML for shared model weights, Memorystore for Valkey vs deprecated Memcached, Spark serverless batches vs ephemeral clusters, FQDN egress rules in a network firewall policy with an explicit deny, and the four-tunnel HA VPN topology to AWS with a transit gateway for ECMP.
- No Preview or deprecated product is a correct answer (Memorystore for Memcached appears only as a distractor).
