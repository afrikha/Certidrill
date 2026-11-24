La gouvernance transforme les intentions de sécurité en contrôles qui tiennent même quand quelqu'un oublie : Azure Policy refuse ou corrige les ressources non conformes, Defender for Cloud mesure la posture par rapport à des normes, les verrous et les paramètres de refus arrêtent les modifications destructrices, les rôles à privilège minimum limitent ce que peut faire un compte compromis, et le coffre de sauvegarde résiste à un attaquant qui a des droits d'administrateur. Les questions d'examen demandent quel contrôle impose une exigence, et à quelle étendue.

<!-- section: azure-policy | objectives: 1.3.1 -->
## Contrôles de sécurité avec Azure Policy

Une **définition** est une règle (condition `if`, effet `then`) ; une **initiative** regroupe des définitions ; une **attribution** applique l'une ou l'autre à un groupe d'administration, un abonnement ou un groupe de ressources, avec héritage vers le bas et exclusions facultatives. Une **exemption** (catégorie **Waiver** ou **Mitigated**, expiration facultative) écarte une ressource ou une étendue.

| Effet | Usage de sécurité |
| --- | --- |
| `deny` | Refuser la création ou la mise à jour d'une ressource non conforme (accès public aux objets blob, TLS 1.2 manquant) |
| `audit` | Signaler la non-conformité sans bloquer |
| `auditIfNotExists` | Signaler une ressource associée manquante (pas de paramètre de diagnostic, pas d'extension) |
| `deployIfNotExists` | Déployer la ressource associée manquante (paramètre de diagnostic, plan Defender, extension) |
| `modify` | Ajouter, remplacer ou supprimer des propriétés et des étiquettes (par exemple désactiver l'accès réseau public) |
| `append` | Ajouter des champs à la requête |
| `denyAction` | Bloquer une action, actuellement la suppression, sur les ressources ciblées |
| `manual` | Conformité attestée par une personne (contrôles qu'on ne peut pas vérifier automatiquement) |
| `disabled` | Désactiver la règle, souvent par un paramètre d'effet |

Ordre d'évaluation sur une requête : `disabled`, puis `append` et `modify`, puis `deny`, `audit`, `manual`, `auditIfNotExists`, et `denyAction` en dernier. `deny` ne touche jamais aux ressources existantes : elles apparaissent seulement non conformes. `deployIfNotExists` et `modify` corrigent les ressources existantes par une **tâche de correction**, qui s'exécute avec l'**identité managée** de l'attribution ; cette identité a besoin des rôles listés dans `roleDefinitionIds` de la définition. Le **mode d'application** *Disabled* rend compte sans appliquer l'effet : utilisez-le pour tester un `deny`.

Une définition personnalisée avec un effet paramétré :

```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        { "field": "type", "equals": "Microsoft.Storage/storageAccounts" },
        { "field": "Microsoft.Storage/storageAccounts/allowBlobPublicAccess", "equals": true }
      ]
    },
    "then": { "effect": "[parameters('effect')]" }
  },
  "parameters": {
    "effect": {
      "type": "String",
      "allowedValues": [ "Audit", "Deny", "Disabled" ],
      "defaultValue": "Audit"
    }
  }
}
```

```bash
az policy definition create --name deny-public-blob --mode All \
  --rules rules.json --params params.json
az policy assignment create --name deny-public-blob --policy deny-public-blob \
  --scope /subscriptions/<subscription id> --params '{ "effect": { "value": "Deny" } }'
az policy remediation create --name fix-diagnostics --policy-assignment <assignment id>
```

Créer des définitions et des attributions exige **Resource Policy Contributor** (ou Owner) ; une correction exige aussi le droit d'attribuer les rôles de l'identité.

<!-- section: regulatory-compliance | objectives: 1.3.2 -->
## Conformité réglementaire dans Defender for Cloud

Le tableau de bord **Regulatory compliance** (conformité réglementaire) montre, pour chaque norme attribuée, ses contrôles et les ressources qui les réussissent ou les échouent. Le **Microsoft cloud security benchmark (MCSB)** est attribué par défaut (sur AWS et GCP, avec la norme par défaut du fournisseur). Les autres normes (ISO/IEC 27001:2022, PCI DSS v4.0.1, NIST SP 800-53, SOC 2, benchmarks CIS, HIPAA, RGPD de l'UE, DORA, règlement européen sur l'IA...) s'ajoutent :

- **Prérequis** : n'importe quel plan Defender for Cloud **sauf Defender for Servers Plan 1 et Defender for APIs Plan 1**, et **Owner** ou **Policy Contributor** sur l'étendue. Lire les données de conformité exige **Reader** sur l'abonnement ; Security Reader n'y donne pas accès.
- **Étapes** : **Regulatory compliance > Manage compliance policies >** groupe d'administration, abonnement, compte AWS ou projet GCP **> Security policies >** passez la norme à **On** (définissez les paramètres si demandé). Préférez l'étendue la plus haute.
- Seuls les contrôles **évaluables automatiquement** ont un état : vert (conforme), rouge (non conforme), grisé (manuel : à attester vous-même). Une norme sans ressource pertinente n'apparaît pas.
- **Téléchargez les rapports d'audit** (certifications de Microsoft) ou un rapport de votre propre état, et suivez la tendance dans le classeur de conformité dans le temps.

> **Piège d'examen.** Un contrôle vert signifie que les vérifications automatiques réussissent, pas que vous êtes certifié. Les contrôles grisés exigent quand même des preuves.

<!-- section: defender-standards-recommendations | objectives: 1.3.3 -->
## Normes de sécurité et recommandations dans Defender for Cloud

**Environment settings >** étendue **> Security policies** liste trois types de **normes de sécurité** : les benchmarks (MCSB), les normes réglementaires et les **normes personnalisées**. Les normes Azure sont des initiatives Azure Policy. Une ressource qui échoue à un contrôle produit une **recommandation** : description, gravité, ressources concernées, étapes de correction, parfois un bouton **Fix**, facteurs de risque et chemins d'attaque.

| Exigence | Fonctionnalité |
| --- | --- |
| Les nouvelles ressources ne doivent jamais être non conformes | **Deny** sur la recommandation MCSB (Security policies > MCSB > Manage recommendations) ; Azure uniquement |
| Les nouvelles ressources doivent être corrigées automatiquement | **Enforce** sur la page de détails de la recommandation (`DeployIfNotExists`) |
| La ressource est protégée par un autre outil | Exemption, catégorie *Mitigated* (comptée comme saine) |
| Le risque est accepté | Exemption, catégorie *Waiver* (exclue du score de sécurité) |
| Chaque constat doit avoir un propriétaire et une échéance | **Règles de gouvernance** (Defender CSPM) : propriétaire par e-mail ou par étiquette de ressource, 7, 14, 30 ou 90 jours, période de grâce facultative, e-mails hebdomadaires |
| Votre propre vérification (KQL) | Recommandation personnalisée dans une norme personnalisée (Defender CSPM) |

- Les exemptions exigent que le MCSB soit attribué et **Owner** ou **Security Admin** (ou Contributor, Resource Policy Contributor) ; elles prennent jusqu'à 24 heures et ne s'appliquent pas aux recommandations personnalisées.
- **Security Admin** met à jour les stratégies de sécurité, ignore des alertes et gère les connecteurs ; **Security Reader** ne fait que consulter.
- Le **score de sécurité** compte les recommandations MCSB intégrées ; les recommandations en préversion et la hiérarchisation des risques ne le modifient pas. Depuis le 30 juin 2026, plus de 200 recommandations AWS et GCP comptent aussi. Le **Cloud Secure Score** fondé sur les risques du portail Microsoft Defender est un modèle différent, avec ses propres valeurs.
- **Foundational CSPM** est gratuit (recommandations, score de sécurité, MCSB) ; **Defender CSPM** ajoute les chemins d'attaque, l'explorateur de sécurité cloud, l'analyse sans agent, la gouvernance, le CIEM et la DSPM.

<!-- section: resource-locks | objectives: 1.3.4 -->
## Verrous de ressources

| Verrou (nom dans le portail) | Bloque |
| --- | --- |
| `CanNotDelete` (Suppression) | La suppression de la ressource |
| `ReadOnly` (Lecture seule) | La suppression, la modification et toute action POST (comme `listKeys`) |

- Se pose sur un abonnement, un groupe de ressources ou une ressource (pas sur un groupe d'administration), s'hérite, le plus restrictif l'emporte, s'applique **quel que soit le rôle**, Owner compris.
- Gérer les verrous exige `Microsoft.Authorization/locks/*` : Owner ou User Access Administrator.
- Les verrous agissent sur le **plan de contrôle** : un verrou `CanNotDelete` sur un coffre de clés empêche la suppression du coffre, pas celle de ses secrets ; un verrou `ReadOnly` sur un compte de stockage bloque `listKeys` et les outils qui reposent sur les clés.
- Un verrou bloque le déplacement de la ressource et la suppression de son groupe de ressources.

```bash
az lock create --name protect-vault --lock-type CanNotDelete \
  --resource-group rg-security --resource-name kv-orders-prod-weu \
  --resource-type Microsoft.KeyVault/vaults
```

> **Piège d'examen.** Quiconque peut gérer les verrous peut en supprimer un. Pour empêcher même les Owners d'un abonnement de supprimer des ressources, utilisez une **pile de déploiement** (deployment stack) avec paramètres de refus (elle crée une attribution de refus) ou une stratégie `denyAction` attribuée au-dessus d'eux.

<!-- section: built-in-role-assignments | objectives: 1.3.5 -->
## Attributions de rôles intégrés Azure

Portail Azure : **Contrôle d'accès (IAM) > Ajouter > Ajouter une attribution de rôle**. L'onglet **Rôle** sépare les **Job function roles** (rôles de fonction) des **Privileged administrator roles** (rôles d'administrateur privilégié) : Owner, Contributor, User Access Administrator, Role Based Access Control Administrator et Reservations Administrator.

| Besoin | Rôle |
| --- | --- |
| Gérer les stratégies, alertes et connecteurs de Defender for Cloud | Security Admin |
| Consulter seulement la posture et les alertes | Security Reader |
| Créer des définitions et des attributions de stratégie | Resource Policy Contributor |
| Déléguer la gestion des accès, limitée à certains rôles ou principaux | Role Based Access Control Administrator **avec une condition** |
| Lire les secrets d'un coffre | Key Vault Secrets User |
| Attribuer des identités affectées par l'utilisateur | Managed Identity Operator |

| | Rôles Azure | Rôles Microsoft Entra |
| --- | --- | --- |
| Contrôlent | Les ressources Azure, par Azure Resource Manager | Les objets Entra (utilisateurs, groupes, applications), par Microsoft Graph |
| Étendues | Groupe d'administration, abonnement, groupe de ressources, ressource | Locataire, unité administrative, application, groupe |
| Exemples | Owner, Contributor, Security Admin | Global Administrator, Security Administrator, Privileged Role Administrator |

Un **Global Administrator** n'a aucun accès Azure par défaut ; **Access management for Azure resources** (élévation d'accès) lui accorde User Access Administrator à l'étendue racine (`/`). Désactivez-la ensuite.

> **Piège d'examen.** Le rôle Entra **Security Administrator** et le rôle Azure **Security Admin** sont deux rôles différents, dans deux systèmes différents. Une question sur Defender for Cloud dans un abonnement attend le rôle Azure.

<!-- section: custom-roles | objectives: 1.3.6 -->
## Rôles personnalisés : Azure et Microsoft Entra

Un **rôle personnalisé Azure** liste `Actions`, `NotActions`, `DataActions`, `NotDataActions` et `AssignableScopes`. Le créer exige `Microsoft.Authorization/roleDefinitions/write` (Owner ou User Access Administrator). N'utilisez pas de caractère générique `*` : il accorde les opérations ajoutées plus tard.

```json
{
  "Name": "NSG Rule Operator (custom)",
  "IsCustom": true,
  "Description": "Read NSGs and manage their security rules.",
  "Actions": [
    "Microsoft.Network/networkSecurityGroups/read",
    "Microsoft.Network/networkSecurityGroups/securityRules/read",
    "Microsoft.Network/networkSecurityGroups/securityRules/write",
    "Microsoft.Network/networkSecurityGroups/securityRules/delete"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [ "/subscriptions/<subscription id>/resourceGroups/rg-network" ]
}
```

```bash
az role definition create --role-definition nsg-operator.json
```

Un **rôle personnalisé Microsoft Entra** se construit à partir de la liste prédéfinie des autorisations Entra (par exemple `microsoft.directory/applications/credentials/update`), est créé par un Privileged Role Administrator, et exige **Microsoft Entra ID P1** pour chaque bénéficiaire. Il s'attribue au locataire, à une unité administrative, ou à un groupe, une application d'entreprise ou une inscription d'application précis. Les rôles Entra intégrés ne sont pas modifiables. Les autorisations Entra ne peuvent pas entrer dans un rôle Azure, et inversement.

> **Conseil d'examen.** « Permettre à l'équipe de gérer les informations d'identification d'une seule application » : un rôle personnalisé Entra (ou le rôle Application Administrator) attribué **à l'étendue de cette application**, pas à tout le locataire.

<!-- section: overprivileged-access | objectives: 1.3.7 -->
## Corriger les accès disposant de privilèges excessifs

Les trouver :

- **Contrôle d'accès (IAM) > Attributions de rôles** à chaque groupe d'administration et abonnement, filtré sur les rôles d'administrateur privilégié ; `az role assignment list --all --include-inherited`.
- Les recommandations d'identité de Defender for Cloud : *A maximum of 3 owners should be designated for subscriptions*, *There should be more than one owner assigned to subscriptions*, *Guest accounts with owner permissions on Azure resources should be removed*, *Blocked accounts with owner permissions on Azure resources should be removed*, *Deprecated accounts should be removed from subscriptions*, *Privileged roles should not have permanent access at the subscription and resource group level*.
- Le **CIEM** de Defender CSPM : *Permissions of inactive identities in your Azure subscription should be revoked* (aucune activité depuis 45 jours) et *Azure overprovisioned identities should have only the necessary permissions*, pour les utilisateurs, groupes et principaux de service dans Azure, AWS et GCP.

Les corriger :

| Constat | Correction |
| --- | --- |
| Owner ou Contributor à l'étendue de l'abonnement pour une seule application | Rôle de fonction au groupe de ressources ou à la ressource |
| Rôle privilégié permanent | Attribution éligible PIM avec MFA et approbation |
| Administrateur délégué qui peut attribuer Owner | Role Based Access Control Administrator avec une condition qui limite les rôles et les principaux |
| Compte invité, bloqué, déprécié ou inactif disposant d'un accès | Supprimer l'attribution |
| Nombreuses attributions directes à des utilisateurs | Attribuer à des groupes |

<!-- section: backup-security | objectives: 1.3.8 -->
## Sécuriser les sauvegardes avec Sauvegarde Azure

| Fonctionnalité | Comportement |
| --- | --- |
| **Suppression réversible** | Données de sauvegarde supprimées conservées 14 jours sans surcoût, jusqu'à 180 jours ; la suppression réversible **toujours active** ne peut plus être désactivée (irréversible) |
| **Coffre immuable** | États *Disabled*, *Enabled* (réversible), *Enabled and locked* (**irréversible**). **Enable based on backup policy** (par défaut) : les points de récupération restent immuables tant que la stratégie les conserve ; leur suppression avant expiration et la réduction de la rétention sont bloquées, augmenter la rétention reste permis. **Enable for specific duration** : immuables pendant un nombre de jours fixe ; la rétention peut être réduite jusqu'à cette durée, pas en deçà. Coffres Recovery Services et coffres de sauvegarde |
| **Autorisation multi-utilisateur (MUA)** | Un **Resource Guard**, détenu par un administrateur de la sécurité (idéalement dans un autre abonnement ou un autre locataire), doit autoriser les opérations critiques |
| Chiffrement | Clés gérées par Microsoft par défaut ; clés gérées par le client dans Key Vault pour les coffres Recovery Services |
| Points de terminaison privés | Pour SQL Server et SAP HANA dans des VM, l'agent MARS, DPM |

MUA : la désactivation de la suppression réversible et le retrait de la MUA sont toujours protégés ; la suppression de la protection, la réduction de la rétention, la modification du chiffrement, la désactivation de l'immuabilité et d'autres opérations sont protégées par défaut et peuvent être exclues. L'administrateur de sauvegarde n'a besoin que de **Reader** sur le Resource Guard ; l'administrateur de la sécurité accorde temporairement **Backup MUA Operator** (idéalement par PIM) pour une opération. Ne donnez à l'administrateur de sauvegarde ni Contributor ni **Backup MUA Admin** sur le Resource Guard.

Niveaux de sécurité affichés par le coffre : **Excellent** (immuabilité ou suppression réversible irréversibles, plus MUA), **Good** (immuabilité verrouillée ou suppression réversible), **Fair** (MUA seule), **Poor**.

> **Piège d'examen.** « Un administrateur de sauvegarde compromis ne doit pas pouvoir détruire les sauvegardes » exige la MUA avec un Resource Guard qu'il ne contrôle pas **et** un paramètre irréversible. La suppression réversible seule peut être désactivée par quiconque en a le droit.

<!-- section: infrastructure-as-code | objectives: 1.3.9 -->
## Contrôles de sécurité avec l'infrastructure en tant que code

Inscrivez les paramètres sécurisés dans les modèles, pour que chaque déploiement démarre conforme :

```bicep
resource st 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stordersprod001'
  location: resourceGroup().location
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Disabled'
  }
}
```

| Contrôle | Ce qu'il apporte |
| --- | --- |
| Stratégie en tant que code | Définitions, initiatives et attributions stockées dans Git et déployées par le pipeline |
| Analyse statique dans le pipeline | Microsoft Security DevOps exécute Template Analyzer, Checkov et Terrascan sur Bicep, ARM et Terraform ; la sécurité DevOps de Defender for Cloud collecte les résultats |
| `what-if` | Aperçu des modifications avant le déploiement |
| Recherche de secrets dans les déploiements cloud | Defender CSPM trouve les secrets en clair dans les déploiements IaC |
| Paramètres de refus d'une **pile de déploiement** | `DenyDelete` ou `DenyWriteAndDelete` sur les ressources managées, par une attribution de refus ; jusqu'à 5 principaux exclus et 200 actions exclues |

```powershell
New-AzSubscriptionDeploymentStack -Name "landing-zone" -Location "westeurope" `
  -TemplateFile "main.bicep" -ActionOnUnmanage "detachAll" `
  -DenySettingsMode "denyWriteAndDelete" `
  -DenySettingsExcludedPrincipal "<pipeline identity object id>"
```

Les paramètres de refus n'agissent que sur le plan de contrôle, exigent le rôle **Azure Deployment Stack Owner** (Azure Deployment Stack Contributor gère les piles mais pas leurs paramètres de refus), et s'appliquent à tous ceux qui ne sont pas exclus, Owners compris.

<!-- section: key-points -->
## Points clés

- `deny` empêche, `audit` signale, `deployIfNotExists` et `modify` corrigent par une identité managée ; testez avec le mode d'application Disabled.
- Les normes réglementaires au-delà du MCSB exigent un plan payant (pas Servers Plan 1 ni APIs Plan 1) et Owner ou Policy Contributor.
- Recommandations : Deny et Enforce pour prévenir, exemptions (Mitigated, Waiver) pour accepter, règles de gouvernance pour attribuer des propriétaires.
- Les verrous s'imposent à tous les rôles mais les Owners peuvent les retirer ; les paramètres de refus d'une pile de déploiement, non.
- Rôles privilégiés : Owner, Contributor, User Access Administrator, RBAC Administrator, Reservations Administrator. Préférez les rôles de fonction, PIM et les conditions.
- Les rôles personnalisés Entra exigent P1 et n'utilisent que des autorisations Entra.
- Sauvegardes : suppression réversible toujours active, coffre immuable verrouillé, MUA avec un Resource Guard hors de portée de l'administrateur de sauvegarde.
