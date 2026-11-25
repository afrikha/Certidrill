# QZ-az-700-14-vnet-connectivity — notes

`content/az-700/quizzes/14-vnet-connectivity.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.3.1 (q2, q7), 1.3.2 (q1, q4, q6), 1.3.3 (q3, q5, q8, q9, q10). Positions 6–10: yesno, single, single, yesno, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Preview features presented as GA** (section virtual-network-manager): "Connectivity configurations in Azure Virtual Network Manager" marks two items as **preview**. The first is a Virtual WAN hub used as the hub of a hub-and-spoke configuration ("no SLA, not recommended for production"). The second is the high-scale connected group (up to 3,000 VNets), which needs the `AllowHighScaleConnectedGroup` feature and an enablement form. The chapter states both without a preview mention.
- **Connected group default of 250 VNets**: the connectivity page I fetched doesn't give this figure, only 3,000 with the preview. Not verified. The quiz doesn't use it.
- **Enforce peering (`peeringEnforcement`)**: the page doesn't say whether it is preview or GA. The quiz uses it only as a distractor (q8, q10).
- **Cross-tenant network groups "static only"**: "What is a network group in Azure Virtual Network Manager?" doesn't say this, and I didn't verify it elsewhere. Not used.
- **Gateway transit order**: the chapter says to create the gateway first, then set both sides. Learn ("Create, change, or delete Azure virtual network peering") says the hub option needs a gateway or Route Server, and the spoke option can be enabled only if the hub allows gateway transit. The PowerShell sample on "Configure VPN gateway transit for virtual network peering" creates the spoke link with `-UseRemoteGateways` before the hub link with `-AllowGatewayTransit`. So the hub-before-spoke order isn't strict when both links are created together. I dropped an ordering question for this reason. The mock questions don't depend on it.
- **"Except Basic" for gateway transit**: confirmed on the gateway transit page. The VPN Gateway FAQ says the Basic VPN SKU isn't retiring, but new gateways must use a Standard public IP. No quiz question uses Basic.
- **Spoke prefixes on the on-premises device** (section service-chaining): no Learn page states this rule for gateway transit in general. q7 relies on the VPN Gateway FAQ rule for `UsePolicyBasedTrafficSelectors`: the device must define every combination of on-premises and Azure prefixes. That rule makes the answer defensible.
- **French**: the FR chapter uses « appairé », « appairer » and « Après l'appairage » throughout. The shared glossary says to avoid « appairage » and to use « peering » / « relié par peering ». The chapter also writes « route définie par l'utilisateur » and « routes » for UDRs, while the guide asks for « itinéraire ». The quiz follows the guide.

## Facts checked for the quiz

- q1, q4, q6: "Create, change, or delete Azure virtual network peering" covers nonoverlapping address spaces, re-downloading point-to-site clients after peering, and the `VirtualNetwork` tag including the peered network when access is allowed. It says to clear the access setting rather than delete the peering, and that deleting a peering also deletes the remote peering.
- q2: when VNets are connected by both peering and a gateway connection, traffic uses the peering (peering overview and manage-peering pages).
- q3, q8: the mesh creates a connected group with the next hop `ConnectedGroup`. Overlap is allowed by default, and the overlapping range is removed with its traffic dropped. `ConnectedGroupAddressOverlap: Disallowed` blocks such members.
- q5: goal-state deployments. After you modify one configuration, you must deploy all the configurations of the region again ("Manage configuration deployments in Azure Virtual Network Manager").
- q9: overlapping scopes are allowed only with different features. A management group scope needs Microsoft.Network registered at that management group. The portal does this, CLI and PowerShell don't.
- q10: per spoke group, direct connectivity and Use hub as a gateway. Delete existing peerings removes non-matching peerings, including manual ones.

## Design notes

- Mock-exam decisions avoided: Initiated status, sync after resize, cross-tenant requirements, CLI transit flags, own gateway in a spoke, transit topology, NVA chaining settings, firewall chaining with an ExpressRoute hub, AVNM order of steps, dynamic membership by policy, direct connectivity for one group, and redeployment after a change.
- New decisions: overlapping address spaces, peering preferred over VNet-to-VNet, the ConnectedGroup next hop, point-to-site client re-download, which configurations to commit, peering settings and deletion, policy-based traffic selectors for a new spoke, the overlap guard of a mesh, scope/feature overlap and provider registration, and the scope, dev group settings and peering cleanup of an AVNM design.
- No preview feature is a correct answer.
