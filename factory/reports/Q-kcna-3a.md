# Q-kcna-3a — KCNA questions, domain delivery (2026-11-23)

## Result
51 `single` questions in `content/kcna/questions/delivery/kcna-3a-*.yaml`: 3.1.1 ×11, 3.1.2 ×10, 3.1.3 ×10, 3.1.4 ×10, 3.1.5 ×10. Difficulty 20 / 23 / 8 (39 % / 45 % / 16 %). Correct answers: a 12, b 14, c 14, d 11. English only.
`CERT=kcna npx tsx factory/validate.ts --prefix kcna-3a-`: 0 problems; `npm run content:validate -- --cert kcna --prefix kcna-3a-`: 0 problems, 0 warnings.
No other KCNA questions existed when this batch was written, so there were no duplicates to check.

## Sources fetched (WebFetch, 2026-11-23)
kubernetes.io: Deployments (strategy types, maxSurge rounds up / maxUnavailable rounds down, 25 % defaults, both not 0, rollout only on Pod template change, change-cause, undo --to-revision, pause/resume, revisionHistoryLimit), kubectl rollout, rollout restart, rollout history, Managing Workloads (canary with two Deployments and `track` label, rolling update), Kustomize task page (generators and hash suffix, namePrefix, images, base and overlay, `-k`), Images (tags vs digests, avoid `:latest`), ConfigMaps, kubeconfig page.
helm.sh: Introduction to Helm (chart/release/repository, release records in Secrets, Helm 4.3.1 docs), Using Helm (`--set` beats `-f`, rollback, revisions), Charts, Changes Since Helm 2 (Tiller removed), helm template.
glossary.cncf.io: Blue Green Deployment, Canary Deployment, Continuous integration (CI), Continuous Delivery (CD), Continuous Deployment (CD), GitOps, Immutable Infrastructure.
Others: OpenGitOps PRINCIPLES.md (github.com), Argo CD home and Automated Sync Policy (prune and selfHeal off by default), Argo Rollouts, Flux components and core concepts, Gateway API traffic splitting (weights are proportional, default 1), cncf.io project pages (Argo graduated 2022-12-06, Flux graduated 2022-11-30, Helm graduated 2020-05-01).

## Doubts and choices
1. **Reference titles**: written without the site suffix (for example "Deployments", not "Deployments | Kubernetes"), like the Learn titles of the other banks. The OpenGitOps reference uses the GitHub page title "documents/PRINCIPLES.md at main · open-gitops/documents" (opengitops.dev is not an accepted host).
2. **CI glossary title** has a lowercase "integration" ("Continuous integration (CI)"), as the fetch reported; the two CD entries are capitalized.
3. **kcna-3a-blue-green-selector**: no fetched page describes the blue-green "switch the Service selector" technique. The reference is the CNCF glossary (two environments, traffic switched). The course chapter describes the selector switch.
4. **kcna-3a-pipeline-order** and **kcna-3a-ci-output** rely on general CI practice (tests, then build, push, deploy). The glossary only says CI ends with a tested artifact ready for CD. Image scanning is deliberately not tested because no fetched source covers it.
5. **Flux reconciliation interval**: the Flux core concepts page reported a default of five minutes for `Kustomization`, but the field is usually required in the API. No question uses the number.
6. **Gateway API weights (kcna-3a-httproute-weights)**: the Gateway guide calls the 90/10 split "blue-green style" while the CNCF glossary calls a small traffic share a canary. The question asks only for the traffic share, not for the strategy name.
7. **Boundary with 3.2.5** (debug a failed rollout): `ProgressDeadlineExceeded` and debugging failures are left to the debugging batch. Only the exit-code behaviour of `kubectl rollout status` is used (kcna-3a-rollout-status).
