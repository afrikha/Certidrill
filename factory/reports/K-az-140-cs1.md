# K-az-140-cs1 — report

3 case studies, 17 questions (prefix `az140-cs1`), all `status: draft`.

| Case study | Architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| az140-cs1a-humongous-insurance | Insurance contact centers, hybrid AD DS, ExpressRoute, pooled Windows 11 multi-session, hybrid joined | profile-share (1.2.4 ordering 2), shortpath (1.1.3 multi 3), fslogix-registry (3.1.2 dropdown 2), autoscale (4.1.5 yesno 2), transport-kql (1.1.5 dropdown 1), app-attach-share (3.3.9 single 2) |
| az140-cs1b-lucerne-publishing | Publisher, cloud-only Entra ID, Entra joined GPU personal desktops | role-assignments (2.1.3 dragdrop 2), single-sign-on (2.1.7 multi 2), mfa-policy (2.1.4 single 3), direct-assignment (3.2.11 dropdown 2), personal-scaling (4.1.5 single 1), desktop-backup (4.2.5 yesno 2) |
| az140-cs1c-alpine-ski-house | Ski resorts, Entra Domain Services, pooled RemoteApp, external agents, active-passive DR with Cloud Cache | identity (2.1.1 single 1), licensing (1.3.3 dropdown 2), app-groups (3.3.2 yesno 2), cloud-cache (3.1.4 dropdown 3), rdp-properties (3.2.8 single 1), disaster-recovery (4.2.3 multi 3) |

Difficulty: 4 easy / 10 medium / 3 hard. Validator: 21 files, 0 problem(s).

## Facts not verified on a fetched page (from general knowledge; please spot-check)

- az140-cs1b-desktop-backup s1/s3: Standard VM backup policy runs at most once a day; a Recovery Services vault protects only VMs in its own region. The fetched Enhanced policy page confirms 4-hour schedules and no switch back to Standard.
- az140-cs1a-fslogix-registry: meaning of FlipFlopProfileDirectoryName (user name first, then SID) and DeleteLocalProfileWhenVHDShouldApply. The fetched Cloud Cache tutorial lists both as recommended values without describing them.
- az140-cs1b-direct-assignment: the value `Direct` for `-PersonalDesktopAssignmentType` (the cmdlet page lists no accepted values; the portal option names are Automatic and Direct).
- az140-cs1c-cloud-cache: ProfileType 2 = read-only only and 3 = read-write else read-only (the BCDR article only says to set 0 to prevent concurrent access).

## Design choices

- Private Link was left out of Humongous on purpose: RDP Shortpath over Private Link needs the extra "Allow Direct UDP network path over Private Link" opt-in, which would make the Shortpath question ambiguous.
- App attach was kept out of Alpine Ski House because the App attach overview says Microsoft Entra Domain Services isn't supported.
- Per Learn (fetched 2026-11-17): SSO service principal is "Windows Cloud Login" (270efc09-...); WVDConnections has a TransportType column (Shortpath, TURN, Websocket), not UdpUse.
- WebFetch budget (shared) was briefly exhausted once; no fact was written without a later fetch except those listed above.
