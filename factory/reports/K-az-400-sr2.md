# K-az-400-sr2 — report

5 Yes/No series, 3 questions each (15 questions), one per domain:

| Series | Objective | Answers |
| --- | --- | --- |
| az400-sr2-boards-github | 1.3.5 | Yes, No, No |
| az400-sr2-lfs-assets | 2.2.1 | No, Yes, No |
| az400-sr2-feature-flags | 3.4.6 | No, Yes, No |
| az400-sr2-secure-files | 4.2.3 | Yes, No, No |
| az400-sr2-kql-failures | 5.2.4 | No, Yes, No |

Difficulty: 4 easy, 8 medium, 3 hard.

## Notes and deviations

- Objectives were chosen without knowing the choices of the parallel task K-az-400-sr1; check for overlap with its series.
- Git LFS commands (`git lfs install`, `git lfs track`) are standard but not printed on the Learn page used as reference (Manage and Store Large Files in Git); the SSH limitation and web-upload pitfall are from that page.
- az400-sr2-secure-files-3: the claim that the project build service identity is shared by all pipelines of the project is general Azure Pipelines knowledge, not re-verified (web fetch limit reached). The Universal Packages task name was left out because it could not be verified.
- az400-sr2-boards-github-3: GitHub's `#ID` reference behavior comes from GitHub docs knowledge (not a Learn page).
- French portal labels (Rollout, Audience, Override by Groups, Pipeline permissions, Open access, Approvals and checks) kept in English per the guide.
