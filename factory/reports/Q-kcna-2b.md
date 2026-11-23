# Q-kcna-2b — KCNA questions, Security 2.2.1–2.2.6 (2026-11-23)

## Result
48 `single` questions in `content/kcna/questions/orchestration/`, prefix `kcna-2b-`, 8 per objective. Difficulty 19 easy / 22 medium / 7 hard. Correct options spread 12/12/12/12 over a–d. English only. `CERT=kcna npx tsx factory/validate.ts --prefix kcna-2b-`: 0 problems; `npm run content:validate -- --cert kcna --prefix kcna-2b-`: 0 problems, 0 warnings.

## Sources fetched (WebFetch, 2026-11-23)
kubernetes.io: controlling-access, rbac, rbac-good-practices, authentication, authorization, admission-controllers (v1.37 default list), validating-admission-policy, service-accounts, configure-service-account, pod-security-standards, pod-security-admission, pod-security-policy (removed v1.25), security-context task, secret, secrets-good-practices, encrypt-data, cloud-native-security, security-checklist, verify-signed-artifacts. Projects: kyverno.io/docs/introduction, openpolicyagent.org/docs/kubernetes, docs.sigstore.dev cosign overview. All references point to these pages.

## Overlap with other prefixes
- Dropped my digest-pinning question: `kcna-3a-image-digest` already tests "reference by digest so a moved tag can't change the image". The `kcna-1d-*` digest questions test the same idea too. Replaced it with an SBOM question.
- `kcna-1c-quota-pods-exceeded` tests what happens when a quota is exceeded. `kcna-2b-quota-rejected-admission` tests which request stage rejects it (admission). The two test different decisions.
- `kcna-4b-falco-runtime-threats` uses Falco as its answer. In `kcna-2b-supply-kyverno`, Falco is only a distractor.

## Doubts / choices
1. The controlling-access page doesn't use the words "mutating" or "validating". The mutating-before-validating order comes from the admission-controllers page, which is cited.
2. Reference titles: "Authenticating", "Authorization", "Introduction" (Kyverno) and "Overview" (Sigstore) are the on-page headings. The fetch didn't show the full HTML `<title>` for the first two.
3. Some field descriptions on the Pod API reference were cut off when fetched: `runAsNonRoot`, `privileged` and `readOnlyRootFilesystem`. No question depends on their exact semantics. `readOnlyRootFilesystem` is only a distractor.
4. Not re-verified this session: `kcna-2b-restricted-net-bind-service` says `NET_BIND_SERVICE` binds ports below 1024 (general Linux knowledge). In `kcna-2b-supply-registry-policy`, "images are pulled by the node's runtime, so NetworkPolicy doesn't apply" is general knowledge too. Kyverno's and OPA's CNCF maturity is not tested.
5. Course chapter 22 lists Trivy as a scanner. The questions don't name a scanner product, because no Trivy host is accepted for CNCF.
