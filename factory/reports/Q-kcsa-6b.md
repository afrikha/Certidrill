# Q-kcsa-6b — report (KCSA compliance 6.3.x and 6.4.x, English only)

30 `single` questions in `content/kcsa/questions/compliance/`, prefix `kcsa-6b-`, 5 per objective (6.3.1–6.4.3). Difficulty 11 easy / 15 medium / 4 hard. Correct options a 8, b 8, c 7, d 7. `factory/validate.ts` and `content:validate` report 0 problems.

## Verified (WebFetch, 2026-11-23)
- SLSA v1.2: build-track-basics (L0–L3, L1 unsigned provenance, L2 signed by hosted platform, L3 isolation of runs and signing secrets), build-provenance (fields, `builder.id` main determinant), verifying-artifacts (expectations on externalParameters/source repo, upload vs consumer verification, registry compromise), about (no code-quality claim, level independent of dependencies).
- CNCF Software Supply Chain Best Practices v1 (GitHub sscsp.md: four principles, stages) and v2 (tag-security.cncf.io: personas, source stage MFA/signed commits/two-party review, single-use workers, key compromise "when, not if", TUF properties, admission-controller gate, SBOM + VEX from suppliers).
- cosign: `attest --type` values (spdx, cyclonedx, slsaprovenance, openvex...), attestation pushed to the registry (`.att` tag example); Sigstore policy-controller opt-in label, `ClusterImagePolicy`, warn mode; Kubernetes release SBOM in SPDX (kubernetes.io verify-signed-artifacts).
- kube-bench: README, running.md (Job + pod logs, hostPID to see processes, managed services cannot check masters), flags-and-commands.md (`--exit-code`, WARN not counted as FAIL), raw job.yaml (hostPID, /var/lib/kubelet read-only mount).
- Trivy: README (targets, scanners, `trivy fs --scanners`, `trivy k8s`), exit code (default 0) and filtering (`--severity`, `--ignore-unfixed`, `.trivyignore`). Kubescape README (frameworks, `--compliance-threshold`, CNCF incubating).
- Gatekeeper violations.md (deny default, dryrun, warn) and audit.md (60 s default, constraint status). Kyverno Policy Reports, ImageValidatingPolicy and ValidatingPolicy (stable 1.20). Kubernetes ValidatingAdmissionPolicy (stable v1.30; Deny/Warn/Audit, Deny+Warn not allowed together). Pod Security Standards (Baseline forbids hostPID). Falco docs (syscalls, modern eBPF default, alert outputs, detect-only) and rule basics.

## Doubts / choices
- Duplicates removed during writing: SBOM formats (= kcsa-5a-sbom-formats), single-use build workers (= kcsa-5a-cicd-ephemeral-runner), image rescan (= kcsa-5a-regctl-scheduled-rescan), admission signature check (close to kcsa-5a-pull-signature-origin), SLSA L2/L3 boundary (close to kcsa-5a-sc-slsa-level-shared-runner), VEX (close to kcsa-5a-sbom-cyclonedx-vex), Kyverno policy reports for existing resources (= kcsa-6a-running-resources-evidence). Batches 5a/6a were still being written in parallel: a final cross-check of the whole KCSA bank is advised.
- kcsa-6b-cosign-attestation-storage: newer cosign releases may store attestations as OCI referrers/bundles rather than `.att` tags; the correct option is worded generically ("a separate artifact associated with the image digest").
- kube-bench WARN meaning (manual check) not stated on a fetched page; the exit-code question relies only on "WARN does not count as FAIL" (verified).
- v1 principle names "Trust, Automation, Clarity, Mutual authentication" follow chapter 63 (CNCF announcement); the paper itself words the third one "clearly defined, limited build environments".
- GitHub-hosted references use the GitHub page titles as fetched (allowed host `github.com`); Gatekeeper's own docs host (open-policy-agent.github.io) is not in `lib/vendors.ts`.
- No MITRE tactic names and no 4Cs used.
