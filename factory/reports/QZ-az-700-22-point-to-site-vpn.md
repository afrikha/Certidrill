# QZ-az-700-22-point-to-site-vpn — notes

`content/az-700/quizzes/22-point-to-site-vpn.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.2.1 (q3), 2.2.2 (q1), 2.2.3 (q2, q10), 2.2.4 (q4), 2.2.5 (q7), 2.2.6 (q9), 2.2.7 (q6), 2.2.8 (q8), 2.2.9 (q5). Positions 6–10: single, yesno_statements, single, ordering, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Confirmed as written:**
  - SSTP retirement: SSTP can't be enabled since Aug 31, 2026, and connections stop after March 31, 2027 (source: "SSTP protocol retirement and connections migration").
  - The manually registered app ID retires on March 31, 2028 in Azure Public (March 31, 2029 in Government / 21Vianet).
  - One Audience value per gateway, the trailing slash on the Issuer, and no admin consent for the Microsoft-registered app.
  - The address pool is at least a /29 (active-passive) or a /28 (active-active).
  - Up to 20 root certificates.
  - RADIUS can't be reached through ExpressRoute.
  - Device tunnel: IKEv2 with a computer certificate, built-in client only, one per device.
- **Troubleshooting row "The network connection … could not be established" (IKEv2).** The P2S troubleshooting page gives only one cause: missing IKE fragmentation support on older Windows (KB updates plus the `DisableCertReqPayload` registry value). The page doesn't list "UDP 500 and 4500 blocked" for this message. The ports themselves are documented on the SSTP migration page. Reword the row, or cite the ports separately.
- **Basic SKU and SSTP.** The SSTP migration page says that "since November 2025, the Basic SKU supports IKEv2, and new Basic SKU VPN gateways use IKEv2 by default". The chapter's Basic row ("IKEv2 only") agrees, but the "128 SSTP" value for Basic only applies to old gateways that still use SSTP. It could be clarified.
- **Always On device tunnel.** The current Learn page says "Windows 10 Enterprise or Education version 1809 or later". It also notes that Microsoft recommends Windows 11 for P2S, because Windows 10 support ended in October 2025. The chapter just says "Windows Enterprise or Education, 1809 or later", which is fine. The Azure VPN Client is supported only on Windows 11.
- **Combinations of authentication types.** The tunnel/authentication table on "About Point-to-Site VPN" lists, for "IKEv2 and OpenVPN", only RADIUS, Azure certificate, Entra ID + RADIUS and Entra ID + certificate. It doesn't list RADIUS + certificate, nor all three together. Only OpenVPN alone accepts "any subset". The chapter says "several authentication types can be selected" without this limit. Worth adding, because exam scenarios combine these types.
- **RADIUS client registration.** Learn says to register the VPN gateway on the RADIUS server by "specify[ing] the virtual network GatewaySubnet". The chapter only says that the gateway is registered as a RADIUS client. Worth adding.
- The Microsoft-registered Entra page doesn't say that a custom app is the way to restrict users. It points to a separate "access based on users and groups" article. The chapter's statement on this point wasn't checked here, and the quiz doesn't test it.

## Doubts

- q5 (45 servers, so site-to-site rather than Azure Network Adapter) relies on the Learn sentence "You can also use Azure Network Adapter instead of a Site-to-Site VPN when you require only a few servers". The requirement "any server added later, minimal per-server configuration" decides the answer.
- q6: Learn ties the symptom of the native client failing on networks that allow only TCP 443 to the IKEv2 UDP ports (SSTP migration page), not to a specific error message. The stem therefore describes a timeout and quotes no error message.

## Design notes

- Decisions not used in the mock questions: the /28 pool for active-active, revoking one certificate by thumbprint, an in-place resize from VpnGw1AZ to VpnGw2AZ (the IKEv2/OpenVPN limit is shared), the RADIUS server by name rather than IP, ANA vs site-to-site at scale, falling back to the OpenVPN profile of the Azure VPN Client when IKEv2 is blocked, adding Entra ID next to certificates (one audience, no consent), the gateway settings for a device tunnel that keep Entra ID users, the audience migration order, and a combined design (VpnGw4AZ, IKEv2+OpenVPN, Entra ID+RADIUS, 3 IPs).
- SSTP appears only as a distractor, explained by its 2026 retirement. The manually registered app ID appears only as the starting state of q9.
