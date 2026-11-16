Le contrôle d'accès en fonction du rôle Azure (Azure RBAC) détermine qui peut faire quoi sur quelles ressources Azure. Les questions d'examen donnent un ensemble d'attributions et demandent soit quel rôle attribuer et où, soit ce qu'un utilisateur peut finalement faire.

<!-- section: rbac-model | objectives: 1.2.1 -->
## Le modèle : qui, quoi, où

Une **attribution de rôle** relie trois éléments :

| Élément | Sens | Valeurs |
| --- | --- | --- |
| Principal de sécurité | Qui | Utilisateur, groupe, principal de service, identité managée |
| Définition de rôle | Quoi | Une liste d'opérations autorisées (rôle intégré ou personnalisé) |
| Étendue (scope) | Où | Groupe d'administration, abonnement, groupe de ressources ou ressource |

Une définition de rôle est un document JSON :

```json
{
  "Name": "Virtual Machine Operator (custom)",
  "IsCustom": true,
  "Description": "Start, restart and deallocate virtual machines.",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/deallocate/action"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [ "/subscriptions/<subscription id>" ]
}
```

| Propriété | Rôle |
| --- | --- |
| `Actions` | Opérations du plan de contrôle autorisées. `*` est un caractère générique |
| `NotActions` | Opérations **soustraites** de `Actions`. Autorisations effectives = Actions moins NotActions |
| `DataActions` / `NotDataActions` | Même logique pour les opérations du plan de données (lire un objet blob, lire un secret) |
| `AssignableScopes` | Où le rôle peut être attribué. Pour un rôle personnalisé : groupes d'administration, abonnements ou groupes de ressources |

> **Piège d'examen.** `NotActions` n'est pas un refus. Si une autre attribution accorde l'opération qu'un rôle exclut, l'utilisateur la possède.

Les noms d'opérations suivent la forme `{Fournisseur}/{type de ressource}/{opération}`, avec `read`, `write`, `delete` ou `{nom}/action`. Exemples : `Microsoft.Storage/storageAccounts/listKeys/action`, `Microsoft.Authorization/roleAssignments/write`.

Les **rôles personnalisés** se créent quand aucun rôle intégré ne convient (portail : Contrôle d'accès (IAM) > Ajouter > Ajouter un rôle personnalisé, en clonant un rôle, en partant de zéro ou d'un JSON ; `az role definition create --role-definition role.json` ; `New-AzRoleDefinition -InputFile role.json`). En créer un demande `Microsoft.Authorization/roleDefinitions/write` sur chaque étendue assignable : Owner ou User Access Administrator. Un rôle personnalisé avec `DataActions` ne peut pas être attribué à l'étendue d'un groupe d'administration, et un rôle personnalisé ne peut citer qu'un seul groupe d'administration dans `AssignableScopes`.

<!-- section: built-in-roles | objectives: 1.2.1 -->
## Les rôles intégrés à connaître

Les rôles fondamentaux s'appliquent à tous les types de ressources :

| Rôle | Gérer les ressources | Attribuer des rôles | Remarques |
| --- | --- | --- | --- |
| Owner (Propriétaire) | Oui | Oui | `Actions: *` |
| Contributor (Contributeur) | Oui | Non | `*` moins `Microsoft.Authorization/*/Write` et `/Delete`, entre autres. Ne peut ni attribuer de rôles ni gérer les verrous |
| Reader (Lecteur) | Lecture seule | Non | `*/read`. Ne lit pas les secrets comme les clés de stockage (`listKeys` est une action, pas une lecture) |
| User Access Administrator | Non | Oui | `Microsoft.Authorization/*` : attributions de rôles, rôles personnalisés, verrous |
| Role Based Access Control Administrator | Non | Oui | Attributions de rôles uniquement, éventuellement limitées par une **condition** (quels rôles, à quels principaux). À privilégier pour déléguer |

Les rôles de fonction sont limités à un service :

| Rôle | Ce qu'il permet | Ce qu'il ne permet pas |
| --- | --- | --- |
| Virtual Machine Contributor | Créer et gérer les machines virtuelles et leurs disques | Gérer le réseau virtuel ou le compte de stockage auxquels elles sont connectées ; se connecter à la machine |
| Virtual Machine Administrator Login / Virtual Machine User Login | Se connecter à une machine virtuelle avec Microsoft Entra ID, comme administrateur ou comme utilisateur standard | Gérer la machine virtuelle |
| Network Contributor | Gérer les réseaux (réseaux virtuels, NSG, tables de routage, équilibreurs de charge) | Gérer les machines virtuelles |
| Storage Account Contributor | Gérer les comptes de stockage, **y compris les clés d'accès** | Rien par l'accès aux données Microsoft Entra, mais les clés donnent un accès complet aux données |
| Storage Blob Data Reader / Contributor / Owner | Lire / lire, écrire et supprimer / accès complet, y compris les ACL POSIX, sur les données blob | Gérer le compte |
| Storage File Data SMB Share Reader / Contributor / Elevated Contributor | Lire / modifier / modifier et changer les autorisations NTFS sur les partages de fichiers Azure via SMB | Gérer le compte |
| Key Vault Secrets User | Lire le contenu des secrets (coffres utilisant le modèle d'autorisation Azure RBAC) | Gérer le coffre |
| AcrPull / AcrPush | Tirer (pull) / tirer et pousser (push) des images dans un registre de conteneurs | Gérer le registre |
| Monitoring Reader / Monitoring Contributor | Lire toutes les données de supervision / modifier aussi les règles d'alerte et les paramètres de diagnostic | |
| Backup Reader / Operator / Contributor | Consulter / lancer aussi des sauvegardes et des restaurations / gérer aussi les stratégies et arrêter la protection | Backup Operator ne peut ni supprimer des sauvegardes ni gérer les stratégies |
| Tag Contributor | Gérer les étiquettes de n'importe quelle ressource | Accéder aux ressources elles-mêmes |

Pour lire des données blob dans le portail avec une identité Microsoft Entra, un utilisateur a besoin de **deux** rôles : Reader (pour naviguer jusqu'au compte) et un rôle de données comme Storage Blob Data Reader.

> **Piège d'examen.** Un utilisateur qui détient `listKeys` (Owner, Contributor, Storage Account Contributor) lit les données avec la clé du compte dans le portail, quels que soient les rôles de données. Pour imposer l'autorisation Microsoft Entra, désactivez l'autorisation par clé partagée (Shared Key) sur le compte.

<!-- section: scopes | objectives: 1.2.2 -->
## Attribuer des rôles à différentes étendues

```text
Tenant root group
└── Management group
    └── Subscription          /subscriptions/{id}
        └── Resource group    /subscriptions/{id}/resourceGroups/RG1
            └── Resource      .../providers/Microsoft.Compute/virtualMachines/VM1
```

Une attribution est **héritée** par toutes les étendues enfants, y compris les enfants créés ou déplacés là plus tard. Choisir une étendue, c'est choisir le niveau le plus étroit qui contient encore tout ce qui est demandé :

| Exigence | Étendue |
| --- | --- |
| Une seule machine virtuelle | La ressource |
| Toutes les ressources d'une application, présentes et futures | Son groupe de ressources |
| « Y compris les groupes de ressources créés plus tard » | L'abonnement |
| « Y compris les abonnements ajoutés plus tard » | Le groupe d'administration |

Certaines ressources ont des sous-étendues : un conteneur d'objets blob (`.../blobServices/default/containers/invoices`), un partage de fichiers, un sous-réseau.

Dans le portail, ouvrez d'abord l'étendue, puis **Contrôle d'accès (IAM) > Ajouter > Ajouter une attribution de rôle** : onglet *Rôle*, onglet *Membres*, éventuellement *Conditions*, puis *Vérifier + attribuer*.

```bash
az role assignment create --assignee ana@contoso.com \
  --role "Virtual Machine Contributor" \
  --scope "/subscriptions/<id>/resourceGroups/RG-Web"

# Managed identity: use the object ID and the principal type
az role assignment create --assignee-object-id <object id> \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" --scope "<container resource ID>"
```

```powershell
New-AzRoleAssignment -SignInName ana@contoso.com `
  -RoleDefinitionName "Virtual Machine Contributor" -ResourceGroupName RG-Web
```

Pour attribuer des rôles, il faut `Microsoft.Authorization/roleAssignments/write` : Owner, User Access Administrator ou Role Based Access Control Administrator à cette étendue.

À retenir également :

- Préférez l'attribution à des **groupes** : une seule attribution, puis l'appartenance au groupe pilote l'accès.
- Les invités et les identités managées reçoivent des attributions de rôles comme tout autre principal.
- Quand une ressource est **déplacée** vers un autre groupe de ressources ou un autre abonnement, les attributions faites directement sur elle ne suivent pas : elles deviennent orphelines et doivent être recréées. Les attributions héritées sont simplement remplacées par celles du nouveau parent.
- Quand un abonnement est transféré vers un autre locataire, toutes ses attributions de rôles sont définitivement supprimées.

<!-- section: interpret-access | objectives: 1.2.3 -->
## Interpréter les attributions d'accès

Règles pour calculer ce qu'un utilisateur peut faire sur une ressource :

1. Rassemblez toutes les attributions qui s'appliquent : faites à l'utilisateur ou à un groupe dont il est membre (de façon **transitive**, à travers les groupes imbriqués), à l'étendue de la ressource ou à **n'importe quelle étendue parente**.
2. Les autorisations sont **additives** : le résultat est l'union de tous les rôles. Reader hérité de l'abonnement plus Contributor sur un groupe de ressources donne Contributor sur ce groupe de ressources et Reader ailleurs.
3. Une étendue inférieure ne peut pas retirer ce qu'une étendue supérieure accorde. Une attribution héritée ne se supprime qu'à l'étendue où elle a été faite.
4. Les **attributions de refus** (deny assignments) sont vérifiées en premier et l'emportent sur toute attribution de rôle. Vous ne pouvez pas en créer vous-même : c'est Azure qui les crée, par exemple pour les piles de déploiement (deployment stacks) avec paramètres de refus et pour les applications managées.
5. Pour une opération de données, il faut un rôle avec les `DataActions` correspondantes. Owner n'en a aucune.
6. Si l'attribution comporte une **condition**, elle est évaluée en dernier.

Azure RBAC n'est pas le seul contrôle : un **verrou de ressource** bloque l'opération quel que soit le rôle, **Azure Policy** peut refuser la requête, et le pare-feu du service peut bloquer l'accès aux données.

Exemple commenté. Dev1 appartient à G-Dev. Attributions : G-Dev a Reader sur Sub1 ; Dev1 a Contributor sur RG-Test ; G-Dev a Storage Blob Data Reader sur le compte st1 de RG-Prod.

| Question | Réponse | Pourquoi |
| --- | --- | --- |
| Dev1 peut-il créer une machine virtuelle dans RG-Test ? | Oui | Contributor sur RG-Test |
| Dev1 peut-il redémarrer une machine virtuelle de RG-Prod ? | Non | Seul Reader y est hérité ; redémarrer est une action |
| Dev1 peut-il lire un objet blob de st1 avec l'autorisation Microsoft Entra ? | Oui | Rôle de données hérité par le groupe |
| Dev1 peut-il donner accès à RG-Test à un collègue ? | Non | Contributor exclut l'écriture d'attributions de rôles |

La page **Contrôle d'accès (IAM)** de toute étendue comporte ces onglets :

| Onglet | Affiche |
| --- | --- |
| Vérifier l'accès | Les attributions d'un principal à cette étendue et celles dont elle hérite (pas celles faites aux étendues enfants) |
| Attributions de rôles | Qui détient quel rôle à cette étendue, avec l'étendue d'origine de chaque attribution |
| Rôles | Les définitions de rôles et leurs autorisations |
| Attributions de refus | Les attributions de refus qui s'appliquent |
| Administrateurs classiques | L'ancien modèle des coadministrateurs, retiré ; il n'est plus utilisé |

```bash
# Current subscription only by default; add scopes explicitly
az role assignment list --assignee ana@contoso.com --all \
  --include-inherited --include-groups --output table
```

```powershell
Get-AzRoleAssignment -SignInName ana@contoso.com -ExpandPrincipalGroups
```

Les changements peuvent mettre quelques minutes à s'appliquer ; un utilisateur doit parfois se déconnecter puis se reconnecter quand son appartenance à un groupe a changé.

<!-- section: key-points -->
## Points clés

- Attribution = principal + rôle + étendue ; elle est héritée vers le bas ; les autorisations s'additionnent.
- `NotActions` soustrait du rôle lui-même ; seules les attributions de refus (créées par Azure) refusent.
- Contributor gère tout sauf l'accès ; User Access Administrator et Role Based Access Control Administrator gèrent l'accès mais pas les ressources.
- Les rôles du plan de contrôle ne donnent pas accès aux données ; les rôles de données du stockage, si. `listKeys` contourne les rôles de données.
- Moindre privilège = le rôle le plus spécifique à l'étendue la plus étroite qui couvre les ressources présentes et futures.
- Déplacer une ressource rend orphelines ses attributions de rôles directes.
