Ce cours suit le guide d'étude officiel de l'AZ-104, objectif par objectif. Chaque chapitre couvre un groupe fonctionnel de l'examen ; chaque section indique les objectifs qu'elle prépare. Lisez un chapitre, passez un examen blanc, puis revenez aux sections des questions ratées.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 100 minutes d'examen |
| Questions | 40 à 60, selon la session |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est consultable pendant l'examen, sans temps supplémentaire |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Le score est étalonné : 700 ne signifie pas 70 % des questions. Les questions composées de plusieurs éléments (listes déroulantes, affirmations Oui/Non, glisser-déposer) rapportent un point par élément correct : une réponse partiellement juste rapporte donc des points.

Un examen est composé de sections :

- **Études de cas.** La description d'une entreprise (environnement existant, exigences, contraintes), suivie de plusieurs questions. Une fois l'étude de cas quittée, vous ne pouvez plus y revenir.
- **Séries Oui/Non.** Le même scénario est répété avec une solution différente à chaque fois ; vous indiquez si la solution atteint l'objectif. Chaque réponse est définitive, sans retour arrière. Plusieurs solutions peuvent être bonnes, ou aucune.
- **Section principale.** Des questions indépendantes, que vous pouvez marquer et revoir jusqu'à la soumission.

> **Conseil d'examen.** Microsoft Learn est disponible, mais chercher coûte du temps. Servez-vous-en pour une valeur précise qui vous échappe (une limite, une fonctionnalité d'un SKU), jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question

Les questions de l'AZ-104 décrivent un environnement (« Vous disposez d'un abonnement Azure nommé Sub1 qui contient... ») puis un besoin (« Vous devez... »). Les mots décisifs sont en général les contraintes :

| Contrainte dans l'énoncé | Ce qu'elle sélectionne |
| --- | --- |
| « réduire les coûts » | Le SKU, le niveau ou la redondance le moins cher qui respecte encore toutes les exigences |
| « réduire l'effort d'administration » | La fonctionnalité intégrée ou automatique (stratégie, groupe dynamique, mise à l'échelle automatique) plutôt qu'un script |
| « principe du moindre privilège » | Le rôle le plus étroit à l'étendue la plus étroite |
| « ne doit pas affecter les autres applications » | Un changement ciblé (une SAS, une règle), pas un changement global (régénération d'une clé) |
| « les futures ressources doivent aussi... » | Une étendue plus haute avec héritage (abonnement, groupe d'administration), ou une stratégie |

Lisez les réponses proposées pour ce qu'elles font réellement. Les mauvaises réponses sont de vraies fonctionnalités Azure, qui résolvent un autre problème.

<!-- section: azure-hierarchy -->
## La hiérarchie Azure

Tout ce que l'examen aborde se situe quelque part dans cette hiérarchie :

| Niveau | Rôle |
| --- | --- |
| Locataire (tenant) Microsoft Entra | L'annuaire : utilisateurs, groupes, applications. Un locataire peut être approuvé par de nombreux abonnements ; un abonnement approuve un seul locataire |
| Groupes d'administration | Conteneurs d'abonnements, pour appliquer des stratégies et des attributions de rôles à plusieurs abonnements à la fois |
| Abonnement | Unité de facturation et limite des quotas |
| Groupe de ressources | Conteneur logique de ressources qui partagent le même cycle de vie. Une ressource appartient à un seul groupe de ressources |
| Ressource | Une machine virtuelle, un compte de stockage, un réseau virtuel... |

Les attributions de rôles et de stratégies faites à un niveau sont **héritées** par tous les niveaux inférieurs. Cette seule règle répond à une grande partie des questions de gouvernance.

Il existe deux sortes d'opérations :

- Le **plan de contrôle** (plan de gestion) passe par Azure Resource Manager (`https://management.azure.com`) : créer un compte de stockage, redimensionner une machine virtuelle, lire une configuration. Les rôles Azure RBAC avec `Actions`, Azure Policy et les verrous de ressources agissent ici.
- Le **plan de données** s'adresse à la ressource elle-même : lire un objet blob, se connecter à une machine virtuelle, lire un secret. Il demande des rôles de données (`DataActions`), des clés ou des jetons du service.

> **Piège d'examen.** Propriétaire (Owner) et Contributeur (Contributor) sont des rôles du plan de contrôle. Être Propriétaire d'un compte de stockage ne permet pas, à lui seul, de lire ses objets blob avec votre identité Microsoft Entra.

Les régions comptent aussi. Une **région** est un ensemble de centres de données ; la plupart des régions comptent trois **zones de disponibilité** (groupes de centres de données physiquement séparés dans la région) ; de nombreuses régions ont une **région jumelée**, utilisée par les services géoredondants.

<!-- section: admin-tools -->
## Les outils d'administration

Vous devez savoir lire et compléter des commandes dans les deux outils en ligne de commande.

| Outil | Forme | Exemple |
| --- | --- | --- |
| Portail Azure | Interface web | Chaque ressource a un menu avec **Vue d'ensemble**, **Journal d'activité**, **Contrôle d'accès (IAM)**, **Étiquettes**, **Paramètres**... |
| Azure CLI | `az <groupe> <sous-groupe> <action> --paramètre valeur` | `az vm start --resource-group RG1 --name VM1` |
| Azure PowerShell | `Verbe-AzNom -Paramètre valeur` | `Start-AzVM -ResourceGroupName RG1 -Name VM1` |
| Azure Cloud Shell | Shell dans le navigateur (Bash ou PowerShell), avec les deux outils déjà installés | Conserver des fichiers demande un compte de stockage avec un partage de fichiers |
| Modèles ARM et Bicep | Fichiers déclaratifs | Voir le chapitre sur les modèles ARM et Bicep |

```bash
# Azure CLI
az login
az account set --subscription "Sub1"
az group create --name RG1 --location westeurope
az resource list --resource-group RG1 --output table
```

```powershell
# Azure PowerShell
Connect-AzAccount
Set-AzContext -Subscription "Sub1"
New-AzResourceGroup -Name RG1 -Location westeurope
Get-AzResource -ResourceGroupName RG1
```

Des régularités aident à reconstruire une commande oubliée :

- Actions Azure CLI : `create`, `list`, `show`, `update`, `delete`. Verbes PowerShell : `New-`, `Get-`, `Set-` ou `Update-`, `Remove-`.
- Les objets Microsoft Entra se gèrent avec `az ad ...` ou avec le module **Microsoft Graph PowerShell** (`New-MgUser`, `Get-MgGroup`), pas avec les cmdlets `Az`.

Avant qu'un abonnement puisse créer un type de ressource, son **fournisseur de ressources** (par exemple `Microsoft.Compute`) doit être inscrit. Le portail inscrit automatiquement les plus courants ; sinon, utilisez `az provider register --namespace Microsoft.ContainerInstance` ou `Register-AzResourceProvider`.

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : les derniers domaines réutilisent les identités, le stockage et le réseau.
2. Reproduisez les opérations principales dans un abonnement gratuit ou à l'usage. Supprimez le groupe de ressources à la fin de chaque séance pour arrêter les coûts.
3. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
4. Réservez l'examen réel quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
