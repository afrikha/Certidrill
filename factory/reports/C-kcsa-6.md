# C-kcsa-6 — report (KCSA chapters 61–64, English only)

Chapters written: 61-compliance-frameworks, 62-threat-modeling, 63-supply-chain-compliance, 64-automation-tooling (`.en.md` only). Check: `factory/check-cert.ts` and `content:validate` report 0 problems for these chapters. Prose (without tables and code) about 870–1,030 words per chapter; about 1,400–1,700 with tables.

## Facts verified (WebFetch, 2026-11-23)

- NIST SP 800-190 title, date (September 2017) and risk categories/subsections (csrc.nist.gov, nvlpubs.nist.gov PDF).
- MITRE ATT&CK Containers matrix tactics and techniques (attack.mitre.org, v20 current). **ATT&CK v19 (April 2026) split Defense Evasion into Stealth (TA0005) and Defense Impairment (TA0112)**: chapter 62 teaches both names. Question writers: the KCSA curriculum and most prep material still say "Defense Evasion"; avoid making the tactic name the decisive element of a question, or accept both.
- SLSA: v1.2 is current (Build and Source tracks); Build L0–L3 names and threats; provenance predicate `https://slsa.dev/provenance/v1` and fields (slsa.dev).
- CNCF Software Supply Chain Best Practices: v1 May 2021 (four principles trust, automation, clarity, mutual authentication, per the CNCF announcement), v2 November 2024 (personas, stages source/materials/build pipelines/artifacts/deployments and distribution).
- kube-bench (run modes, version auto-detection, managed services worker-only, cis-1.10 node check IDs used in the sample output), Trivy flags (`--exit-code`, `--severity`, `--ignore-unfixed`, `--format cyclonedx`), Kubescape (CNCF incubating since 2025-01-13; NSA-CISA, MITRE ATT&CK, CIS frameworks), Kyverno policy reports and Audit/Deny (Kyverno 1.18–1.20 docs: ClusterPolicy marked deprecated, `failureAction` per rule, `ImageValidatingPolicy` stable since 1.20), Gatekeeper audit (60 s default) and `enforcementAction` deny/dryrun/warn, Falco (graduated, detect-only, modern eBPF default), cosign `attest`/`verify-attestation --type`, Sigstore policy-controller (`ClusterImagePolicy`, `policy.sigstore.dev/include` label).
- CIS Kubernetes Benchmark: consensus process, separate managed-service benchmarks (cisecurity.org). No version number stated in the chapter.

## Stated from general knowledge (not fetched; low risk, flag for review)

- Framework descriptions in 61 (PCI DSS twelve requirements, HIPAA safeguard types, GDPR 72-hour notification and Article 32 wording "encryption and pseudonymisation", SOC 2 Type I/II and Trust Services Criteria, ISO/IEC 27001 ISMS/Annex A). The vendor host list has no page for these, so no link is given.
- CIS Level 1 / Level 2 profile definitions and the grouping of benchmark sections (consistent with kube-bench targets master/etcd/controlplane/node/policies).
- SLSA being an OpenSSF project; SPDX being an ISO/IEC standard; CycloneDX being an OWASP project; Gatekeeper external data for signature verification.
- kube-bench WARN meaning (manual or not automatically evaluable check).

## Doubts

- Kyverno's policy types are moving fast (ClusterPolicy deprecated in favour of CEL-based ValidatingPolicy/ImageValidatingPolicy). Chapter 64 says "Audit or Enforce/Deny" to cover both; questions should not hinge on exact Kyverno field names.
- `course.yaml` references for these chapters are empty (not my file); suggested: kubernetes.io audit page, slsa.dev/spec/v1.2, attack.mitre.org/matrices/enterprise/containers/, csrc.nist.gov/pubs/sp/800/190/final, github.com/aquasecurity/kube-bench, falco.org/docs.
