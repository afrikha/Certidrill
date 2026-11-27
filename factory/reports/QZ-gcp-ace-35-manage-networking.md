# QZ-gcp-ace-35-manage-networking — report

File: `content/gcp-ace/quizzes/35-manage-networking.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-ace 35-manage-networking` → 0 problem(s), 0 warning(s).

Coverage: 3.3.1 (q1), 3.3.2 (q4, q6), 3.3.3 (q5), 3.3.4 (q3, q7, q8), 3.3.5 (q2, q9, q10). Multi at q8 and q9. Mock-exam decisions avoided (the 20 bank questions of 3.3.x, plus the 2.3.x secure-tag and hierarchical `goto_next` questions in `planning/`).

## Chapter out of date or imprecise (current docs, checked 2026-11-27)

- **Firewall evaluation order** (section firewall-policies): the current page "Evaluation order for firewall policies and rules" puts **regional system firewall policies** as step 2, between hierarchical policies and VPC firewall rules. The chapter's order leaves them out.
- **Implied rules** (section firewall-rules): the chapter calls them rules ("can't be deleted or logged"). The current docs describe an **implied action** at the last evaluation step: deny ingress to VM interfaces, allow ingress to internal Application and internal proxy Network Load Balancer forwarding rules, allow all egress. The "VPC firewall rules" page no longer has an "implied rules" section. The exam still uses the old wording, so a short note in the chapter would help.
- Not verified: the chapter's firewall policy rule priority range "0 to 2,147,483,547". Neither question depends on it.

## Doubts and facts I could not fully verify

- q3 (lower the TTL before a record change): the Cloud DNS records page only says that resolvers cache a record for its TTL. It does not state the "lower the TTL beforehand" practice; the answer follows from the caching rule.
- q7 (Cloud NAT ports): verified are the static default of 64, the dynamic default minimum of 32, port doubling up to the maximum, 64,512 ports per NAT IP, dynamic allocation being incompatible with endpoint-independent mapping, and EIM off by default in gcloud. For a static minimum larger than one NAT IP can serve, the docs only say the gateway drops packets when it runs out of NAT IP addresses. The explanation is written in those terms.
- q10: the stem says that developers can't change firewall rules, so it doesn't depend on the exact firewall permissions in Compute Instance Admin (v1), which I didn't check.
