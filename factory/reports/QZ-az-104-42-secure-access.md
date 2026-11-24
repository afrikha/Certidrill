# QZ-az-104-42-secure-access — doubts and notes

Quiz: `content/az-104/course/quizzes/42-secure-access.yaml` (10 questions, objectives 4.2.1–4.2.5 each tested twice). Checker: 0 problem(s), 0 warning(s).

## Facts used that the chapter doesn't state (all verified on Learn, in the study-guide scope)

- **Q10 s2**: when the bastion is in a peered virtual network, the user also needs **Reader on the virtual network of the target VM** (Azure Bastion FAQ; "VNet peering and Azure Bastion architecture"). The chapter (Bastion section) lists only VM, NIC and Bastion resource. Suggest adding the fourth role to the chapter.
- **Q10 s1**: Bastion works across peered virtual networks in different subscriptions of one tenant (Bastion FAQ). Not in the chapter.
- **Q10 s3**: relies on peering being non-transitive (chapter 41, objective 4.1.2), combined with Bastion.
- **Q8**: SQL virtual network rules can reference a subnet of another subscription only in the same Microsoft Entra tenant, with Microsoft.Sql registered (SQL "Virtual Network Endpoints and Rules" page). The chapter only gives the same-region rule.
- **Q9**: the on-premises conditional forwarder targets the **inbound endpoint** of Azure DNS Private Resolver (resolver overview). The chapter says only "DNS forwarder or Azure DNS Private Resolver".

## Inferences (not stated word for word on Learn)

- **Q9, link slot**: the zone must also be linked to VNet-Hub because the resolver answers through the Azure-provided DNS (168.63.129.16) of its own virtual network. Learn says to link the zone to every hub and spoke VNet with clients and that the resolver resolves via 168.63.129.16; it doesn't say "the resolver's VNet must be linked" literally. That is standard practice.
- **Q9, fwd slot**: no Learn page I fetched says outright that 168.63.129.16 can't be reached from on-premises; the explanation therefore rests on the resolver overview (forward to the inbound endpoint IP).

## Terminology and consistency

- Storage portal option is **Disable** (page "Set the default public network access rule: Azure Storage"); the chapter writes "Disabled". Q4 uses Disable, in English in both languages.
- The FR chapter uses « appairé(s) »; the writing guide asks for « peering ». The quiz uses « relié par un peering ». The chapter should be harmonised.
- `content/glossary.yaml` typography mentions the typographic apostrophe; BRIEF rule 5 asks for straight apostrophes. Straight apostrophes used.
