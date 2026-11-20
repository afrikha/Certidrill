# Q-sap-c03-1c — QUESTIONS SAP-C03, domain architecture (2026-11-20)

## Result
- 54 questions in `content/sap-c03/questions/architecture/`, prefix `sapc03-1c-`, 6 per objective (1.3.2–1.3.5, 1.4.1–1.4.5).
- Types: single 45, multi 9 (7 "Choose two." on 5 options, 2 "Choose three." on 6 options: 1.3.4 and 1.4.4).
- Difficulty: 9 easy / 27 medium / 18 hard (17 / 50 / 33 %).
- Positions of the correct single answers: a 11, b 11, c 13, d 10. Option lengths rebalanced so the correct option is not noticeably the longest.
- `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-1c-`: 54 files, 0 problem(s).

## Deviations
- Multi stems have **no** "NOTE: Each correct selection is worth one point." line: SAP-C03 multiple response is all or nothing (blueprint `scoring.multi: all_or_nothing`), so the sentence would be wrong. Same choice as 16 SAA-C03 multi questions.
- No SAP-C03 course chapter existed when the batch was written, so the questions were aligned only with the AWS documentation.

## Facts used from general knowledge (not quoted on a fetched page)
These are well established, but the fetched pages did not state them word for word:
- DataSync copies only changed data by default and has a per-task bandwidth limit (`sapc03-1c-hybrid-sync-nfs-smb`, `-datasync-azure-blob-enhanced`).
- Transfer Family service-managed users authenticate with SSH keys only (`-transfer-custom-idp-ldap`).
- RabbitMQ does not accept ActiveMQ OpenWire clients (`-amazon-mq-activemq-protocols`).
- The Amazon-provided DNS server (VPC base + 2) answers only queries from inside the VPC (`-dns-inbound-endpoint-forwarder`).
- A Resolver SYSTEM rule makes Resolver resolve a domain itself instead of forwarding it (`-dns-bidirectional-hybrid`).
- With EKS custom networking, pod traffic leaving the VPC is SNATed to the node's primary IP by default (`-eks-custom-networking-cgnat`).
- With only reserved concurrency on an SQS-triggered function, throttled messages return to the queue and can reach the DLQ (`-sqs-max-concurrency-legacy`); the fetched page only says Lambda "might throttle your messages".
- Outposts racks are bought with a term commitment (`-eks-hybrid-nodes-factory`, `-local-zone-workstations`).
- A Direct Connect gateway does not route between the VPCs associated with it (`-cloud-wan-global-segments`).
- Amazon-provided contiguous IPv6 CIDR blocks for IPAM pools: confirmed by the January 2023 What's New announcement, the pool page only describes contiguous allocation (`-ipam-contiguous-ipv6`).

## Services checked
- Amazon FSx File Gateway: no longer available to new customers (used nowhere).
- AWS Migration Hub Refactor Spaces: closed to new customers since November 7, 2025 (not used; the strangler fig question uses API Gateway).
- ARC readiness check carries an "availability change" notice: not used; only routing controls are used.
- No closed service (Migration Hub, Application Discovery Service, Snow Family, OpsWorks, Amazon Q Developer) appears as an answer. No answer depends on the Lambda maximum timeout.

## Reference title to recheck
- `https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-appliance-scenario.html` returned the title "How AWS Transit Gateway works - Amazon VPC" (the page may redirect). Used as returned in `-tgw-appliance-mode-asymmetric` and `-network-firewall-tgw-attached`.
