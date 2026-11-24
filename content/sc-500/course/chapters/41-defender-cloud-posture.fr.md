Microsoft Defender for Cloud combine la gestion de la posture (CSPM : trouver et hiérarchiser les erreurs de configuration et les risques) et la protection des charges de travail (CWP : détecter les menaces sur les serveurs, le stockage, les bases de données, les conteneurs et d'autres ressources) dans Azure, AWS, GCP et sur les machines locales. Les questions d'examen demandent quel plan fournit une fonctionnalité, ce qui doit être connecté ou activé au préalable et quel paramètre contrôle l'analyse des vulnérabilités et l'exposition externe.

<!-- section: defender-cspm | objectives: 4.1.1 -->
## Identifier les risques de sécurité avec Defender CSPM

**Foundational CSPM** est gratuit ; **Defender CSPM** est payant, facturé par ressource facturable (machines virtuelles, comptes de stockage, serveurs de bases de données, applications de fonction et applications web, applications de conteneur...).

| Fonctionnalité | Foundational CSPM | Defender CSPM |
| --- | --- | --- |
| Inventaire des ressources, degré de sécurisation, recommandations, MCSB | Oui | Oui |
| Correction, automatisation des workflows, exportation continue, classeurs | Oui | Oui |
| Normes de conformité réglementaire au-delà du MCSB | Non | Oui |
| Analyse des chemins d'attaque, explorateur de sécurité cloud, hiérarchisation des risques | Non | Oui |
| Analyse sans agent des vulnérabilités et des secrets des machines virtuelles | Non | Oui |
| Découverte sans agent pour Kubernetes, évaluation des vulnérabilités des conteneurs | Non | Oui |
| Découverte des données sensibles (posture de sécurité des données) | Non | Oui |
| Gestion de la posture de sécurité de l'IA | Non | Oui |
| Surface d'attaque externe (EASM) et analyse de l'exposition à Internet | Non | Oui |
| Règles de gouvernance, ressources critiques, recommandations personnalisées | Non | Oui |

Les outils de Defender CSPM :

- **Graphe de sécurité cloud** : le moteur de contexte des autres fonctionnalités (ressources, identités, exposition réseau, sensibilité des données, vulnérabilités).
- **Analyse des chemins d'attaque** : calcule les chemins qu'un attaquant pourrait suivre, par exemple d'une machine virtuelle exposée à Internet avec une vulnérabilité de gravité élevée jusqu'à un compte de stockage contenant des données sensibles, et donne les recommandations qui coupent le chemin.
- **Explorateur de sécurité cloud** : requêtes sur le graphe (modèles ou personnalisées), par exemple « machines virtuelles exposées à Internet avec des vulnérabilités de gravité élevée qui peuvent s'authentifier auprès d'un coffre de clés ».
- **Hiérarchisation des risques** : les recommandations reçoivent un niveau de risque calculé à partir de l'exploitabilité et de l'impact métier ; les **ressources critiques** augmentent la priorité de ce qui compte le plus.
- **Règles de gouvernance** : attribuent automatiquement un propriétaire et une date d'échéance aux recommandations, par étendue ou par condition.

Les composants (extensions) de Defender CSPM se règlent dans **Paramètres d'environnement** > abonnement > **Defender CSPM** > **Paramètres** : analyse sans agent des machines, découverte des données sensibles, gestion des autorisations (CIEM), découverte sans agent pour Kubernetes, évaluation des vulnérabilités des conteneurs.

> **Piège d'examen.** Le degré de sécurisation et les recommandations du MCSB sont gratuits. Une question qui demande des **chemins d'attaque**, l'**explorateur de sécurité cloud**, le contexte des **données sensibles** ou l'**exposition à Internet** exige Defender CSPM ; activer Defender for Servers ne les fournit pas.

<!-- section: regulatory-compliance | objectives: 4.1.2 -->
## Évaluer la conformité par rapport aux frameworks de sécurité

Le tableau de bord **Conformité réglementaire** affiche chaque norme, ses contrôles et les évaluations derrière chaque contrôle. Le **Microsoft cloud security benchmark (MCSB)** est attribué par défaut à chaque abonnement Azure, compte AWS et projet GCP connecté à Defender for Cloud ; les comptes AWS reçoivent aussi **AWS Foundational Security Best Practices** et les projets GCP **GCP Default**. Ajouter d'autres normes (par exemple NIST SP 800-53, PCI DSS, ISO 27001, les benchmarks CIS, des normes AWS et GCP) exige un plan Defender autre que Defender for Servers Plan 1 ou Defender for APIs Plan 1 ; dans **Paramètres d'environnement** > étendue > **Stratégies de sécurité**, activez la norme.

| Type d'évaluation | Comportement |
| --- | --- |
| Automatisée | Évaluée à partir de la configuration des ressources (Azure Policy et évaluations de Defender for Cloud) ; les ressources en échec renvoient vers la correction |
| Manuelle | Demande des preuves du client : sélectionner l'évaluation > **Attester**, joindre les preuves et enregistrer |

Autorisations :

| Tâche | Rôle |
| --- | --- |
| Consulter les données de conformité | Reader sur l'abonnement (**Security Reader ne suffit pas** pour lire les données de conformité des stratégies) |
| Ajouter ou retirer des normes | Au minimum Resource Policy Contributor et Security Admin |

Options de rapport :

- **Télécharger le rapport** : synthèse PDF (ou CSV) d'une norme par contrôle.
- **Rapports d'audit** : les rapports de certification de Microsoft (ISO, SOC, PCI) pour Azure et Dynamics.
- **Exportation continue** des données de conformité réglementaire vers Event Hubs ou un espace de travail Log Analytics, en flux ou en instantanés hebdomadaires.
- **Automatisation des workflows** : un workflow Logic Apps déclenché quand une évaluation de conformité change d'état.
- Les données de conformité apparaissent aussi dans Microsoft Purview Compliance Manager.

> **Piège d'examen.** 100 % de conformité à une norme n'est pas une certification : les contrôles à évaluation manuelle restent non évalués tant qu'ils ne sont pas attestés, et certains contrôles n'ont aucune évaluation automatisée.

<!-- section: workload-protection | objectives: 4.1.3 -->
## Activer et configurer les plans de protection des charges de travail

Les plans s'activent dans **Paramètres d'environnement** > abonnement (ou compte AWS, projet GCP) > **Plans Defender**, en passant chaque plan sur **On**, puis **Paramètres** pour ses composants.

| Plan | Protège | Principaux paramètres configurables |
| --- | --- | --- |
| Serveurs (Plan 1 / Plan 2) | Machines Windows et Linux dans Azure, AWS, GCP, en local | Choix du plan, Defender for Endpoint, évaluation des vulnérabilités, analyse sans agent, surveillance de l'intégrité des fichiers |
| App Service | Applications sur App Service | |
| Bases de données | Azure SQL, serveurs SQL sur des machines, bases de données relationnelles open source, Azure Cosmos DB | Sélection des types de bases de données |
| Stockage | Stockage Blob, Azure Files, Data Lake Storage | Analyse des logiciels malveillants au chargement avec plafond mensuel, détection des menaces sur les données sensibles |
| Conteneurs | Clusters Kubernetes, registres | Capteur, Azure Policy, accès au registre, accès à l'API Kubernetes |
| Key Vault | Accès inhabituels aux coffres | |
| Resource Manager | Opérations de gestion suspectes | |
| API | API publiées dans API Management | |
| AI services | Applications d'IA générative | Preuves des invites, sécurité des données pour les interactions IA |

Les alertes de Defender for DNS font désormais partie de Defender for Servers Plan 2 pour les nouveaux abonnements.

Détails de Defender for Storage utilisés à l'examen :

- Facturé par compte de stockage, plus par Go pour l'analyse des logiciels malveillants.
- Plafond d'analyse des logiciels malveillants : **10 000 Go par compte de stockage et par mois** par défaut, configurable pour l'abonnement ou par compte ; une alerte se déclenche à 75 % et quand l'analyse se met en pause.
- Activation au niveau de l'abonnement (couvre les comptes existants et futurs ; exclusion ou remplacement des paramètres par compte) ou au niveau du compte de stockage.
- Correction intégrée : la **suppression réversible des objets blob malveillants** (désactivée par défaut, au niveau de l'abonnement ou du compte) supprime de manière réversible chaque objet blob détecté comme malveillant et active la suppression réversible des objets blob si elle est désactivée (rétention de 7 jours par défaut, de 1 à 365).
- Pour une réponse personnalisée (déplacement vers un conteneur de quarantaine, notification), les résultats d'analyse déclenchent Event Grid et Azure Functions, ou une automatisation des workflows Logic Apps sur l'alerte de logiciel malveillant.

Activation à grande échelle : des définitions Azure Policy intégrées peuvent activer les plans sur tous les abonnements d'un groupe d'administration (DeployIfNotExists avec une tâche de correction). Defender for Servers Plan 1 et Defender for Storage peuvent aussi se régler par ressource ; le Plan 2 peut seulement être désactivé par ressource.

> **Piège d'examen.** Activer un plan sur l'abonnement protège automatiquement les **nouvelles** ressources. Pour exclure un compte de stockage ou une machine virtuelle, utilisez le remplacement au niveau de la ressource, pas un deuxième abonnement.

<!-- section: multicloud-connectors | objectives: 4.1.4 -->
## Connecter les environnements AWS, GCP et hybrides

Chemin : **Paramètres d'environnement** > **Ajouter un environnement** > **Amazon Web Services** ou **Google Cloud Platform**. Le connecteur est une ressource Azure : choisissez son abonnement, son groupe de ressources et son emplacement, un intervalle d'analyse de **4, 6, 12 ou 24 heures** et les plans (Defender CSPM, Serveurs, Conteneurs, bases de données).

| Élément | AWS | GCP |
| --- | --- | --- |
| Étendue | Compte unique, ou **compte de gestion** (comptes membres découverts et intégrés automatiquement) | Projet unique, ou **organisation** (via un projet de gestion) |
| Déploiement dans l'autre cloud | Modèle CloudFormation (ou Terraform) ; StackSet pour une organisation | Script `gcloud` exécuté dans Cloud Shell |
| Authentification | Approbation fédérée avec des informations d'identification de courte durée (rôles IAM), aucune clé stockée | Fédération d'identité de charge de travail et emprunt d'identité de compte de service, aucune clé stockée |
| Type d'autorisations | Accès par défaut ou accès avec privilège minimum | Accès par défaut ou accès avec privilège minimum |

Prérequis côté Azure : **Contributor** sur l'abonnement qui héberge le connecteur ; pour CIEM (gestion des autorisations dans Defender CSPM), aussi **Security Admin** et l'autorisation `Application.ReadWrite.All` dans le locataire. Vérifiez l'intégrité dans la colonne **État de la connectivité** ; les recommandations apparaissent en quelques heures. Quand vous activez un nouveau plan sur le connecteur, mettez à jour et réexécutez le modèle ou le script. Un connecteur de compte de gestion (AWS) ou d'organisation (GCP) peut exclure des ID de comptes, ou des numéros de projets et des ID de dossiers. Un compte AWS déjà connecté à Microsoft Sentinel exige une procédure dédiée avant de pouvoir être connecté.

Avec Defender for Servers sur un connecteur, les instances EC2 et les machines virtuelles GCP sont intégrées automatiquement comme **serveurs avec Azure Arc**. Les machines locales se connectent en installant l'agent Connected Machine d'Azure Arc (voir le chapitre sur les serveurs).

> **Piège d'examen.** Pour une organisation AWS, connectez le **compte de gestion** ; les comptes d'administrateur délégué ne sont pas pris en charge. L'ajout d'un plan à un connecteur existant n'est terminé qu'après le déploiement du modèle CloudFormation mis à jour dans AWS.

<!-- section: mdvm-settings | objectives: 4.1.5 -->
## Configurer Defender Vulnerability Management pour les machines virtuelles Azure

L'évaluation des vulnérabilités des machines repose sur **Microsoft Defender Vulnerability Management** et est activée par défaut avec Defender for Servers.

| Mode | Exige | Mode de collecte |
| --- | --- | --- |
| Avec agent | Defender for Servers Plan 1 ou 2 + intégration de Defender for Endpoint | Le capteur Defender for Endpoint sur la machine |
| Sans agent | Defender for Servers Plan 2 ou Defender CSPM + analyse sans agent | Instantanés de disques toutes les 24 heures |

L'analyse sans agent vérifie aussi les secrets et les paramètres EDR ; l'analyse des **logiciels malveillants** sans agent (Antivirus Microsoft Defender) n'existe que dans Defender for Servers Plan 2.

Paramètres : **Paramètres d'environnement** > abonnement > Serveurs > **Paramètres** > **Évaluation des vulnérabilités des machines** sur On > **Modifier la configuration** > sélectionner Microsoft Defender Vulnerability Management > **Appliquer** > **Enregistrer**. Une seule machine virtuelle peut aussi être activée avec la ressource REST `Microsoft.Security/serverVulnerabilityAssessments/mdetvm`. Déployer le scanner demande Owner sur le groupe de ressources ; consulter les résultats demande Security Reader.

Travailler avec les résultats :

- **Recommandations** > **Vulnérabilités**, regrouper par ressource, puis ouvrir chaque recommandation : machine concernée, CVE, CVSS, version corrigée et correction.
- Exporter à grande échelle avec Azure Resource Graph (`securityresources`, type `microsoft.security/assessments`).
- Pour accepter un risque, utilisez une **exemption de recommandation** (dérogation ou atténuation, avec une date d'expiration facultative dans le portail Azure). Les règles de désactivation de la recommandation **Machines should have vulnerability findings resolved** (par CVE, ID, catégorie, score CVSS, gravité minimale, état corrigeable) sont en cours de dépréciation au profit des exemptions.
- Avec le Plan 2, les **fonctionnalités premium de Defender Vulnerability Management** sont disponibles dans le portail Microsoft Defender.

```kusto
securityresources
| where type == "microsoft.security/assessments"
| where properties.resourceDetails.ResourceType =~ "microsoft.compute/virtualmachines"
| where properties.metadata.recommendationCategory == "SoftwareUpdate"
| project name, Severity = tostring(properties.metadata.severity)
```

> **Piège d'examen.** Une machine dont la protection des points de terminaison est désactivée reçoit quand même des résultats de vulnérabilités si l'analyse sans agent est active (Plan 2 ou Defender CSPM) ; avec le Plan 1 seul, les résultats exigent le capteur Defender for Endpoint.

<!-- section: easm | objectives: 4.1.6 -->
## Découvrir les ressources non protégées avec Defender EASM

**Microsoft Defender External Attack Surface Management (EASM)** regarde l'organisation de l'extérieur, comme un attaquant : à partir de **valeurs de départ de découverte** (seeds : domaines, blocs d'adresses IP, hôtes, contacts e-mail, ASN, organisations Whois connus), il découvre de façon récursive l'infrastructure liée exposée à Internet, l'analyse et signale les vulnérabilités, les services exposés et les problèmes d'hygiène.

Deux façons de l'utiliser :

| Option | Ce que vous obtenez |
| --- | --- |
| Intégration à Defender CSPM | Incluse dans Defender CSPM, sans licence EASM : découverte de l'extérieur des ressources **cloud** exposées à Internet, chemins d'attaque partant d'IP exposées, requêtes de l'explorateur de sécurité cloud |
| Ressource Defender EASM autonome | Déployée dans un groupe de ressources (vous choisissez la région des données client) ; inventaire complet des ressources Internet de l'organisation, y compris l'informatique fantôme hors des clouds, tableaux de bord sur les vulnérabilités, la conformité et l'hygiène |

États des ressources dans l'inventaire autonome :

| État | Sens |
| --- | --- |
| Approved Inventory | Vous appartient ; affiché dans les tableaux de bord et **réanalysé chaque jour** |
| Candidate | Lié aux valeurs de départ mais non confirmé ; analysé uniquement pendant la découverte ; à examiner et approuver s'il vous appartient |
| Requires Investigation | Comme Candidate, signalé par les scores de confiance pour une validation manuelle |
| Dependency | Infrastructure tierce qui prend en charge vos ressources |
| Monitor Only | Pertinent mais non contrôlé par vous (par exemple un franchisé) |

Rôles sur la ressource EASM : Owner et Contributor créent et modifient les ressources et les éléments d'inventaire, Reader consulte. L'accès entre locataires (y compris via Azure Lighthouse) n'est pas pris en charge. Une ressource supprimée ne peut pas être restaurée.

> **Piège d'examen.** Une ressource nouvellement découverte qui vous appartient reste hors des tableaux de bord et des analyses quotidiennes tant qu'elle est **Candidate** : passez son état à **Approved Inventory**. Et l'exposition à Internet des ressources Azure, AWS et GCP dans les chemins d'attaque vient avec Defender CSPM, sans déployer de ressource EASM distincte.

<!-- section: key-points -->
## Points clés

- Foundational CSPM : degré de sécurisation, recommandations, MCSB. Defender CSPM : chemins d'attaque, explorateur de sécurité, analyse sans agent, données sensibles, posture de l'IA, informations EASM, gouvernance.
- Le MCSB est attribué par défaut ; les autres normes exigent un plan Defender autre que Servers Plan 1 ou APIs Plan 1 ; les contrôles manuels sont attestés ; Security Reader ne peut pas lire les données de conformité.
- Les plans s'activent par abonnement, compte AWS ou projet GCP ; plafond d'analyse des logiciels malveillants du stockage : 10 000 Go par compte et par mois.
- Connecteur AWS : CloudFormation, compte de gestion pour les organisations. GCP : script `gcloud`, fédération d'identité de charge de travail. Contributor sur l'abonnement Azure.
- Évaluation des vulnérabilités = Defender Vulnerability Management, avec agent (Plan 1/2) ou sans agent (Plan 2/Defender CSPM) ; les exemptions remplacent les règles de désactivation.
- EASM : valeurs de départ, découverte, Approved Inventory analysé chaque jour ; CSPM inclut les informations EASM pour les ressources cloud.
