# QZ-az-700-11-vnets-subnets — report

File: `content/az-700/quizzes/11-vnets-subnets.yaml` (10 questions, objectives 1.1.1–1.1.5). Check: `npx tsx factory/check-quiz.ts az-700 11-vnets-subnets` → 0 problem(s), 0 warning(s).

## Chapter versus current Learn (chapter not edited)

- **Private subnet status.** The chapter (and quiz Q9) treat the private subnet / `defaultOutboundAccess = false` as current behavior. "Default Outbound Access in Azure" (fetched Nov 2026) describes it without any preview label and confirms the March 31, 2026 API change, but "Add, change, or delete a subnet" still says "This feature is in Preview" for the private subnet setting. Learn contradicts itself; the more recent, dedicated page was followed.
- **Multiple address prefixes on a subnet.** The chapter presents it as an available capability. "Create multiple prefixes for a subnet" has no preview/GA label (portal support limited). Not used as a correct answer (Q8 uses it only as a wrong option, for a delegated subnet, which the page explicitly excludes). Status to confirm.
- **Private subnet limitations missing from the chapter** (worth a line): routes with next hop `Internet` break in a private subnet; private subnets don't apply to delegated/managed subnets; VMs in a private subnet can still reach Azure Storage in the same region.
- **French wording.** The FR chapter uses « appairés » / « appairé » (lines 12, 16, 197), which the glossary and the writing guide say to avoid (use « reliés par peering » / « avec peering »).
- **CLI flag not verified.** `az network vnet subnet update --default-outbound false` (chapter) could not be checked on Learn (CLI tab not returned); not used in the quiz.
- `virtual-networks-faq` gives the largest subnet as /2 (likely a typo on Learn); not used.

## Doubts and choices in the quiz

- Q6: an Azure Container Apps environment is stated as needing a dedicated subnet delegated to `Microsoft.App/environments` ("Configure Virtual Networks in Azure Container Apps Environments").
- Q7: the scale set is stated as creating no extra instances during scale-out or upgrades, to remove overprovisioning/surge from the count.
- Q10: SQL MI minimum /27 (32 addresses) is the documented minimum; Learn recommends larger subnets in practice. The stem says "the smallest size that its service supports" to keep one answer. Firewall Management NIC can now also be enabled on an existing firewall (stop/start), not only at creation; the question doesn't depend on it.
- Mock-exam questions read (az700-1a-01 to 1a-25, cs3b-research-vnet): no scenario or decision reused; Q8 shares with 1a-17 the topic "delegated subnet" but tests the opposite decision (NSG and route table allowed).
