L'infrastructure en tant que code (IaC) décrit les environnements dans des fichiers versionnés et permet à un pipeline de les créer et de les mettre à jour de la même façon à chaque fois. Les questions d'AZ-400 demandent quelle technologie répond à une exigence (Azure uniquement ou multicloud, ressources ou paramètres du système d'exploitation, mode push ou pull), comment tester un modèle avant le déploiement, et comment maintenir machines et environnements dans leur état souhaité.

<!-- section: config-technology | objectives: 3.5.1 -->
## Recommander une technologie de gestion de la configuration

Deux couches doivent être gérées : les **ressources Azure** (plan de contrôle) et la **configuration à l'intérieur des machines** (système d'exploitation, rôles, fichiers, services).

| Technologie | Couche | Modèle | À choisir quand |
| --- | --- | --- | --- |
| Bicep | Ressources Azure | Déclaratif, sans fichier d'état (Azure est l'état) | Azure uniquement, prise en charge immédiate des nouveaux types de ressources, syntaxe la plus simple |
| Modèles ARM (JSON) | Ressources Azure | Déclaratif, sans fichier d'état | Modèles JSON existants ; Bicep se compile en ARM |
| Terraform | Ressources dans Azure et d'autres clouds | Déclaratif, fichier d'état à stocker et verrouiller | Multicloud ou pratique Terraform existante |
| Azure Machine Configuration | Dans les machines virtuelles Azure et les serveurs avec Azure Arc | État souhaité audité ou appliqué via Azure Policy | Auditer ou imposer des paramètres du système à grande échelle, serveurs hybrides |
| Azure Automation State Configuration | Dans les machines (serveur pull PowerShell DSC) | Pull | Déploiements existants uniquement : retrait le 30 septembre 2027 |
| Ansible | Dans les machines, aussi les ressources Azure | Push sans agent via SSH ou WinRM, playbooks YAML | Parc majoritairement Linux, pas d'agent souhaité |
| Chef, Puppet | Dans les machines | Pull par un agent depuis un serveur | Investissement existant dans ces outils |
| Extension de script personnalisé, cloud-init | Dans une nouvelle machine virtuelle | Exécution unique au provisionnement | Amorcer une machine, pas contrôler la dérive dans la durée |
| Azure App Configuration, Azure Key Vault | Paramètres et secrets des applications | Magasin central lu à l'exécution | Paramètres et indicateurs de fonctionnalités partagés entre environnements |

> **Piège d'examen.** Bicep et les modèles ARM ne conservent pas de fichier d'état, Terraform oui : un pipeline Terraform a besoin d'un backend distant (un conteneur d'objets blob Stockage Azure, qui verrouille l'état avec un bail de blob) partagé par toutes les exécutions. Perdre le fichier d'état, c'est perdre la connaissance des ressources que Terraform gère.

<!-- section: config-strategy | objectives: 3.5.2 -->
## Implémenter une stratégie de gestion de la configuration

- **Un modèle, plusieurs jeux de paramètres.** Le même fichier Bicep est déployé en dev, test et production avec un fichier `.bicepparam` par environnement ; les différences sont des paramètres, jamais des copies du modèle.
- **Les secrets hors du code.** Les fichiers de paramètres référencent Key Vault (`getSecret()` dans un fichier `.bicepparam`, ou une référence Key Vault dans un fichier de paramètres JSON) ; les applications utilisent des références Key Vault ou une identité managée.
- **Paramètres d'application par environnement.** App Configuration avec des étiquettes (labels) `dev`, `prod` et les mêmes clés ; le pipeline choisit l'étiquette, pas les valeurs.
- **Déploiements idempotents.** Exécuter deux fois le même déploiement donne le même résultat ; le pipeline redéploie à chaque mise en production, ce qui corrige les modifications manuelles (dérive).
- **Détecter la dérive.** `what-if` sur l'environnement réel, conformité Azure Policy, rapports Machine Configuration pour les invités.
- **Modules réutilisables.** Publiez les modules Bicep dans un registre de modules privé (un Azure Container Registry) ou comme spécifications de modèle (template specs), avec des versions sémantiques.

```bicep
// main.bicepparam
using 'main.bicep'
param environmentName = 'prod'
param appServiceSku = 'P1v3'
param sqlAdminPassword = az.getSecret('<subscription-id>', 'rg-secrets', 'kv-shop-prod', 'sqlAdminPassword')
```

<!-- section: iac-strategy | objectives: 3.5.3 -->
## Stratégie IaC : contrôle de code source, tests et automatisation du déploiement

Le code d'infrastructure suit le même flux que le code applicatif : un dépôt, des demandes de tirage avec stratégies de branche ou règles de protection, un pipeline, des environnements avec approbations.

| Étape | Outils | Détecte |
| --- | --- | --- |
| Lint | Linter Bicep (`bicep lint`, règles configurées dans `bicepconfig.json`), `terraform fmt -check` et `terraform validate` | Erreurs de syntaxe, paramètres inutilisés, emplacements codés en dur, secrets dans les sorties |
| Analyse statique | PSRule for Azure, ARM template test toolkit (arm-ttk), scanners de sécurité | Non-conformité aux règles Azure Well-Architected et aux règles de l'organisation |
| Validation préalable | `az deployment group validate` | Valeurs invalides, quotas, refus de stratégie, avant toute modification |
| Aperçu des modifications | `az deployment group what-if`, `terraform plan` | Ressources à créer, modifier ou supprimer ; publiez la sortie dans la demande de tirage |
| Déploiement | `az deployment group create`, `AzureResourceManagerTemplateDeployment@3`, `terraform apply` du plan enregistré | |
| Tests après déploiement | Tests de fumée, Pester, conformité des stratégies | L'environnement fonctionne réellement |

```yaml
stages:
- stage: Validate
  jobs:
  - job: Preview
    pool:
      vmImage: ubuntu-latest
    steps:
    - task: AzureCLI@2
      inputs:
        azureSubscription: sc-infra-wif
        scriptType: bash
        scriptLocation: inlineScript
        inlineScript: |
          az bicep lint --file infra/main.bicep
          az deployment group what-if --resource-group rg-shop-prod \
            --template-file infra/main.bicep --parameters infra/prod.bicepparam
- stage: Deploy
  dependsOn: Validate
  jobs:
  - deployment: Infra
    environment: infra-prod          # approval check on this environment
    pool:
      vmImage: ubuntu-latest
    strategy:
      runOnce:
        deploy:
          steps:
          - checkout: self
          - task: AzureCLI@2
            inputs:
              azureSubscription: sc-infra-wif
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az deployment group create --resource-group rg-shop-prod \
                  --template-file infra/main.bicep --parameters infra/prod.bicepparam
```

La connexion de service ou l'étape GitHub `azure/login` utilise la fédération d'identité de charge de travail (aucun secret stocké), avec un rôle comme Contributor limité au groupe de ressources cible. Déployez la phase d'infrastructure avant les phases applicatives qui en ont besoin.

> **Conseil d'examen.** « Montrer aux réviseurs quelles ressources vont changer avant l'approbation du déploiement », c'est `what-if` (ou `terraform plan`) dans une phase de validation, puis une approbation sur l'environnement de la phase de déploiement.

<!-- section: desired-state | objectives: 3.5.4 -->
## Configuration d'état souhaité pour les environnements

| Besoin | Outil et comportement |
| --- | --- |
| Les ressources Azure correspondent au modèle, les ressources en plus sont laissées | Déploiement ARM ou Bicep, mode **Incremental** (par défaut) |
| Les ressources absentes du modèle sont supprimées | **Pile de déploiement** (deployment stack) avec `--action-on-unmanage deleteResources` (méthode recommandée), ou mode **Complete** à l'étendue du groupe de ressources (non recommandé, et appelé à être progressivement abandonné au profit des piles de déploiement) |
| Empêcher la modification ou la suppression manuelle des ressources déployées | Pile de déploiement avec paramètres de refus (`denyDelete` ou `denyWriteAndDelete`) |
| Paramètres du système audités ou imposés sur les machines virtuelles Azure et les serveurs avec Arc | Azure Machine Configuration |
| Serveur pull PowerShell DSC existant dans Azure Automation | Azure Automation State Configuration, à migrer vers Machine Configuration avant le 30 septembre 2027 |

```bash
az stack group create --name shop-prod --resource-group rg-shop-prod \
  --template-file infra/main.bicep --parameters infra/prod.bicepparam \
  --action-on-unmanage deleteResources --deny-settings-mode denyDelete
```

**Azure Machine Configuration** (une fonctionnalité d'Azure Policy) audite ou configure des paramètres à l'intérieur des machines, sous forme de configurations attribuées par machine ou via une stratégie. Modes d'application :

| Mode | Comportement |
| --- | --- |
| Audit | Signale uniquement la conformité |
| Apply and Monitor (`ApplyAndMonitor`) | Applique une fois, puis signale la dérive |
| Apply and Autocorrect (`ApplyAndAutoCorrect`) | Applique et corrige la dérive dès qu'elle est détectée |

Prérequis : l'extension Machine Configuration et une identité managée affectée par le système sur les machines virtuelles Azure (une initiative intégrée déploie les deux), ou l'agent Azure Connected Machine pour les serveurs avec Arc. Une configuration personnalisée est une configuration PowerShell DSC empaquetée en `.zip` avec le module GuestConfiguration (`New-GuestConfigurationPackage`), stockée dans un conteneur d'objets blob, et transformée en définition de stratégie avec `New-GuestConfigurationPolicy`. Une machine accepte jusqu'à 50 attributions d'invité ; les groupes de machines virtuelles identiques en orchestration Uniform ne sont pas pris en charge.

**Azure Automation State Configuration** fournit un serveur pull PowerShell DSC managé : importer ou compiler des configurations, inscrire des nœuds, consulter les rapports de conformité, les transférer vers Log Analytics. La prise en charge de Linux a déjà pris fin en 2023, et le service est retiré le 30 septembre 2027.

> **Piège d'examen.** Le mode Complete supprime toutes les ressources du groupe de ressources absentes du modèle, y compris celles qu'une autre équipe a déployées. Quand seules les ressources précédemment déployées par ce modèle doivent être nettoyées, utilisez une pile de déploiement.

<!-- section: deployment-environments | objectives: 3.5.5 -->
## Environnements de déploiement Azure en libre-service

Les environnements de déploiement Azure (Azure Deployment Environments) permettent aux développeurs de créer à la demande une infrastructure applicative préapprouvée à partir de modèles IaC sélectionnés par les ingénieurs de plateforme. **Le service est retiré le 22 février 2027** : Microsoft demande aux clients de passer à une autre solution Microsoft, Azure ou partenaire avant cette date. Il reste au programme du guide d'étude AZ-400.

| Composant | Rôle |
| --- | --- |
| Centre de développement (dev center) | Contient les projets, les catalogues et les types d'environnements du centre (partagé avec Microsoft Dev Box) |
| Catalogue | Un dossier de dépôt GitHub ou Azure DevOps analysé à la recherche de définitions d'environnement |
| Définition d'environnement | Un modèle IaC (ARM ou Bicep, d'autres frameworks via le modèle d'extensibilité) plus son fichier manifeste |
| Type d'environnement | Dev, test, production... : défini au niveau du centre, activé par projet |
| Type d'environnement de projet | Associe le type à un abonnement de déploiement, une identité managée et le niveau d'accès des développeurs |
| Environnement | Les ressources déployées, dans leur propre groupe de ressources |

| Rôle | Permet |
| --- | --- |
| DevCenter Owner | Gérer le centre de développement |
| DevCenter Project Admin | Gérer les projets et les types d'environnements de projet, créer des environnements |
| Deployment Environments User | Créer des environnements dans un projet |
| Deployment Environments Reader | Lire les environnements créés par d'autres |

Le déploiement s'exécute sous l'**identité managée** du type d'environnement de projet, qui a besoin de Contributor et User Access Administrator sur l'abonnement cible : les développeurs n'ont besoin d'aucun rôle sur l'abonnement lui-même. Chaque environnement est créé dans son propre groupe de ressources, où les membres du projet obtiennent Contributor par défaut. Les environnements se créent depuis le portail des développeurs, Azure CLI (`az devcenter dev environment create`) ou un pipeline, par exemple un environnement temporaire par demande de tirage, supprimé à la fermeture de celle-ci.

> **Conseil d'examen.** « Les développeurs créent eux-mêmes leurs environnements de test sans autorisation sur l'abonnement, uniquement à partir de modèles approuvés » désigne les environnements de déploiement Azure : catalogue plus type d'environnement de projet avec une identité managée.

<!-- section: key-points -->
## Points clés

- Bicep et ARM : Azure uniquement, sans fichier d'état ; Terraform : multicloud, état distant avec verrouillage.
- Machine Configuration impose les paramètres du système via Azure Policy ; Automation State Configuration est retiré le 30 septembre 2027.
- Un modèle, un fichier de paramètres par environnement, les secrets depuis Key Vault.
- Lint, validation, `what-if` dans la demande de tirage, approbation, puis déploiement avec la fédération d'identité de charge de travail.
- Les piles de déploiement nettoient les ressources non gérées et refusent les modifications ; le mode Complete supprime tout ce qui n'est pas dans le modèle.
- Environnements de déploiement Azure : centre de développement, catalogue, définitions d'environnement, types d'environnements de projet avec une identité managée ; retrait le 22 février 2027.
