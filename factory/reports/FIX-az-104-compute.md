# FIX-az-104-compute — chapters 31 to 34 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-104 31-arm-bicep 32-virtual-machines 33-containers 34-app-service` 0 problems; `content:validate --cert az-104` 0 problems, 0 warnings; `check-quiz az-104` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed.

## 31-arm-bicep (QZ report: doubts, and facts the quiz relies on)

| Finding | Learn | Change |
| --- | --- | --- |
| `New-AzSubscriptionDeployment` not re-verified | Confirmed: templates/deploy-to-subscription uses it (its own cmdlet page doesn't load; New-AzDeployment's page doesn't mention it) | None |
| Q7: a child resource gets no implicit dependency on its parent | Confirmed (templates/resource-dependency) | modify-arm: JSON child resource needs `dependsOn` on the parent |
| Q6: `reference()` creates a dependency | Confirmed, but only when the resource is referenced by name, not by resource ID | Function table, `reference()` row |
| Q8: subnets in the `subnets` property survive a redeployment | Confirmed (deployment-modes) | modify-bicep: new paragraph. Also says that a Bicep nested child gets an implicit dependency (bicep/resource-dependencies) |
| Q8: `(item, index)` loop syntax | Confirmed (bicep/loops) | Bicep table, loop row |
| Q10: complete mode with copy loops and conditions | Confirmed: resources missing once the loop is resolved are deleted; a resource whose condition is false is deleted with API 2019-05-10+ (current CLI/PowerShell). Complete mode "will be gradually deprecated" (no date given) | deploy-templates paragraph |
| FR: « What-if » in prose | Glossary: « opération de simulation » | FR prose only |

## 32-virtual-machines

| Finding | Learn | Change |
| --- | --- | --- |
| ADE unsupported sizes | Confirmed (disk-encryption-windows Restrictions and disk-encryption-overview): Basic, A-series, v6 with a temp disk, v7 and newer, L family, less than 2 GB of memory; Ultra Disk and Premium SSD v2 can't be encrypted. Note: the overview says "v6 series" without "with temp disks", but the Restrictions list (followed here) says "with temporary disks" | ADE requirements bullet |
| Key vault in the same region and tenant or subscription | Learn is inconsistent: the overview says region and **subscription**, the key-vault page says region and **tenant** | None (the chapter follows the overview). Needs a human decision |
| v5+ sizes encrypt the temp disk automatically | Confirmed (managed-disks-overview) | disk-encryption section: new sentence |
| NewestVM/OldestVM balance zones first | Confirmed (scale-in-policy) | Scale-in policy row |
| Instance protection | Confirmed: scale-in protection = autoscale scale-in; scale-set-actions protection adds upgrade/reimage/deallocate; user deletes are not blocked. Manual capacity reduction isn't documented, so not stated | Instance protection row |
| Quotas count deallocated VMs | Confirmed (quotas: "both allocated and deallocated") | Resize bullet |
| Windows temp-disk resize rule | Confirmed (resize-vm) | New resize bullet |
| Single VM 99.9 % SLA (and zones 99.99 %) | **Not confirmed**: no fetched Learn page gives these. Only 99.95 % for availability sets is on Learn. The figures come from the SLA document, which isn't on Learn | None. Flag for review |

## 33-containers

| Finding | Learn | Change |
| --- | --- | --- |
| Login server and DNL | Confirmed (CLI and portal quickstarts, no preview label): `<name>-<hash>.azurecr.io` for every DNL scope except Unsecure, scope fixed at creation; name is 5-50 lowercase alphanumeric characters, no dashes. The default scope isn't stated | acr section: name rule and login server. The code still uses `crcontoso.azurecr.io`, and the prose says the examples use a registry without a DNL hash |
| Zone redundancy is Premium-only | Wrong: SKU page says all tiers, on by default in supported regions | Removed from Premium row; new sentence |
| Content trust | Retiring: can't be enabled on new registries since May 31, 2026; removed March 31, 2028 (content-trust page; the SKU and intro pages still list it as Premium with no note) | Removed from Premium row; retirement sentence. Premium row now lists customer-managed keys (SKU page). Added: geo-replications must be deleted before moving down from Premium |
| NGroups | No change (not autoscale; the "no autoscale" rule stands) | None |
| FR « dépôt » / « étiquette » | Glossary « référentiel »; questions guide « balise » for image tags | `<référentiel>:<balise>`, « manifestes sans balise », « images conteneur » (glossary) |

## 34-app-service

| Finding | Learn | Change |
| --- | --- | --- |
| Linked databases (already done) | Re-checked: dates still match manage-backup | None |
| Custom backup details | Confirmed: 10 GB, at most 4 GB of it linked database; every 2 hours at most, 12 backups a day (manual and scheduled); 0-30 days or indefinite, on-demand backups kept indefinitely. Automatic backups: 30 days, all hourly backups for days 1-3, then every third, then every sixth from day 15 | Backup table: size and frequency/retention rows |
| TXT `asuid` not strictly required | Confirmed (custom-domain tutorial: "not absolutely required", highly recommended against subdomain takeover) | custom-domain: new paragraph |
| Wildcard doesn't validate subdomains that have their own CNAME | Confirmed (migrate-domain note: "you might need" a TXT per subdomain) | Same paragraph |
| FR | Questions guide: « approuver », « peering »; glossary « image conteneur » | « approuver un point de terminaison distant », « réseaux connectés par peering », « image conteneur » |

## Mock-exam bank questions changed

- `questions/compute/c4-domain-dns-records.yaml` (EN + FR explanation): "Each custom domain also needs a TXT record" became "should also have a TXT record … not absolutely required, but highly recommended because it prevents subdomain takeovers". The answer doesn't change.

Checked and left unchanged: the ACR questions (c3-acr-*, cs1-litware-03; none relies on zone redundancy, content trust or the login-server format), the encryption questions (c2-enc-*, comp-ade-steps, cs1-adatum-06), resize, quota and scale-in (c2-size-*, cs3-relecloud-03, cs1-tailspin-02, c2-vmss-upgrade-rolling), ARM (c1-deploy-complete-*, c1-arm-nic-dependson, c1-bicep-dependencies), and App Service backup and domains (c4-backup-*, c4-domain-*, cs3-margiestravel-02/03, comp-appservice-custom-domain).

Note for a reviewer: `c2-enc-options-statements` s2 ("SSE with platform-managed keys also encrypts the temp disk") is still No per disk-encryption-overview. But v5+ sizes now encrypt their temp disk automatically, so a stem stating an older size (for example Ddsv4) would remove any doubt. It wasn't changed, because it doesn't contradict Learn.

## Quiz files

None changed. All four quizzes still agree with the corrected chapters (check-quiz 0/0).

## French terms not settled (not in the glossary, or not decided)

- « étendue d'étiquette de nom de domaine » (DNL, domain name label scope); « hachage » (hash); « prise de contrôle de sous-domaine » (subdomain takeover). Used in 33 and 34, not in the glossary.
- « étiquette de nom DNS » (ACI DNS name label, existing text in 33): not in the glossary. It conflicts with the « balise » rule for image tags only by analogy.
- « redondance de zone » (noun, existing in 33 and 34): the glossary has only the adjective « redondant interzone ».
- « balise » (image tag): set by tools/questions/WRITING_GUIDE.md, not in glossary `terms`.
- « réinitialisation (reimage) », « retrait » / « en cours de retrait » (retirement), « déprécié » (deprecated), « projet Notary »: not in the glossary.
- Out of scope, not changed: `case-studies/cs2-wingtip.yaml` FR line 86 says « sont appairés » (guide: « peering »).
