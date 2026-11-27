# Q-gcp-ace-2d — report

45 questions `gcpace-2d-*` in `content/gcp-ace/questions/planning/`: 2.3.3 = 8, 2.3.4 = 8, 2.3.5 = 8, 2.3.6 = 7, 2.4.1 = 7, 2.4.2 = 7. Types single 36, multi 9 (all stems end with "Choose two." or "Choose three."). Difficulty 14 easy / 23 medium / 8 hard.
Validation: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-2d-` → 45 files, 0 problem(s). `npm run content:validate -- --cert gcp-ace --prefix gcpace-2d-` → 0 problem(s), 4 warnings (references outside Google Cloud docs, see 4).

## Doubts and deviations

1. **Changing a VM's tier.** The page "Set the network tier" shows `gcloud compute instances update-access-config --network-tier`, but the GA gcloud reference (online and SDK 570) has no `--network-tier` on that command. The question `nst-existing-vm-change` uses `delete-access-config` + `add-access-config --network-tier=STANDARD` instead, which both exist.
2. **Health check ranges.** The health check page now lists only `35.191.0.0/16` for the global external Application Load Balancer (130.211.0.0/22 is no longer listed). I wrote no question that depends on those ranges.
3. **Tag binding permissions.** `tags-tag-user-app-team` relies on the docs' rule "Tag User on the tag value and on the target resource" and assumes that Compute Instance Admin (v1) includes `compute.instances.createTagBinding`. I could not check the role's permission list (the IAM roles page was too large to fetch).
4. **References outside docs.cloud.google.com** (validator warnings): geminicli.com (GEMINI.md, MCP servers), antigravity.google (Antigravity overview) and the GitHub README of Fabric FAST. No Google Cloud docs page covers these points.
5. **Gemini CLI / Antigravity.** On 2026-06-18, Antigravity CLI (`agy`) replaced Gemini CLI for unpaid and Google One users. Gemini Code Assist Standard/Enterprise users keep Gemini CLI, and the Google Cloud page says it "is not optimized for the latest Gemini models". The questions test only stable facts. The docs give no overall launch stage for Antigravity.
6. **Gemini Cloud Assist** is Preview. The explanations say so. Since 2026-04-10, investigations have been limited to Premium Support customers, so they are not tested here.
7. **Not used:** the global external passthrough Network Load Balancer (Preview), Deployment Manager (end of support 2026-03-31, used only as a wrong option), and the names of FAST stages (the first stage is now `0-org-setup`).
