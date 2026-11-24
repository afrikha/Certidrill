# QZ-az-140-11-networking — notes

`content/az-140/quizzes/11-networking.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.1 (q2, q3), 1.1.2 (q1, q6, q7), 1.1.3 (q5, q10), 1.1.4 (q4, q8), 1.1.5 (q9). Positions 6–10: single, hotarea, dragdrop, dropdown (kusto), dropdown (text).

## Chapter vs current Learn (to fix in the chapter, not done here)

- **"RDP" is becoming "Direct Stream (DS)" on some Learn pages.** The bandwidth page (`rdp-bandwidth`) now has the H1 "Direct Stream (DS) bandwidth requirements" and writes "DS Shortpath for managed networks". The proxy page writes "DS data" and "DS Shortpath", and the connectivity page says "the client starts the DS handshake". The RDP Shortpath, Configure RDP Shortpath and QoS pages still say "RDP Shortpath", and the July 2026 study guide says RDP. The chapter and the quiz keep RDP. The certification needs a decision, and the chapter's reference title for `rdp-bandwidth` is probably out of date.
- Host pool RDP Shortpath options: Configure RDP Shortpath gives the default as "Default (enabled)" for each of the four options. The chapter says "Enabled", which is close enough. The page doesn't list the other values of the drop-down. q10 uses "Enabled"/"Disabled".
- Confirmed as written: 150 ms RTT target (Prerequisites); VNet in the same region as session hosts and created in advance; the bandwidth table, including the AVC 444 figures; gateway selection in 10 ms groups; TLS 1.2 minimum, up to TLS 1.3; CA-issued RDP certificates aren't supported; the three host pool and two workspace public access options; private endpoints in the same region as the VNet and session hosts; restart of RDAgentBootLoader; QoS only for managed networks, DSCP 46, end to end; proxy guidance (bypass, no SSL termination, no authenticating proxy, a proxy as the only path forces TCP); `IsClientPrivateLink` and `IsSessionHostPrivateLink` in WVDConnections.

## Not verified on a fetched page

- The Connection Information label for **managed networks with ICE/STUN** isn't documented. q10 uses descriptive options ("Direct UDP to the listener on UDP 3390", etc.) instead of labels for this reason, and no prompt depends on that path.
- q10 relies on the RDP Shortpath statement that Azure NAT Gateway is a symmetric NAT, so "you can use a relayed connection with TURN". The quiz reads it as: a direct STUN path fails even with a cone NAT on the client. Learn doesn't describe the client-cone/host-symmetric case explicitly.
- q9: the type of `IsClientPrivateLink` is `string` and Learn doesn't give its literal values. The query uses `=~ "false"` (case-insensitive) to be safe. That WVDConnections has one record per state (and that `count()` therefore over-counts) comes from the chapter. The table reference only documents `State` as "The state of the connection".
- q6: "user sign-ins are slow" comes from the proxy page ("increases the service response time, making it take longer for users to sign in").

## Terminology

- The mock-exam bank writes « RDP Shortpath pour les réseaux **managés** », but the chapter writes « réseaux **gérés** ». The quiz follows the chapter. Please harmonise (glossary entry).
- « Policy-based QoS » : the chapter writes « QoS basée sur la stratégie » and « QoS basée sur une stratégie ». The quiz writes « stratégie de QoS basée sur une stratégie (Policy-based QoS) ».

## Design notes

- Decisions not in the mock exam: how the session host joins a reverse connect session, the RTT target, an AVC 444 Excel/video calculation, `connection` + `feed` without `global`, QoS limits (home users, TCP fallback), a proxy with TLS inspection and authentication, choosing a VNet (region + DNS + peering + outbound), mapping public access settings to requirements (including a workspace), a KQL count of client-side public routes with `dcount(CorrelationId)`, and predicting transports with TURN disabled behind NAT Gateway.
