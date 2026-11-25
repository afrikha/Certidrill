Azure Arc projette les serveurs qui s'exécutent hors d'Azure (en local, sur Hyper-V ou VMware, dans d'autres clouds) dans Azure Resource Manager, pour que les mêmes services Azure les gèrent comme des machines virtuelles Azure : Azure Policy et la configuration de machine, les extensions de machine virtuelle, le Gestionnaire de mise à jour Azure (Azure Update Manager) et Azure Automation. Les questions d'examen demandent comment intégrer un serveur, quel rôle ou quelle règle réseau manque, et quel service répond à une exigence.

<!-- section: arc-onboarding | objectives: 2.2.1 -->
## Intégrer Windows Server à Azure Arc

Un serveur activé pour Azure Arc est une ressource `Microsoft.HybridCompute/machines` dans un groupe de ressources, créée par l'**agent Azure Connected Machine** installé sur le serveur. Les services de l'agent comprennent le service de métadonnées d'instance hybride (`himds`, exécuté en tant que `NT SERVICE\himds`, qui a besoin du droit *Ouvrir une session en tant que service*), le service de configuration invité et le gestionnaire d'extensions. Chaque serveur activé pour Arc reçoit une **identité managée affectée par le système** dans Microsoft Entra ID.

Prérequis :

| Élément | Exigence |
| --- | --- |
| Système d'exploitation | Windows Server 2012 R2, 2016, 2019, 2022, 2025 (Expérience de bureau ou Server Core), x64. Windows Server 2012 : dernier agent compatible 1.69 |
| Non pris en charge | Les machines virtuelles Azure (sauf pour simuler un environnement local en labo), les machines virtuelles Azure Stack Hub et Azure Stack Edge ; les machines clonées ou les images de référence dont l'agent est déjà connecté |
| Droits locaux | Administrateur local pour installer et connecter l'agent |
| Fournisseurs de ressources | `Microsoft.HybridCompute`, `Microsoft.GuestConfiguration`, `Microsoft.HybridConnectivity` (plus `Microsoft.AzureArcData` pour SQL Server, `Microsoft.Compute` pour Update Manager) |
| Rôle pour intégrer | **Azure Connected Machine Onboarding** (ou Contributor) sur le groupe de ressources |
| Rôle pour gérer les ressources | **Azure Connected Machine Resource Administrator** (lire, modifier, supprimer des machines, déployer des extensions) |
| Réseau | **Sortant uniquement**, TCP **443**, TLS 1.2 ou 1.3, en direct, via un proxy, via la passerelle Azure Arc ou via une **étendue de liaison privée Azure Arc** |

Étiquettes de service à autoriser en sortie : `AzureActiveDirectory`, `AzureTrafficManager`, `AzureResourceManager`, `AzureArcInfrastructure`, `Storage`, `AzureFrontDoor.Frontend` (et `WindowsAdminCenter` si WAC est utilisé). Une passerelle Log Analytics ne peut pas servir de proxy à l'agent.

| Méthode d'intégration | Quand |
| --- | --- |
| Script généré dans le portail (Azure Arc > Ajouter > intégrer des machines existantes), connexion interactive | Un ou quelques serveurs |
| Le même script avec un **principal de service** qui détient **Azure Connected Machine Onboarding** | À grande échelle, déployé par stratégie de groupe, Configuration Manager, Ansible ou un autre outil ; le principal de service ne sert qu'au moment de la connexion |

```powershell
# At-scale onboarding with a service principal (run as local administrator)
azcmagent connect --service-principal-id "<app-id>" --service-principal-secret "<secret>" `
    --tenant-id "<tenant-id>" --subscription-id "<subscription-id>" `
    --resource-group "RG-Arc" --location "westeurope"

azcmagent show          # agent status and connection
azcmagent check         # test connectivity to the Arc endpoints
azcmagent disconnect    # remove the Azure resource and disconnect
```

> **Piège d'examen.** Le principal de service d'intégration a besoin d'**Azure Connected Machine Onboarding**, pas d'Azure Connected Machine Resource Administrator : c'est le privilège minimum pour « connecter des serveurs sans les gérer ». Créer le principal de service lui-même demande le droit d'inscrire des applications dans le locataire, et attribuer le rôle demande Owner ou User Access Administrator.

L'agent se met à jour par Microsoft Update (activez « les mises à jour d'autres produits Microsoft »), WSUS ou Configuration Manager (produit *Azure Connected Machine Agent*), le Gestionnaire de mise à jour Azure, ou la mise à niveau automatique de l'agent ; aucun redémarrage n'est nécessaire.

**Windows Server Management enabled by Azure Arc** : les serveurs avec une Software Assurance ou des licences d'abonnement actives (attestées dans Azure Arc > Licences > Azure Benefits - Windows Server), ou inscrits au paiement à l'utilisation de Windows Server, obtiennent le Gestionnaire de mise à jour Azure, Change Tracking and Inventory, la configuration de machine, Windows Admin Center dans Azure, Best Practices Assessment et d'autres services sans coût supplémentaire (agent 1.47 ou ultérieur, machine connectée). Les autres serveurs peuvent acheter séparément Update Manager, Change Tracking and Inventory et la configuration de machine.

<!-- section: machine-configuration | objectives: 2.2.2 -->
## Configuration des appareils avec la configuration de machine et Azure Policy

La **configuration de machine Azure** (Azure Machine Configuration, fonctionnalité d'Azure Policy, anciennement configuration invité) audite ou définit des paramètres du système d'exploitation dans la machine : bases de sécurité, valeurs de Registre, applications installées, appartenance aux groupes locaux, services. Sur les serveurs activés pour Arc, elle est **intégrée à l'agent Connected Machine** ; sur les machines virtuelles Azure, elle demande l'extension de configuration de machine et une identité managée affectée par le système.

| Type d'affectation | Comportement |
| --- | --- |
| Audit | Signale uniquement la conformité |
| ApplyAndMonitor | Applique la configuration, puis signale les dérives |
| ApplyAndAutoCorrect | Applique la configuration et corrige les dérives |

Utilisation :

- **Stratégies et initiatives intégrées** (par exemple la base de sécurité Windows, ou « auditer les machines où une application donnée manque ») : affectez-les à un groupe d'administration, un abonnement ou un groupe de ressources ; elles couvrent à la fois les machines virtuelles Azure et les serveurs activés pour Arc.
- **Configurations personnalisées** : écrivez une configuration PowerShell DSC, créez un package avec le module `GuestConfiguration`, testez-le, publiez-le dans un stockage, puis créez une définition de stratégie ou une affectation invité qui le référence.
- Les résultats par paramètre apparaissent dans la page **Affectations invité** de la machine et dans la conformité Azure Policy.
- Jusqu'à 50 affectations invité par machine. La configuration de machine n'est pas disponible sur les serveurs activés pour Arc en Arm64.

```powershell
# Package and test a custom configuration (GuestConfiguration module)
New-GuestConfigurationPackage -Name "TimeZoneParis" -Configuration ".\TimeZoneParis\localhost.mof" `
    -Type AuditAndSet -Force
Get-GuestConfigurationPackageComplianceStatus -Path ".\TimeZoneParis.zip"
```

> **Piège d'examen.** L'extension de machine virtuelle DSC n'est pas la réponse pour les serveurs activés pour Arc : elle n'est plus disponible pour eux. Utilisez la configuration de machine pour maintenir des paramètres, ou l'extension de script personnalisé pour un script ponctuel.

Autres fonctionnalités de configuration des appareils avec Arc : **Azure Policy** au niveau des ressources (étiquettes, emplacements autorisés, déploiement d'extensions par des stratégies `DeployIfNotExists` comme « configurer les machines Arc pour exécuter Azure Monitor Agent »), les **étiquettes de ressources** pour les étendues dynamiques, et **Change Tracking and Inventory** pour voir les modifications des logiciels, fichiers, Registre et services.

Verrouillage local avec la configuration propre de l'agent, que seul un administrateur local peut modifier (pas même un Owner Azure) :

```powershell
azcmagent config set guestconfiguration.enabled false   # block machine configuration on this server
azcmagent config set config.mode monitor                # allow only monitoring and security extensions
azcmagent config list
```

En mode monitor, Microsoft tient à jour la liste des extensions autorisées (surveillance et sécurité, comme Azure Monitor Agent et Defender for Cloud), et vous ne pouvez pas modifier la liste d'autorisation ni la liste de blocage : pour définir vos propres listes, revenez au mode complet avec `azcmagent config set config.mode full`.

<!-- section: vm-extensions | objectives: 2.2.3 -->
## Extensions de machine virtuelle sur des machines non Azure

Les serveurs activés pour Arc exécutent beaucoup des mêmes **extensions de machine virtuelle** que les machines virtuelles Azure, déployées depuis le portail, Azure CLI (`az connectedmachine extension create`), Azure PowerShell (`New-AzConnectedMachineExtension`), des modèles ARM ou Azure Policy. En déployer une demande `Microsoft.HybridCompute/machines/extensions/write`, inclus dans **Azure Connected Machine Resource Administrator**.

| Exigence | Extension (éditeur/type) |
| --- | --- |
| Collecter des événements et des compteurs de performances vers Log Analytics, VM Insights | Azure Monitor Agent (`Microsoft.Azure.Monitor/AzureMonitorWindowsAgent`), associé à une règle de collecte de données |
| Cartographier les processus et les dépendances dans VM Insights | Agent de dépendances (`DependencyAgentWindows`), avec Azure Monitor Agent |
| Exécuter un script une fois sur de nombreux serveurs | Extension de script personnalisé (`Microsoft.Compute/CustomScriptExtension`) |
| Obtenir des certificats d'Azure Key Vault et les renouveler automatiquement | Extension Key Vault (`KeyVaultForWindows`), avec l'identité managée du serveur |
| Intégrer Microsoft Defender pour point de terminaison | `MDE.Windows` (déployée par Defender pour serveurs) |
| Exécuter des runbooks Azure Automation sur le serveur | Runbook Worker hybride (`HybridWorkerForWindows`) |
| Gérer le serveur depuis le portail | Windows Admin Center (`Microsoft.AdminCenter/AdminCenter`) |
| Appliquer les correctifs depuis Azure | Windows OS Update Extension / Windows Patch extension, poussées automatiquement par Update Manager |
| Se connecter avec Microsoft Entra ID | `AADLoginForWindows` |

```powershell
New-AzConnectedMachineExtension -ResourceGroupName "RG-Arc" -MachineName "SRV1" -Location "westeurope" `
    -Name "AzureMonitorWindowsAgent" -Publisher "Microsoft.Azure.Monitor" `
    -ExtensionType "AzureMonitorWindowsAgent" -EnableAutomaticUpgrade
```

Beaucoup d'extensions prennent en charge la **mise à niveau automatique des extensions**. L'ancien agent Log Analytics (MMA) est mis hors service : utilisez Azure Monitor Agent.

Restreignez les extensions **localement** sur le serveur avec une liste d'autorisation (à privilégier : elle bloque tout ce qui n'est pas listé, y compris les extensions futures) ou une liste de blocage, avec des entrées de la forme `Publisher/Type` :

```powershell
azcmagent config set extensions.allowlist "Microsoft.Azure.Monitor/AzureMonitorWindowsAgent,Microsoft.Azure.AzureDefenderForServers/MDE.Windows"
azcmagent config set extensions.blocklist "Microsoft.Compute/CustomScriptExtension"
azcmagent config set extensions.enabled false   # disable the extension manager
```

> **Piège d'examen.** Une liste d'autorisation ou de blocage ne supprime pas les extensions déjà installées, et la suppression est toujours autorisée. Une extension présente dans les deux listes est bloquée. Azure Policy peut aussi restreindre les extensions, mais quiconque peut modifier l'affectation peut l'annuler ; le paramètre local ne peut pas être modifié depuis Azure.

<!-- section: update-manager | objectives: 2.2.4 -->
## Gestionnaire de mise à jour Azure

Le Gestionnaire de mise à jour Azure (Azure Update Manager) évalue et installe les mises à jour Windows et Linux sur les machines virtuelles Azure et les **serveurs activés pour Arc** (ainsi que les machines VMware et SCVMM activées pour Arc et Azure Local), sans espace de travail Log Analytics ni compte Automation. Il remplace Update Management d'Automation (mis hors service). Ses extensions sont poussées automatiquement à la première opération sur une machine. Les mises à jour viennent de la source configurée sur le serveur : Microsoft Update, Windows Update ou **WSUS**.

| Opération | Usage |
| --- | --- |
| Rechercher des mises à jour (à la demande) | Évaluation immédiate |
| Évaluation périodique | Évaluation automatique toutes les **24 heures** ; activez-la à grande échelle avec Azure Policy |
| Mise à jour ponctuelle | Installation immédiate, avec classifications, listes de KB à inclure ou exclure, option de redémarrage et durée maximale |
| Mises à jour planifiées | Une **configuration de maintenance** (planification, récurrence, durée, classifications, paramètre de redémarrage) affectée à des machines ou à une **étendue dynamique** (abonnement, groupe de ressources, emplacement, système, étiquettes) |
| Événements pré et post | Exécuter des actions avant et après une maintenance planifiée (par exemple un runbook via Event Grid) |
| Rapports | Vues de conformité, Azure Workbooks, Azure Resource Graph, alertes |

Orchestration des correctifs (paramètres de mise à jour) :

| Option | Effet |
| --- | --- |
| Customer Managed Schedules | Nécessaire pour les correctifs planifiés des machines virtuelles Azure (les serveurs activés pour Arc n'ont aucun prérequis d'orchestration des correctifs, seulement l'association à la planification) ; règle le mode de correctif sur Azure-orchestrated avec `BypassPlatformSafetyChecksOnUserSchedule` = TRUE |
| Azure Managed - Safe Deployment | Mise à jour corrective automatique de l'invité de machine virtuelle (`AutomaticByPlatform`), machines virtuelles Azure uniquement, pas les serveurs activés pour Arc |
| Windows Automatic Updates | `AutomaticByOS` : le système installe lui-même les mises à jour |
| Manual updates | Mises à jour automatiques Windows désactivées ; correctifs uniquement quand ils sont déclenchés |

Le **hotpatching** installe les mises à jour de sécurité sans redémarrage : sur les machines virtuelles Windows Server Azure Edition, et sur les serveurs Windows Server 2025 activés pour Arc par le service de hotpatch activé par Arc.

Facturation : gratuit pour les machines virtuelles Azure ; pour les serveurs activés pour Arc, facturé par serveur, sauf s'ils sont couverts par Windows Server Management enabled by Azure Arc (attestation de Software Assurance ou paiement à l'utilisation).

> **Conseil d'examen.** « Appliquer les correctifs aux serveurs locaux chaque deuxième mardi à 22 h, uniquement à ceux étiquetés `Ring=1`, et arrêter un service avant » signifie serveurs activés pour Arc, configuration de maintenance avec une étendue dynamique sur l'étiquette, et un événement pré. Les serveurs encore dirigés vers WSUS n'installent que les mises à jour approuvées dans WSUS.

<!-- section: automation-runbooks | objectives: 2.2.5 -->
## Runbooks Azure Automation

Un **compte Automation** contient des runbooks, des planifications, des webhooks, des ressources partagées (informations d'identification, variables, certificats, connexions) et des modules. Un **runbook** est un script exécuté sous forme de travail, dans un **bac à sable** Azure ou sur un **Runbook Worker hybride**.

| Type de runbook | Remarques |
| --- | --- |
| PowerShell | Recommandé ; versions d'exécution 7.6, 7.4 et 5.1 (7.1 et 7.2 ne sont plus prises en charge). Runbooks signés et workflows non pris en charge en 7.x |
| Python | Python 3.10 (2.7 et 3.8 ne sont plus pris en charge) ; pas de webhooks pour démarrer les runbooks Python |
| Graphique | Basé sur Windows PowerShell, créé et modifié uniquement dans l'éditeur graphique du portail ; ne s'exécute pas sur un Runbook Worker hybride Linux |
| Workflow PowerShell et Workflow PowerShell graphique | Déconseillés ; pas de prise en charge de PowerShell 7, démarrage lent (compilés) |

Étapes : créer le runbook (ou l'importer), le modifier, le tester dans le **volet Test**, le **Publier** (seuls les runbooks publiés peuvent être démarrés par une planification ou un webhook), puis le démarrer manuellement, depuis une **planification**, un **webhook**, une alerte ou un autre runbook.

Authentification : les comptes d'identification (Run As) ont disparu ; les runbooks utilisent l'**identité managée** du compte Automation, qui a besoin de rôles Azure sur les ressources cibles. Sur un Runbook Worker hybride, utilisez l'identité **affectée par le système** du compte Automation (son identité affectée par l'utilisateur n'y est pas prise en charge) ; une fois celle-ci activée, les runbooks ne peuvent plus utiliser l'identité managée de la machine virtuelle ou du serveur activé pour Arc.

```powershell
# Inside a runbook: authenticate with the Automation account's system-assigned managed identity
Disable-AzContextAutosave -Scope Process
$ctx = (Connect-AzAccount -Identity).Context
Set-AzContext -SubscriptionName $ctx.Subscription -DefaultProfile $ctx
Get-AzVM -ResourceGroupName "RG-App" -Status | Where-Object PowerState -eq "VM running"
```

**Runbook Worker hybride** : exécute des travaux sur une machine Windows ou Linux (machine virtuelle Azure ou **serveur activé pour Arc**) pour atteindre des ressources locales.

| Point | Règle |
| --- | --- |
| Déploiement | **Basé sur une extension** (extension Hybrid Worker), le seul modèle pris en charge : le modèle basé sur un agent (agent Log Analytics) a été mis hors service le 31 août 2024 et ses travaux sont arrêtés depuis avril 2025 |
| Groupes | Les workers appartiennent à un **groupe Runbook Worker hybride** ; vous démarrez un runbook sur un groupe, et n'importe quel worker du groupe prend le travail. Plusieurs workers = haute disponibilité |
| Prérequis | Windows Server jusqu'à 2022 (la liste prise en charge sur Learn n'inclut pas Windows Server 2025), Windows PowerShell 5.1 (PowerShell Core n'est pas pris en charge), .NET Framework 4.6.2 ou version ultérieure ; l'identité managée affectée par le système de la machine est activée lors de son ajout |
| Identité | Les travaux s'exécutent en tant que **Système local** sous Windows (`nxautomation` sous Linux), sauf si des **informations d'identification Hybrid Worker** personnalisées (une ressource d'informations d'identification) sont définies sur le groupe, sous Windows uniquement ; pour atteindre Azure, utilisez une identité managée |
| Limites | Aucune limite du bac à sable (répartition équitable, limite de trois heures des travaux cloud, mémoire, sockets) ; seulement les ressources de la machine |
| Une machine | Un worker qui rend compte à un seul compte Automation |

```powershell
Start-AzAutomationRunbook -AutomationAccountName "AA-Ops" -ResourceGroupName "RG-Ops" `
    -Name "Restart-PrintSpooler" -RunOn "HRW-Paris" -Parameters @{ ServerName = "PRN1" }
```

> **Piège d'examen.** Un runbook cloud ne peut pas atteindre un serveur local ni un partage du réseau interne, et les travaux cloud sont limités à trois heures par la répartition équitable. Ces deux exigences mènent à un groupe Runbook Worker hybride.

<!-- section: key-points -->
## Points clés

- Arc : agent Connected Machine, sortant 443 uniquement ; intégration avec Azure Connected Machine Onboarding (principal de service à grande échelle) ; gestion avec Azure Connected Machine Resource Administrator ; pas pour les machines virtuelles Azure.
- La configuration de machine est intégrée à l'agent Arc ; Audit, ApplyAndMonitor, ApplyAndAutoCorrect ; l'extension DSC n'est pas disponible sur Arc.
- Extensions : Azure Monitor Agent, script personnalisé, Key Vault, MDE, Hybrid Worker, AdminCenter ; verrouillage local avec les listes d'autorisation de `azcmagent config`.
- Update Manager : évaluation périodique toutes les 24 heures, configurations de maintenance avec étendues dynamiques, Customer Managed Schedules pour les correctifs planifiés des machines virtuelles Azure ; les serveurs Arc sont facturés sauf si Windows Server Management enabled by Azure Arc s'applique.
- Runbooks : PowerShell 7.6/7.4/5.1 ou Python 3.10, publier avant de planifier, identité managée ; groupes Runbook Worker hybride (basés sur une extension) pour les ressources locales et les travaux longs.
