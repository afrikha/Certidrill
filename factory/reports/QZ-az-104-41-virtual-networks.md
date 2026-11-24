# QZ-az-104-41-virtual-networks — doubts and notes

Quiz: `content/az-104/course/quizzes/41-virtual-networks.yaml` (10 questions; checker: 0 problem(s), 0 warning(s)).

## Objectives and formats
- 4.1.1: q1 (single, d1), q8 (multi, d3). 4.1.2: q4 (single, d2), q10 (hotarea, d3). 4.1.3: q2 (single, d1), q6 (yesno, d3). 4.1.4: q3 (single, d2), q9 (dropdown, d3). 4.1.5: q5 (single, d2), q7 (dragdrop, d3).
- I read the mock-exam bank (42 questions for 4.1.x plus the monitoring Network Watcher questions) and chose other decisions: GatewaySubnet name, Standard IP kept after deallocation, route table on the source subnet, blocking peered traffic without deleting the peering, guest OS firewall after IP flow verify and next hop, DNS label unique per region and /28 prefix fully usable, stale DNS until restart / wrong next hop IP / peering sync, private subnet with an owned outbound IP, BGP prefix beating 0.0.0.0/0, and which peering link must allow forwarded traffic.

## Facts checked on Learn (Nov. 2026)
- Default outbound access: for API versions after 31 March 2026 new subnets are private; the portal already defaults to private subnets; the default outbound IP belongs to Microsoft and can change; UDRs with next hop Internet break in a private subnet; explicit methods are NAT gateway, LB outbound rules, public IP on the NIC, firewall/NVA with a UDR. q8 says outright that the subnet is private, so it does not depend on the API version.
- Peering settings: the "Allow traffic to remote virtual network" setting is recommended for blocking traffic without deleting the peering; "receive forwarded traffic" is set on the link of the network that receives it.
- DNS: the manage-virtual-network page says to **restart** VMs so they get new VNet DNS servers. It does not mention DHCP renewal, so q7 offers only "restart" (and no NIC-level DNS option, which would also work).
- I could not find the peering sync status labels ("Remote sync required", etc.) on the fetched pages, so q7 describes the symptom instead.
- I could not verify whether a zonal public IP can be associated with a VM in another zone, so q6 leaves it out.

## Possible course issues (chapter 41, not modified)
- The public IP section says Standard is "the only current SKU". Learn now documents a **Standard v2** public IP SKU (zone-redundant only, usable only with the Standard v2 NAT gateway for now). The WRITING_GUIDE also mentions it.
- The table says a Standard public IP can be zonal, zone-redundant "or no zone". Learn says non-zonal is "only valid in regions that do not support availability zones".
- The FR chapter uses « appairés » several times, and the guide says to avoid it (use « peering »). The quiz doesn't use it.
- The chapter has no `Exam trap.` callouts, though BRIEF-QUIZ suggests using them as material.
- Routing preference Internet works only with zone-redundant Standard IPs, can't be changed after creation and can't be used with NAT gateways. None of this is in the chapter, so the quiz doesn't test it.
