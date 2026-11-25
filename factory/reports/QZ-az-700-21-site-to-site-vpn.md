# QZ-az-700-21-site-to-site-vpn — notes

`content/az-700/quizzes/21-site-to-site-vpn.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.1.1 (q10), 2.1.2 (q3), 2.1.3 (q5), 2.1.4 (q7), 2.1.5 (q1), 2.1.6 (q4), 2.1.7 (q6, q9), 2.1.8 (q8), 2.1.9 (q2). Positions 6–10: single, yesno_statements, multi, ordering, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Policy-based traffic selectors and the default policy: the chapter contradicts itself, because Learn does.** Section 2.1.4 says the option "is part of the custom IPsec/IKE policy: specify the full policy". That matches "Connect VPN gateways to multiple on-premises policy-based VPN devices", which says "You need to create an IPsec/IKE policy in order to enable 'UsePolicyBasedTrafficSelectors'". Section 2.1.6 says the selectors "can also be set with the default policy". That matches the portal how-to `ipsec-ike-policy-howto`: "Policy-based traffic selector and DPD timeout options can be specified with Default policy, without the custom IPsec/IKE policy". The chapter should say that the PowerShell path needs the full custom policy and the portal accepts the Default policy. I kept this point out of the quiz.
- **NAT limits that are missing from the chapter.** NAT rules aren't supported on connections that use policy-based traffic selectors, on policy-based VPNs or with APIPA BGP addresses. A dynamic rule can be linked to only one connection, and its external mapping is /26 at most. Each rule has one prefix. Rules must be linked when the connection is created (nat-howto), and there are at most 500 rules per gateway. These limits are worth adding to the 2.1.1 NAT row.
- **Gen2 upgrade.** `gateway-sku-upgrade` says gateways that already use a Standard IP "will be seamlessly upgraded to Gen2 during regular service updates before September 2026". So the "(Gen1)" labels for VpnGw1AZ to VpnGw3AZ in the 2.1.2 table may be out of date. Recheck the "About gateway SKUs" table, which still lists Gen1 rows for 1AZ to 3AZ.
- **Extended network.** Learn says the extension "isn't currently available on the extension feed in Windows Admin Center version 2410" (the chapter says this too, and the page was last updated in 2025-05). q2 uses the Extended network extension as its correct answer because it is the only documented tool. Recheck that it is still available before publishing. The Learn intro also describes "two Windows Server 2019 VMs", while its requirements ask for Windows Server 2022 Azure Edition in Azure. The chapter follows the requirements.
- **French chapter.** It uses « s'appaire en APIPA », which goes against the glossary rule (« peering », not « appairé »), and « actif-passif » next to « actif/actif ». The mock questions use « actif/passif » and « périphérique VPN ». The glossary entry is `device` = « appareil », so the mock questions are the ones that differ. The quiz uses « appareil » and « actif/passif ».

## Doubts / not fully explicit on a fetched page

- q7 s1 (Branch1, BGP, reaches the gateway-transit spoke = Yes): the gateway-transit page says S2S connectivity "applies to all three virtual networks" and that gateway routes propagate to the spokes. It doesn't say explicitly that the spoke prefixes are advertised to on-premises BGP peers. That this happens is standard behaviour.
- q10: Learn doesn't say whether the local network gateway address space of a NAT-translated site holds the pre-NAT or the post-NAT prefixes. I kept that point out of the slots.
- q8: the "Use remote gateways" wording follows the glossary. The portal now shows "Enable '<spoke>' to use '<hub>'s' remote gateway or route server".

## Design notes

- Decisions not used in the mock questions: the local network gateway address space without the device IP, where Extended network is managed, Basic to BGP (delete and re-create), DHGroup2048 and the fixed Main Mode lifetime, a second site (a new local network gateway and a new connection), custom APIPA BGP addresses, no transit for policy-based selector sites (to a spoke or to another site), the "Connected but spoke unreachable" causes, active-standby to active-active with BGP IP changes, and NAT design (SKU, Ingress+Egress, Static, per-connection linking).
- No preview or retired feature is a correct answer.
