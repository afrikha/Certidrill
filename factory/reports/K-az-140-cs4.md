# K-az-140-cs4 — CASES, AZ-140

Files (all `status: draft`):

- `content/az-140/case-studies/az140-cs4a-woodgrove-bank.yaml` — retail bank contact center, AD DS domain-joined pooled hosts, Image Builder + Compute Gallery, Bastion, Teams.
  - `infrastructure/az140-cs4a-image-builder` (1.5.2, ordering, d2)
  - `infrastructure/az140-cs4a-gallery-version` (1.5.7, dropdown json, d3)
  - `identity-security/az140-cs4a-bastion` (2.2.5, single, d1)
  - `identity-security/az140-cs4a-app-control` (2.2.6, yesno, d2)
  - `user-apps/az140-cs4a-time-limits` (3.2.9, dropdown text, d2)
  - `user-apps/az140-cs4a-teams` (3.3.7, multi choose 3, d3)
- `content/az-140/case-studies/az140-cs4b-proseware.yaml` — software publisher, cloud-only Microsoft Entra joined hosts, personal + pooled RemoteApp, App attach, FIDO2.
  - `infrastructure/az140-cs4b-host-pool-ps` (1.4.2, dropdown powershell, d2)
  - `identity-security/az140-cs4b-webauthn` (2.1.5, single, d1)
  - `user-apps/az140-cs4b-app-attach-package` (3.3.10, ordering, d2)
  - `user-apps/az140-cs4b-onedrive` (3.3.6, yesno, d2)
  - `monitoring/az140-cs4b-drain` (4.1.6, multi, d1)

Check: `CERT=az-140 npx tsx factory/validate.ts --prefix az140-cs4` → 13 files, 0 problem(s).

Objectives were chosen among those not yet used by the cs1–cs3 case studies (images, Bastion, App Control/CFA, time limits, Teams, PowerShell creation, WebAuthn, App attach packaging, OneDrive, session management).

## Deviations / notes

- Woodgrove covers 3 domains (no monitoring question); Proseware covers 4.
- The web search budget of the turn was exhausted early; all facts come from pages fetched with WebFetch (see each question's references) or from the AZ-140 course chapters, which agree.
- Two topics overlap standalone questions of other agents (`az140-4b-rs-gallery-json`, `az140-3c-onedrive-kfm`); the case versions were changed to test different values (80 hosts → 4 replicas, excludeFromLatest; OneDrive yes/no on silent sign-in / wizard / per-folder default).

## Not confirmed by a fetched page (general knowledge, low risk)

- `replicationRegions` as the (older) Image Builder distribution property, used only in a distractor explanation.
- `-AgentUpdateType Scheduled` value (the parameter is on the cmdlet page; the value list isn't).
- Personal host pools use the `Persistent` load-balancing type (shown in cmdlet examples, not stated as a rule on the fetched pages).
- `Remove-AzWvdUserSession` ending the session: the cmdlet page only says it "removes/deletes" a user session.
- Woodgrove's image flow (Image Builder → managed image → gallery version by ARM template): the security type of win11-ms-agents is not stated; if the definition is TrustedLaunchSupported, check that a version sourced from a managed image is accepted.
- Public CA code-signing chain trusted by default on session hosts (from the course chapter 34).
