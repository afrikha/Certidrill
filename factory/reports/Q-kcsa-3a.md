# Q-kcsa-3a — report (KCSA fundamentals, 3.1.1–3.3.3, English only)

50 `single` questions in `content/kcsa/questions/fundamentals/`, prefix `kcsa-3a-`, 5 per objective. Difficulty 20 / 23 / 7. Correct options a 12, b 13, c 13, d 12.
Checks: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-3a-` → 0 problem(s); `npm run content:validate -- --cert kcsa --prefix kcsa-3a-` → 0 problems, 0 warnings.

## Pages fetched (2026-11-23, v1.37 docs) and used as references
Pod Security Standards; Pod Security Admission; Enforce Pod Security Standards by Configuring the Built-in Admission Controller; Enforce Pod Security Standards with Namespace Labels; Admission Control in Kubernetes; Validating Admission Policy; PodSecurityPolicy Deprecation: Past, Present, and Future (blog); Authenticating; Hardening Guide - Authentication Mechanisms; Managing Service Accounts; Service Accounts; Configure Service Accounts for Pods; Role Based Access Control Good Practices. Also fetched, not referenced: User Namespaces (PSA relaxations).

## Duplicates
No KCSA question existed when this batch was written. KCNA already covers some of the same ground (PSA enforce/warn labels, PSP → PSA, enforce on a Deployment, NET_BIND_SERVICE in Restricted, projected token, automount off, `kubectl create token`, no User object). This batch tests other decisions on those topics (audit mode, version pinning, warn-only admission, existing Pods after enforce, automount precedence, audience-scoped tokens, binding semantics for users).

## Doubts and choices
1. **Bound token lifetime**: I didn't state "one hour" in any answer. The kube-apiserver flag `--service-account-extend-token-expiration` (default true, not fetched) can extend kubelet-injected tokens for legacy compatibility, so `kcsa-3a-sa-stolen-bound-token` only says "until it expires or the Pod it is bound to is deleted".
2. **Existing Pods after `enforce`** (`kcsa-3a-psa-enforce-existing-pods`): the namespace-labels page says that adding an enforce label tests existing Pods and returns violations as warnings. It doesn't say explicitly that they are not evicted. That conclusion comes from PSA acting at Pod creation (PSA page).
3. **`seccompDefault` kubelet setting** (`kcsa-3a-restricted-seccomp-explicit`): the field is named without a feature stage, because C-kcsa-1 found its stage inconsistent. The answer depends only on PSA evaluating the Pod spec.
4. **"No version of Baseline allows NET_ADMIN"** (two explanations): this comes from knowledge of the capability list's history. The v1.37 list was verified, the older lists were not.
5. **PodSecurityPolicy never reached `policy/v1`** and was cluster-scoped: stated from knowledge, not on a fetched page.
6. **`kubectl certificate deny`**: used as a distractor (it exists, and it can't revoke an issued certificate). Certificate non-revocation in v1.37 is verified on the Authenticating page.
