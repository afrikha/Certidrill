# QZ-az-104-33-containers — doubts and notes

Quiz: `content/az-104/course/quizzes/33-containers.yaml` (10 questions; check-quiz 0 problem, 0 warning).

## Chapter facts that look stale (checked on Learn, 2026-11-24) — for the chapter owner

- **Registry login server.** "Quickstart - Create Registry - Azure CLI" now describes domain name label (DNL) protection: the login server is `registryname-hash.azurecr.io` for every DNL scope except `Unsecure` (`registryname.azurecr.io`). The chapter only shows `<name>.azurecr.io`. The same page says the name is 5–50 **lowercase** alphanumeric characters and that dashes aren't permitted. The chapter says "alphanumeric" but doesn't say lowercase.
- **Zone redundancy.** The SKU page ("Azure Container Registry SKU Features and Limits") lists availability zones as supported in Basic, Standard and Premium, and says zone redundancy is on by default in supported regions. The chapter lists zone redundancy as Premium-only.
- **Content trust.** The SKU page still lists it as Premium-only, but WRITING_GUIDE lists Docker Content Trust as being retired. The chapter still names it as a Premium feature.
- **ACI NGroups.** "Serverless containers in Azure" mentions NGroups, which keep a set number of container groups running. This is not autoscale, so the chapter's "no autoscale" rule still holds. The quiz doesn't use NGroups.
- **FR terms in the chapter.** `<nom>.azurecr.io/<dépôt>:<étiquette>` uses « dépôt » and « étiquette ». The glossary prefers « référentiel », and the guide says « balise » for image tags. The quiz uses « référentiel » and « balise ».

## Facts used in the quiz that I inferred rather than read word for word

- Q5 (option b): "an Azure Monitor autoscale setting can't target an ACI container group" rests on the chapter and the Learn pages, which say ACI has no autoscale. I didn't fetch the Azure Monitor autoscale page that lists the supported resource types.
- Q8 s2: the file share keeps the data after the group is deleted. Learn says a mounted Azure Files volume persists state "beyond the lifetime of the container" because it is an external store. Deleting the group doesn't delete the share, but no page says this in those words.
- Q4 (option c): the explanation only says that TCP transport is for non-HTTP apps. I didn't check how TCP ingress handles TLS.
- Q10: "By default, … all traffic is routed to the latest deployed revision" (Traffic splitting page). The ordering depends on this sentence: traffic must be pinned to v1 before v2 is deployed.

## Overlap with the mock exam

The decisions already tested by the c3-* and case-study questions were avoided: Premium for geo-replication/private endpoints, ACR roles, admin user, schedule CLI, OnFailure, Azure Files CLI, resize = recreate, Windows sidecar, ACI managed identity, internal ingress, revision-scope dragdrop, scale hotarea, Service Bus rule, scale to zero, separate environments, traffic-split CLI, internal environment, CPU/memory combinations. Q10 shares the topic of c3-aca-traffic-split-cli (traffic weights), but it tests a different trap: by default, traffic goes to the latest revision, and test URLs come from labels.
