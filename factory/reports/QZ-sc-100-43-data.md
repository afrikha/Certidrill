# QZ-sc-100-43-data — report

File: `content/sc-100/quizzes/43-data.yaml` (10 questions; `npx tsx factory/check-quiz.ts sc-100 43-data` → 0 problem(s), 0 warning(s)).

Coverage: 4.3.1 (q1), 4.3.3 (q2, q7), 4.3.2 (q3), 4.3.4 (q4, q9), 4.3.6 (q5), 4.3.5 (q6, q10), 4.3.7 (q8). Formats 6–10: single, yesno_statements, yesno_statements, multi, dropdown.

The mock bank has ~50 questions on 4.3.x; the quiz tests other decisions: Purview DSPM vs Data Map / Defender CSPM / Compliance Manager; platform-managed keys when no key control is needed; multi-user authorization (Resource Guard) against a destructive backup admin; Endpoint DLP for third-party generative AI sites; point-in-time restore vs container soft delete vs legal hold; updatable vs append-only ledger tables; CMK rotation, infrastructure encryption keys, Managed HSM; Defender for Storage malware scanning cap, CMK-encrypted blobs, built-in soft delete; training data minimization and poisoning; Always Encrypted with enclaves vs DDM vs TDE CMK.

## Facts verified on Learn (fetched 2026-11-24)
Purview DSPM (signals, prioritized actions; previous versions now "(classic)"); MUA with Resource Guard (soft delete disable always protected; Backup vault GA); Purview AI page (Endpoint DLP warn/block for third-party gen AI sites); ledger (tamper evidence vs prevention, updatable vs append-only, digests in immutable storage / Confidential Ledger, covers DBAs and cloud admins); Always Encrypted with enclaves (range/LIKE on randomized columns; deterministic = equality only; Intel SGX end of support Oct 31, 2027, VBS on non-DC hardware); dynamic data masking (admins/db_owner see data, UNMASK); Storage CMK (rotation changes root key protection; vault needs soft delete + purge protection; key vault or Managed HSM); infrastructure encryption (Microsoft-managed key only, set at account or scope creation, can't be changed); Defender for Storage (10,000 GB/month/account default cap, scanning stops beyond; subscription-level enablement); malware scanning (CMK-encrypted blobs supported, client-side encrypted not, built-in soft delete remediation, 50 GB limit); point-in-time restore (prereqs, doesn't restore containers); immutable storage (legal hold until cleared); TDE CMK (database Inaccessible when the protector is lost); MCSB v2 AI security (data poisoning, RBAC, provenance and approval).

## Not verified on a fetched page
- q2: Azure SQL Database default TDE with service-managed keys (AES-256) — not fetched, standard fact.
- q7 s1: "rotation doesn't re-encrypt data" — the CMK page says only that the root key's protection changes while data stays encrypted.
- q9: data minimization of training data isn't on the MCSB v2 AI page (it covers poisoning, RBAC, provenance/approval); minimization comes from the chapter.
- q4 distractors: scope of Defender for AI services / prompt shields (own Azure AI resources) — knowledge consistent with the chapter.

## Chapter 43 vs current Learn
- Key Vault table: the chapter says Key Vault Premium uses "FIPS 140-3 Level 3 validated HSMs"; the TDE CMK page (fetched today) still says "Azure Key Vault supports FIPS 140-2 Level 2, and Azure Key Vault Managed HSM supports FIPS 140-2 Level 3". Pages disagree; check the Key Vault overview and align.
- Always Encrypted: the chapter doesn't mention that Intel SGX enclaves (DC-series) reach end of support on October 31, 2027 and that VBS enclaves are the path forward. Worth adding to the encryption or Azure SQL section.
- Infrastructure encryption: "for a storage account, set at creation only" is right, but Learn also allows enabling it on a new **encryption scope** of an existing account (blob data only). Worth a note (the mock question sc100-4c-double-encryption stays correct because it includes Azure Files).
- Discovery table: Purview now names the previous products "DSPM (classic)" and "DSPM for AI (classic)"; the current DSPM covers AI apps and agents. The chapter's "Purview DSPM for AI" rows should use the current naming.
- Defender for Storage: Learn adds Event Grid / Log Analytics result channels and states index tags aren't tamper-resistant; the chapter is consistent.

The shared WebFetch budget ran out once during this task; fetches resumed after waiting, and every fact used was fetched.
