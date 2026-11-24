# QZ-az-900-22-compute-networking — report

File: `content/az-900/quizzes/22-compute-networking.yaml` (10 questions). Check: `npx tsx factory/check-quiz.ts az-900 22-compute-networking` → 0 problem(s), 0 warning(s).

## Chapter out of date or wrong against current Learn

- **ExpressRoute Global Reach (section virtual-networking, VPN/ExpressRoute table, EN and FR)**: the chapter says ExpressRoute "reaches all regions of a geography, or worldwide with Global Reach". Per *What is Azure ExpressRoute?* (fetched), reaching regions **across geopolitical boundaries** needs the **ExpressRoute Premium** add-on. **Global Reach** links your **on-premises sites** to each other through their ExpressRoute circuits over the Microsoft network. Suggested fix: "reaches all regions of a geography (worldwide with the Premium add-on); Global Reach links your on-premises sites through the Microsoft network". The quiz only tests the part that is correct: access within the geography (q10 s3).
- Azure Virtual Desktop: the fetched *What is Azure Virtual Desktop?* page doesn't mention Microsoft Entra ID or MFA. That isn't wrong, and the AZ-900 module states it, but I didn't verify it and the quiz doesn't test it.

## Facts checked (pages fetched)

- Container Apps (*Comparing Container Apps with other Azure container options*): gives no direct access to the Kubernetes APIs, so use AKS when they're needed. ACI provides no scale, load balancing or certificates. App Service deploys code or containers. *Describe Azure containers* says Container Apps has "built-in load balancing and scaling". The *Azure Container Apps overview* page doesn't name load balancing explicitly.
- Private endpoint consumers include regionally and globally peered virtual networks (q9).
- A NIC must be in the same location and subscription as the VM and its virtual network (q5, q7). A public IP address is optional.
- Compute optimized sizes have a high CPU-to-memory ratio (q7).
- Availability sets: two or more VMs are needed for the SLA, and only one update domain is restarted at a time (q3). There is no retirement notice, but Learn recommends scale sets with Flexible orchestration.
- Azure Private DNS resolves names in virtual networks without a custom DNS solution (q10 s2).

## Doubts / unverified

- q4 (global peering vs network-to-network VPN): I didn't fetch the VPN Gateway page. The explanation says only that a VPN needs a gateway in each network, which costs more. It makes no claim about the VPN traffic path.
- q5: "the resource group region doesn't constrain its resources' regions" is standard knowledge. It isn't on the page I fetched.
- q9 (multi) uses `shuffle: false` so that VM1–VM4 stay in order. The correct answers are a and b.

## Mock-exam overlap

The 42 mock questions of 2.2.x already cover most single-fact decisions. The quiz tests other ones: container portability, NSG filtering, a custom image / AVD RemoteApp / lone VM in an availability set, global peering across regions, VM region vs resource group region, VM + function combination, size/disk/no public IP, Container Apps vs ACI vs AKS vs App Service vs VM, private endpoint reached from a peered VNet with the public endpoint disabled, VNet single region / private DNS zone / ExpressRoute geography.
