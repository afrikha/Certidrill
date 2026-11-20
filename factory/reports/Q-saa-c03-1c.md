# Q-saa-c03-1c — QUESTIONS SAA-C03, secure (1.2.6–1.2.10, 1.3.1–1.3.4) — 2026-11-19

## Result
- 54 questions, prefix `saac03-1c-`, 6 per objective; single 45 / multi 9 (one multi per objective; all multi are 5 options / choose 2).
- Difficulty 16 / 27 / 11 (30 % / 50 % / 20 %). Correct positions: a 16, b 13, c 19, d 15 (multi counted per key).
- `CERT=saa-c03 npx tsx factory/validate.ts --prefix saac03-1c-` → 54 files, 0 problem(s).

## Sources and method
- docs.aws.amazon.com is blocked for curl in this session (proxy 403); every fact and every reference title was read through WebFetch (model-summarised pages). Reference titles are the page H1 as returned by WebFetch.
- The TGW scenario page `tgw/transit-gateway-isolated-shared.html` returned the H1 "How AWS Transit Gateway works" twice, so the question cites `tgw/how-transit-gateways-work.html` (associations / propagations quotes verified there) instead.

## Points worth knowing (verified, Nov 2026)
- **Regional NAT gateways** exist (`--availability-mode regional`, no public subnet needed, auto multi-AZ expansion, no private NAT). Classic "one NAT gateway per AZ" traps are now ambiguous: I avoided them and wrote "zonal public NAT gateway" where placement in a public subnet matters (`saac03-1c-nat-gateway-routing-pair`). Other SAA-C03 writers (resilient / cost domains) should take this into account.
- **SSE-C disabled by default** for new general purpose buckets since April 2026 (S3 SSE page) — used as a distractor explanation in `saac03-1c-sse-kms-customer-managed`.
- AWS WAF protectable resources now also list Bedrock AgentCore Gateway, Verified Access, Amplify; still no NLB.
- Macie docs now say "AWS Security Hub CSPM"; I did not use Security Hub in any question.
- KMS: imported key material supports on-demand rotation (not automatic); custom key stores support neither. Not used in this batch (1.3.11 belongs to 1d).

## Facts used from general knowledge (not quoted on a fetched page)
- An ALB needs subnets in at least two Availability Zones (`saac03-1c-alb-public-private-multiaz`).
- Security groups cannot be associated with a NAT gateway; KMS aliases cannot point to a key in another account.
- Network Firewall domain lists match the TLS SNI / HTTP Host (the fetched page confirms domain filtering, not SNI explicitly).
- S3 Glacier Instant Retrieval storage is cheaper than Standard-IA for data read a few times a year.
- Shield SRT requires Business or Enterprise Support (stated on the fetched page; AWS support plan names may have evolved).

## Overlap notes
- 1.3.4 avoids rotation (1.3.11) and at-rest defaults (1.3.6): key types, snapshot sharing, CloudHSM key store, envelope encryption, multi-Region keys, cross-account key policy.
- 1.2.9 uses Secrets Manager (also 1.2.1 territory) only in RDS-rotation and API+WAF combination angles.
