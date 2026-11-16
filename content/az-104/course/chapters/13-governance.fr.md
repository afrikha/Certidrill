La gouvernance est l'ensemble des règles qui gardent les abonnements conformes, organisés et dans le budget : Azure Policy dit à quoi les ressources peuvent ressembler, les verrous les protègent des accidents, les étiquettes les classent, et les groupes d'administration, abonnements et groupes de ressources les structurent.

<!-- section: azure-policy | objectives: 1.3.1 -->
## Azure Policy

Azure RBAC contrôle **qui** peut agir ; Azure Policy contrôle **ce que** les ressources peuvent être, quel que soit l'auteur de l'action. Même un Owner est soumis aux stratégies.

| Objet | Rôle |
| --- | --- |
| Définition de stratégie | Une règle : une condition (`if`) et un effet (`then`). Intégrée (Allowed locations, Require a tag on resources...) ou personnalisée |
| Initiative (ensemble de stratégies) | Un groupe de définitions attribuées ensemble, avec un seul état de conformité |
| Attribution | Une définition ou une initiative appliquée à une **étendue** : groupe d'administration, abonnement ou groupe de ressources. Elle est héritée par les étendues enfants ; des étendues enfants peuvent être listées en **exclusions** |
| Exemption | Une ressource ou une étendue qui reste dans l'attribution mais n'est pas évaluée, avec une catégorie : **Waiver** (dérogation : la non-conformité est acceptée) ou **Mitigated** (atténué : l'intention est respectée autrement), et une date d'expiration facultative |

```json
{
  "if": {
    "allOf": [
      { "field": "location", "notIn": "[parameters('allowedLocations')]" },
      { "field": "location", "notEquals": "global" }
    ]
  },
  "then": { "effect": "deny" }
}
```

Effets :

| Effet | Ce qu'il fait |
| --- | --- |
| `deny` | Rejette la requête de création ou de mise à jour qui correspond à la règle |
| `audit` | Laisse passer la requête et signale la ressource comme non conforme |
| `append` | Ajoute des champs à la requête (par exemple une règle IP) |
| `modify` | Ajoute, remplace ou supprime des propriétés ou des étiquettes ; peut corriger les ressources existantes par une correction |
| `auditIfNotExists` | Signale l'absence d'une ressource **associée** (par exemple un paramètre de diagnostic) |
| `deployIfNotExists` | Déploie la ressource associée quand elle manque (par exemple une extension) |
| `denyAction` | Bloque une action sur les ressources concernées ; actuellement l'action de suppression |
| `disabled` | Désactive la règle |

Règles d'évaluation qui tombent à l'examen :

- Une stratégie s'applique aux ressources **créées ou mises à jour** après l'attribution. Les **ressources existantes** sont évaluées et signalées comme non conformes, mais `deny` ne les supprime ni ne les modifie jamais.
- Pour corriger les ressources existantes avec `modify` ou `deployIfNotExists`, créez une **tâche de correction** (remediation task). Elle s'exécute avec l'**identité managée** de l'attribution, qui doit détenir les rôles listés dans la définition (le portail les accorde ; en ligne de commande, vous les attribuez vous-même).
- La conformité est évaluée à la création ou à la modification de l'attribution, quand une ressource change, et lors d'un cycle complet toutes les 24 heures. Forcez-la avec `az policy state trigger-scan` ou `Start-AzPolicyComplianceScan`.
- Plusieurs attributions sont **cumulatives** : le résultat le plus restrictif l'emporte. Une étendue inférieure ne peut pas assouplir une stratégie attribuée plus haut.
- Le **mode d'application** *Désactivé* (`DoNotEnforce`) évalue et signale sans appliquer l'effet : utile pour tester un `deny` avant de l'imposer.

> **Piège d'examen.** *Allowed locations* (Emplacements autorisés) restreint l'emplacement des **ressources**. *Allowed locations for resource groups* ne restreint que l'endroit où l'on crée les groupes de ressources ; un groupe de ressources situé dans une région peut contenir des ressources de n'importe quelle région.

```bash
az policy assignment create --name allowed-locations \
  --policy "<definition name or ID>" --scope "/subscriptions/<id>" \
  --params '{ "listOfAllowedLocations": { "value": ["westeurope","northeurope"] } }'
```

<!-- section: resource-locks | objectives: 1.3.2 -->
## Verrous de ressources

Un verrou protège contre les modifications accidentelles, **quel que soit le rôle de l'utilisateur**.

| Verrou (nom dans le portail) | Autorisé | Bloqué |
| --- | --- | --- |
| `CanNotDelete` (Supprimer) | Lire et modifier | Supprimer |
| `ReadOnly` (Lecture seule) | Lire (GET) | Supprimer, modifier, et toute action POST |

- Les verrous s'appliquent aux **abonnements, groupes de ressources et ressources**, pas aux groupes d'administration. Un verrou est **hérité** par tout ce qui se trouve en dessous, y compris les ressources ajoutées plus tard ; le verrou le plus restrictif l'emporte.
- Les verrous n'agissent que sur le **plan de contrôle**. Un verrou `ReadOnly` sur un compte de stockage n'empêche pas d'écrire des objets blob, mais il bloque la liste des clés (`listKeys` est un POST) et casse donc les outils qui reposent sur les clés. Un verrou `ReadOnly` sur un groupe de ressources empêche de démarrer ou de redémarrer ses machines virtuelles (actions POST).
- Un verrou `CanNotDelete` sur une seule ressource fait échouer la suppression de tout son groupe de ressources.
- Gérer les verrous demande `Microsoft.Authorization/locks/*` : **Owner** ou **User Access Administrator**. Contributor ne le peut pas. Pour supprimer une ressource verrouillée, retirez d'abord le verrou.

```bash
az lock create --name no-delete --lock-type CanNotDelete --resource-group RG1
```

```powershell
New-AzResourceLock -LockName no-delete -LockLevel CanNotDelete -ResourceGroupName RG1
```

<!-- section: tags | objectives: 1.3.3 -->
## Étiquettes

Une étiquette (tag) est une paire nom-valeur (`CostCenter = 1234`) qui sert à classer les ressources, à les filtrer et à ventiler les coûts dans l'analyse des coûts.

- Les étiquettes s'appliquent aux ressources, aux groupes de ressources et aux abonnements, pas aux groupes d'administration.
- **Les étiquettes ne sont pas héritées.** Une ressource ne reçoit pas les étiquettes de son groupe de ressources ni de son abonnement.
- Jusqu'à 50 étiquettes par ressource ; nom de 512 caractères au plus (128 pour les comptes de stockage), valeur de 256 au plus. Les noms ne respectent pas la casse, les valeurs la respectent.
- Appliquer des étiquettes demande un accès en écriture à la ressource (Contributor) ou le rôle **Tag Contributor**.

Imposez les étiquettes avec les stratégies intégrées :

| Stratégie | Effet |
| --- | --- |
| Require a tag on resources / on resource groups | `deny` : la création sans l'étiquette est refusée |
| Inherit a tag from the resource group | `modify` : ajoute l'étiquette ou la remplace par la valeur du groupe de ressources |
| Inherit a tag from the resource group if missing | `modify` : ne l'ajoute que si la ressource n'en a pas |
| Add a tag to resources | `modify` : ajoute l'étiquette avec une valeur donnée |

Les ressources existantes sont étiquetées par une tâche de correction.

```bash
# Merge keeps the other tags; Replace overwrites the whole set; Delete removes the listed tags
az tag update --resource-id <id> --operation Merge --tags CostCenter=1234
```

```powershell
Update-AzTag -ResourceId <id> -Tag @{ CostCenter = "1234" } -Operation Merge
```

<!-- section: resource-groups | objectives: 1.3.4 -->
## Groupes de ressources

- Une ressource appartient à un seul groupe de ressources ; les groupes de ressources ne peuvent être ni imbriqués ni **renommés**.
- L'**emplacement** d'un groupe de ressources est l'endroit où sont stockées ses métadonnées. Ses ressources peuvent se trouver dans n'importe quelle région.
- Supprimer un groupe de ressources supprime tout ce qu'il contient. Les ressources qui partagent le même cycle de vie vont ensemble.
- Un groupe de ressources est une étendue pour les attributions de rôles, les stratégies, les verrous et les budgets.

**Déplacer des ressources** vers un autre groupe de ressources ou un autre abonnement :

- La ressource garde sa **région**. Seul le groupe de ressources change, donc l'**ID de ressource** : mettez à jour les scripts, alertes et tableaux de bord qui le référencent.
- Pendant le déplacement, les deux groupes de ressources sont verrouillés en écriture et en suppression, mais les ressources continuent de fonctionner.
- Entre abonnements, les deux doivent appartenir au **même locataire Microsoft Entra**, la destination doit avoir inscrit le fournisseur de ressources, et une ressource doit être déplacée **avec ses ressources dépendantes** (une machine virtuelle avec ses disques et son interface réseau), depuis un seul groupe de ressources.
- Tous les types de ressources ne sont pas déplaçables ; vérifiez avant.
- Autorisations requises : l'action `moveResources` sur le groupe de ressources source et l'écriture sur la destination.
- Les attributions de rôles faites directement sur la ressource ne suivent pas. Un verrou sur la source ou la destination bloque le déplacement.

```bash
az resource move --destination-group RG2 --ids <resource id 1> <resource id 2>
```

```powershell
Move-AzResource -DestinationResourceGroupName RG2 `
  -DestinationSubscriptionId <id> -ResourceId <resource id>
```

Le déplacement vers une autre **région** est une opération différente, réalisée avec Azure Resource Mover ou par redéploiement.

<!-- section: subscriptions | objectives: 1.3.5 -->
## Abonnements

Un abonnement est une unité de facturation, une limite pour les quotas et une étendue pour l'accès et les stratégies. Les organisations séparent les abonnements par environnement (production, développement), par service ou par facturation.

- Les **quotas** (par exemple les processeurs virtuels par région et par famille de machines virtuelles) sont fixés par abonnement. Demandez une augmentation depuis la page **Quotas** ou par une demande de support.
- Les **fournisseurs de ressources** s'inscrivent par abonnement.
- Un abonnement approuve un seul locataire. **Changer d'annuaire** demande un compte qui est Owner de l'abonnement et qui existe dans les deux locataires. Ensuite, toutes les attributions de rôles sont perdues, les rôles personnalisés sont supprimés, et les identités managées doivent être recréées ou réactivées. La propriété de la facturation se transfère séparément.
- Un abonnement peut être **annulé** ; ses ressources sont alors arrêtées, puis supprimées après une période de conservation.
- Rôles au niveau de l'abonnement : Owner, Contributor, Reader. La facturation a ses propres rôles (par exemple Billing Reader, Cost Management Reader, Cost Management Contributor).

<!-- section: costs | objectives: 1.3.6 -->
## Gérer les coûts

| Outil | Usage |
| --- | --- |
| Analyse des coûts | Explorer les coûts réels et prévus ; regrouper et filtrer par groupe de ressources, service, emplacement ou **étiquette** |
| Budgets | Un montant par mois, trimestre ou année à une étendue (groupe d'administration, abonnement, groupe de ressources), avec des alertes |
| Alertes de coût | **Alertes de budget** (seuils), **alertes d'anomalie** (consommation quotidienne inhabituelle, à l'étendue de l'abonnement), alertes de crédit et de quota pour certains contrats |
| Azure Advisor | Recommandations dans cinq catégories : **Coût**, Sécurité, Fiabilité, Excellence opérationnelle, Performances |
| Calculatrice de prix | Estimer le prix d'une architecture avant le déploiement |

Budgets :

- Les seuils d'alerte sont des **pourcentages** du budget, évalués sur le coût **réel** (Actual, déjà dépensé) ou **prévu** (Forecasted, projeté sur la période : avertit *avant* le dépassement).
- Un budget **n'arrête ni ne bloque jamais** de ressources. Il notifie par e-mail et peut appeler un **groupe d'actions**, qui peut lancer un runbook d'automatisation, une fonction Azure ou une application logique qui arrête des ressources.
- Les données de coût sont actualisées plusieurs fois par jour : une alerte de budget n'est donc pas immédiate.

Recommandations de coût d'Advisor : redimensionner ou arrêter les **machines virtuelles sous-utilisées** (le seuil de processeur se règle par abonnement dans la configuration d'Advisor), acheter des réservations ou des plans d'économies, supprimer les adresses IP publiques non associées et les disques inutilisés.

Moyens de réduire la facture : les **réservations** (engagement d'un ou trois ans sur un type de ressource et une région), le **plan d'économies pour le calcul** (engagement sur un montant horaire), **Azure Hybrid Benefit** (réutiliser des licences Windows Server et SQL Server), les machines virtuelles **Spot** pour les charges interruptibles, la libération (deallocate) des machines virtuelles (une machine seulement *arrêtée* depuis le système d'exploitation reste facturée pour le calcul), le choix des niveaux de stockage.

<!-- section: management-groups | objectives: 1.3.7 -->
## Groupes d'administration

Les groupes d'administration organisent les abonnements pour que les stratégies et les attributions de rôles soient appliquées une fois, puis héritées.

- Chaque locataire a un **groupe racine du locataire** (Tenant root group) ; tous les groupes d'administration et abonnements sont en dessous.
- Jusqu'à **six niveaux** de profondeur sous la racine (les niveaux racine et abonnement ne sont pas comptés) ; jusqu'à 10 000 groupes d'administration par locataire.
- Un groupe d'administration ou un abonnement a un **seul parent**.
- Les nouveaux abonnements arrivent par défaut dans le groupe d'administration racine (un groupe d'administration par défaut peut être configuré).
- Un groupe d'administration ne peut être supprimé que s'il est **vide**.
- Les stratégies et les attributions de rôles faites sur un groupe d'administration s'appliquent à tous ses abonnements, présents et futurs. Les verrous et les étiquettes n'existent pas à ce niveau.
- Pour déplacer un abonnement, il faut être Owner de l'abonnement et avoir l'écriture sur le groupe d'administration cible et sur le parent actuel (Owner, Contributor ou Management Group Contributor). Si votre rôle Owner sur l'abonnement n'est qu'hérité de son groupe d'administration actuel, vous ne pouvez le déplacer que vers un groupe d'administration où vous êtes aussi Owner.
- À la première utilisation, un Administrateur général peut devoir élever son accès pour gérer le groupe racine.

```bash
az account management-group create --name mg-prod --display-name "Production"
az account management-group subscription add --name mg-prod --subscription "Sub1"
```

Organisation type : racine > groupes d'administration *Production* et *Hors production*, une initiative de stratégies de sécurité attribuée à la racine, Allowed locations attribuée par branche, et Reader pour les auditeurs au sommet.

<!-- section: key-points -->
## Points clés

- Stratégie = ce qui est autorisé (même pour un Owner) ; RBAC = qui est autorisé.
- `deny` bloque les nouvelles requêtes non conformes et ne touche jamais aux ressources existantes ; `modify` et `deployIfNotExists` corrigent l'existant par une tâche de correction et une identité managée.
- Verrous : `CanNotDelete` et `ReadOnly`, hérités, plan de contrôle uniquement, gérés par Owner ou User Access Administrator ; pas sur les groupes d'administration.
- Les étiquettes ne sont pas héritées ; utilisez les stratégies *Inherit a tag*. 50 étiquettes par ressource.
- Un déplacement change le groupe de ressources et l'ID de ressource, jamais la région.
- Les budgets alertent (coût réel ou prévu) mais n'arrêtent jamais les ressources d'eux-mêmes.
- Groupes d'administration : six niveaux, un seul parent, nouveaux abonnements à la racine, suppression seulement s'ils sont vides.
