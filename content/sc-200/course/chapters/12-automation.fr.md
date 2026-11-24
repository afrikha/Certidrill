L'automatisation est le sujet où la SC-200 mélange le plus les produits. Dans Defender XDR, l'enquête et la réponse automatisées (AIR) corrigent les menaces selon le niveau d'automatisation de chaque groupe d'appareils, et l'interruption automatique des attaques contient les utilisateurs et les appareils pendant une attaque. Dans Microsoft Sentinel, les règles d'automatisation trient les incidents et les alertes sans code et exécutent des playbooks, qui sont des workflows Azure Logic Apps. L'examen demande quel mécanisme répond à une exigence, quel paramètre autorise ou bloque une action automatique, et quelle autorisation manque quand l'automatisation échoue.

<!-- section: air | objectives: 1.1.7 -->
## L'enquête et la réponse automatisées

AIR examine les alertes et corrige les preuves qu'elle juge malveillantes, ce qui réduit le volume d'alertes que le SOC traite à la main.

| Étape | Ce qui se passe |
| --- | --- |
| Déclenchement | Une alerte se déclenche et un incident est créé ; les alertes suivantes sur la même menace rejoignent l'incident et l'enquête |
| Extension de l'étendue | Les autres appareils où apparaissent la même menace ou une entité incriminée sont ajoutés. À partir de 10 appareils pour une entité, l'extension elle-même demande une approbation |
| Verdict | Chaque preuve est **Malicious** (malveillante), **Suspicious** (suspecte) ou **No threats found** (aucune menace trouvée) |
| Correction | Des actions comme mettre un fichier en quarantaine, arrêter un service, supprimer une tâche planifiée. Elles s'exécutent automatiquement ou attendent une approbation, selon le niveau d'automatisation du groupe d'appareils |
| Suivi | **Centre de notifications (Action center)** : onglet **Pending** (approuver ou rejeter) et onglet **History** (actions terminées, qui peuvent être annulées) |

Les règles à retenir :

- Une action en attente non approuvée sous 7 jours expire, ce qui équivaut à un rejet.
- Pour **les e-mails et le contenu Office**, AIR peut être déclenchée par des alertes, mais aucune correction n'est appliquée automatiquement : les actions attendent une approbation dans le centre de notifications.
- Prérequis de l'expérience Defender XDR complète : Microsoft 365 E5 (ou une offre équivalente), Defender for Endpoint et l'Antivirus Defender configurés, Defender for Office 365 configuré, Defender for Identity et Defender for Cloud Apps intégrés. La configuration demande Security Administrator ou plus.
- Un indicateur **Allow** fait ignorer à AIR un verdict défavorable ; un indicateur **Block** fait traiter l'élément comme malveillant. Les exclusions de dossiers d'automatisation font ignorer des dossiers à AIR.
- Approuver des actions demande l'autorisation **Active remediation actions** (Security operations) dans un rôle Defender for Endpoint, ou son équivalent en RBAC unifié.

**Changement de 2026.** Microsoft Learn indique que depuis le 1er septembre 2026, l'AIR de Defender for Endpoint ne s'exécute plus comme une expérience d'enquête distincte et ne peut plus être déclenchée manuellement : ses capacités de détection et de réponse s'exécutent automatiquement dans la pile de protection antivirus par défaut, et une analyse antivirus complète remplace l'enquête à la demande. Les niveaux d'automatisation des groupes d'appareils décident toujours si la correction est automatique ou en attente.

> **Piège d'examen.** Si les actions de correction restent dans l'onglet **Pending**, la solution est le niveau d'automatisation du groupe d'appareils (Full), pas un nouveau rôle pour l'analyste. Si elles n'apparaissent jamais, vérifiez que le groupe d'appareils n'est pas en **No automated response**.

<!-- section: attack-disruption | objectives: 1.1.8 -->
## L'interruption automatique des attaques

L'interruption des attaques corrèle les signaux des points de terminaison, des identités, de la messagerie et des applications SaaS en un incident de haute confiance, identifie les ressources que contrôle l'attaquant et les contient automatiquement, par exemple pendant un rançongiciel ou une compromission de messagerie professionnelle (BEC). Le SOC enquête ensuite et libère les ressources.

| Action | Produit qui l'exécute |
| --- | --- |
| Contenir l'appareil, contenir l'IP, isoler l'appareil (isolation automatique en préversion) | Defender for Endpoint |
| Contenir l'utilisateur | Defender for Endpoint |
| Désactiver l'utilisateur (Active Directory) | Defender for Identity, par le capteur d'un contrôleur de domaine |
| Révoquer la session, suspendre l'utilisateur | Microsoft Entra ID |
| Interrompre une application OAuth compromise | Defender for Cloud Apps |
| Suspendre l'utilisateur dans Okta, attacher une stratégie de refus à un utilisateur AWS (préversion) | Microsoft Sentinel, avec le connecteur du fournisseur sur un espace de travail connecté au portail Defender |

Les prérequis que l'examen teste :

| Produit | Exigence |
| --- | --- |
| Defender for Endpoint | Découverte des appareils en **Standard discovery** (pour Contain device) ; niveau d'automatisation **Full** recommandé sur les groupes d'appareils (un niveau **Semi** laisse aussi l'interruption agir sans approbation manuelle) ; agent Sense 10.8470 ou ultérieur pour Contain user |
| Defender for Identity | Stratégies d'audit sur les contrôleurs de domaine ; le compte d'action est par défaut le **LocalSystem** du contrôleur de domaine ; un capteur sur le contrôleur de domaine où le compte est désactivé |
| Defender for Cloud Apps | Microsoft 365 connecté avec le connecteur **Microsoft Office 365**, toutes les options cochées |
| Defender for Office 365 | Boîtes aux lettres dans Exchange Online, avec l'audit de MailItemsAccessed, UpdateInboxRules, MoveToDeletedItems, SoftDelete et HardDelete |

L'interruption est active par défaut. Vous ne l'activez pas ; vous **excluez** des ressources dans **Paramètres > Microsoft Defender XDR > Automated response** :

| Exclure | Comment |
| --- | --- |
| Un compte d'utilisateur (par exemple un compte de secours) | **Identities** > **Add user exclusion** |
| Des appareils | **Devices** > **Device groups** : passer le niveau d'automatisation du groupe à **No automated response** (cela arrête aussi les actions AIR sur ce groupe) |
| Des adresses IP | **Devices** > **Exclude IP** : adresses, plages ou sous-réseaux |
| Certains contrôles pour certains appareils (préversion) | Règle **Policy application** sur une étiquette dynamique |

Exclure des appareils demande Security Administrator, ou Security Operator ou **Core security settings (manage)** en RBAC unifié. Les Security Readers peuvent seulement consulter les exclusions. Se retirer complètement demande un dossier de support ; Microsoft recommande plutôt les exclusions.

Dans la file d'incidents, les incidents interrompus portent l'étiquette **Attack Disruption** ; la page de l'incident affiche une bannière jaune et l'état des ressources (compte désactivé, appareil contenu). Chaque action est enregistrée dans le centre de notifications et peut être annulée par le SOC.

> **Piège d'examen.** Un processus qui réactive automatiquement les comptes (par exemple un script qui impose « tous les employés sont activés ») peut annuler l'interruption d'un compte compromis. Et l'interruption des attaques agit sur les appareils quel que soit l'état de l'Antivirus Defender : actif, passif ou EDR en mode bloc.

<!-- section: device-groups | objectives: 1.1.9 -->
## Groupes d'appareils, autorisations et niveaux d'automatisation

Les **groupes d'appareils** (Paramètres > Points de terminaison > Autorisations > Groupes d'appareils > **Add device group**) servent à trois choses : limiter quels analystes voient quels appareils, fixer le niveau d'automatisation, et délimiter des paramètres comme les indicateurs et les règles de notification.

| Page de l'assistant | Contenu |
| --- | --- |
| Général | Nom unique, **niveau d'automatisation**, description |
| Appareils | Règle de correspondance sur le nom de l'appareil, le domaine, l'étiquette et la plateforme du système (toutes les conditions doivent correspondre ; jusqu'à 10 valeurs par propriété, combinées par OR) |
| Aperçu des appareils | Jusqu'à 10 appareils correspondants |
| Accès des utilisateurs | Groupes Microsoft Entra qui ont déjà un rôle |

| Règle | Détail |
| --- | --- |
| Chevauchement | Un appareil qui correspond à plusieurs groupes ne rejoint que celui de **rang le plus élevé** (le rang 1 est le plus élevé) ; promouvez ou rétrogradez les groupes pour changer cela |
| Groupe par défaut | **Ungrouped devices** : impossible à supprimer ou à reclasser, mais son niveau d'automatisation et l'accès des utilisateurs peuvent changer |
| Accès | Un groupe sans groupe Entra attribué est visible de tous les utilisateurs ayant accès au portail |
| Limite | 2 000 groupes d'appareils par locataire |
| Propagation | Plusieurs minutes, parfois plusieurs heures |

Les niveaux d'automatisation :

| Niveau | Correction |
| --- | --- |
| Full - remediate threats automatically | Automatique ; les actions apparaissent dans History. Recommandé, et valeur par défaut des locataires créés depuis le 16 août 2020 |
| Semi - require approval for all folders | Toutes les actions en attente |
| Semi - require approval for core folders | En attente pour les fichiers des dossiers système comme `\windows\*`, automatique ailleurs |
| Semi - require approval for non-temp folders | Automatique uniquement dans les dossiers temporaires comme `\users\*\downloads\*` ou `\windows\temp\*` (la liste d'exemples de Learn inclut aussi `\program files\` et `\program files (x86)\*`), en attente ailleurs |
| No automated response | Ni enquête automatisée ni correction ; déconseillé |

**Autorisations.** Les rôles Defender for Endpoint (Paramètres > Points de terminaison > Rôles > **Add role**) combinent des autorisations et sont attribués à des groupes Entra, puis liés à des groupes d'appareils :

| Autorisation | Permet |
| --- | --- |
| View data | Données des opérations de sécurité, données de Defender Vulnerability Management |
| Active remediation actions | Actions de réponse, approuver ou ignorer les actions en attente, gérer les indicateurs |
| Alerts investigation | Gérer les alertes, lancer des enquêtes, exécuter des analyses, collecter des packages d'investigation, gérer les étiquettes d'appareils |
| Manage security settings in Security Center | Suppression des alertes, exclusions de dossiers d'automatisation, intégration des appareils, notifications par e-mail, indicateurs |
| Manage portal system settings | Chargements automatisés de fichiers, rôles et groupes d'appareils (uniquement dans le rôle d'administrateur par défaut) |
| Live response capabilities | **Basic** (commandes en lecture seule, téléchargement de fichiers) ou **Advanced** (envoi de fichiers, exécution de scripts de la bibliothèque) |

Depuis le 16 février 2025, les nouveaux clients Defender for Endpoint n'ont que le modèle **RBAC unifié de Microsoft Defender XDR** ; les clients existants conservent leurs rôles Defender for Endpoint jusqu'à leur migration. En RBAC unifié, les rôles personnalisés combinent des groupes d'autorisations (Security operations, Security posture, Authorization and settings, et Data operations en préversion) et sont attribués à des utilisateurs ou des groupes avec une étendue de sources de données et de collections de données Sentinel. Les groupes d'appareils de Defender for Endpoint, configurés séparément, décident toujours des appareils que ces utilisateurs voient et sur lesquels ils agissent.

> **Piège d'examen.** Un analyste qui doit collecter des packages d'investigation sans exécuter de scripts a besoin d'**Alerts investigation**, pas de **Live response capabilities: Advanced**. Le privilège minimum, c'est en général l'autorisation la plus étroite, sur le seul groupe d'appareils de l'analyste.

<!-- section: automation-rules | objectives: 1.1.10 -->
## Les règles d'automatisation de Microsoft Sentinel

Les règles d'automatisation se créent dans **Microsoft Sentinel > Configuration > Automatisation** (ou depuis l'onglet **Réponse automatisée** d'une règle d'analytique, ou depuis un incident). Elles demandent **Microsoft Sentinel Contributor**.

| Élément | Valeurs |
| --- | --- |
| Déclencheur | **Quand un incident est créé**, **Quand un incident est mis à jour**, **Quand une alerte est créée** |
| Conditions | Propriétés de l'incident avec des opérateurs (égal à, contient, commence par, se termine par et leurs négations) ; en mise à jour aussi **modifié**, **modifié de**, **modifié en**, **ajouté** et **Mis à jour par** ; propriétés des entités sur les déclencheurs d'incident |
| Actions | Exécuter un playbook, changer le statut (avec motif et commentaire de clôture), changer la gravité, attribuer un propriétaire, ajouter une étiquette, ajouter une tâche |
| Ordre | Un numéro ; les règles d'un même déclencheur s'exécutent séquentiellement dans cet ordre, jamais en parallèle. Les règles de création passent avant les règles de mise à jour |
| Expiration | Date facultative après laquelle la règle est désactivée |

Les règles à retenir :

- Le déclencheur d'alerte fonctionne pour les alertes des règles d'analytique **planifiées**, **NRT** et **Microsoft security**, avec les règles d'analytique comme seule condition.
- Dans le portail Defender, les règles de création d'incidents de Sentinel doivent être désactivées : les incidents viennent de la corrélation Defender XDR. L'automatisation à déclencheur d'alerte pour les alertes Defender XDR n'est pas disponible. Plusieurs modifications d'un incident en 5 à 10 minutes arrivent dans Sentinel en une seule mise à jour.
- **Mis à jour par** distingue une modification faite par un utilisateur, une application, un playbook, une autre règle d'automatisation, AIR ou le regroupement d'alertes : servez-vous-en pour éviter les boucles.
- Deux règles de même numéro d'ordre s'exécutent dans un ordre aléatoire.
- Les règles d'automatisation s'exportent en modèles ARM pour d'autres espaces de travail.

| Exigence | Réponse |
| --- | --- |
| Fermer pendant deux semaines les incidents d'un test d'intrusion connu | Règle d'automatisation, déclencheur de création, condition sur la règle d'analytique ou l'entité, statut Fermé, date d'expiration |
| Donner une liste de contrôle à chaque nouvel incident d'une règle | Règle d'automatisation avec **Ajouter une tâche** |
| Augmenter la gravité quand un compte VIP apparaît | Règle d'automatisation avec une condition d'entité et **Changer la gravité** |
| Attribuer à une équipe les incidents de nombreuses règles d'analytique | Une règle d'automatisation dont la condition liste ces règles |
| Prévenir un canal Teams quand un incident est fermé | Déclencheur de mise à jour, condition « Statut modifié en Fermé », action **Exécuter un playbook** |

> **Piège d'examen.** « Réduire l'effort administratif » et une action disponible dans la liste (statut, gravité, propriétaire, étiquette, tâche) désignent une règle d'automatisation. Un playbook n'est la réponse que si l'action exige un connecteur ou plusieurs étapes.

<!-- section: playbooks | objectives: 1.1.11 -->
## Les playbooks Microsoft Sentinel

Un playbook est un workflow Logic Apps qui commence par un déclencheur Microsoft Sentinel. Créez-le dans **Automatisation** > **Créer** > **Logic App playbook**, à partir d'un modèle (solutions du hub de contenu et galerie de modèles de playbooks) ou vide.

| Choix | Détail |
| --- | --- |
| Déclencheur | **Incident** (l'incident avec ses alertes et entités), **alerte** ou **entité**. Un playbook d'incident s'exécute depuis des règles d'automatisation à déclencheur d'incident, un playbook d'alerte depuis des règles d'automatisation à déclencheur d'alerte ; un playbook d'entité s'exécute manuellement sur une entité, par exemple pendant la chasse |
| Plan | **Consumption** (modèles par déclencheur) ou **Standard** (Blank playbook ; points de terminaison privés et intégration au réseau virtuel pour les ressources protégées) |
| Authentification auprès de Sentinel | **Identité managée** (recommandée), principal de service ou utilisateur OAuth |

Les autorisations sont la partie la plus testée :

| Qui | A besoin de | Pour |
| --- | --- | --- |
| L'ingénieur qui écrit le playbook | **Logic App Contributor** (Consumption) ou un rôle Logic Apps Standard | Créer et modifier le workflow |
| L'analyste qui l'exécute manuellement | **Microsoft Sentinel Playbook Operator** | Exécuter un playbook sur un incident, une alerte ou une entité |
| L'identité managée du playbook | **Microsoft Sentinel Responder** sur l'espace de travail (mettre à jour les incidents), Reader s'il ne fait que lire | Agir sur Sentinel |
| Le compte de service Sentinel | **Microsoft Sentinel Automation Contributor** sur le groupe de ressources du playbook, accordé avec **Gérer les autorisations des playbooks** par un **Owner** ou un **User Access Administrator** | Permettre aux règles d'automatisation d'exécuter le playbook |

Dans le concepteur, les sorties du déclencheur (ID ARM de l'incident, entités, détails personnalisés) se choisissent dans **Contenu dynamique**. Un playbook d'entité exécuté hors d'un incident reçoit un ID ARM d'incident nul : testez-le avec une condition avant de l'utiliser. L'historique des exécutions se trouve sur la page de l'application logique, et dans l'onglet **Runs** du volet **Run playbook** d'un incident.

> **Piège d'examen.** Le playbook est listé mais la règle d'automatisation n'arrive pas à l'exécuter : le compte de service de Sentinel n'a pas d'autorisation sur le groupe de ressources du playbook. Donner Logic App Contributor à l'analyste ne règle rien ; un Owner ou un User Access Administrator doit accorder **Gérer les autorisations des playbooks**.

<!-- section: key-points -->
## Points clés

- AIR corrige selon le niveau d'automatisation du groupe d'appareils ; les actions en attente s'approuvent dans le centre de notifications sous 7 jours. La correction des e-mails attend toujours une approbation.
- L'interruption des attaques est active par défaut : excluez les utilisateurs dans Automated response > Identities, les appareils par **No automated response**, les IP avec Exclude IP.
- Groupes d'appareils : le rang le plus élevé l'emporte, Ungrouped devices ne peut pas être supprimé, 2 000 par locataire ; l'automatisation complète est recommandée.
- Les nouveaux locataires depuis février 2025 utilisent le RBAC unifié ; les rôles Defender for Endpoint associent des autorisations à des groupes Entra et à des groupes d'appareils.
- Règle d'automatisation = déclencheur + conditions + actions ordonnées + expiration facultative, sans code ; playbook = Logic Apps pour les connecteurs et la logique en plusieurs étapes.
- Playbook Operator exécute, Logic App Contributor modifie, Automation Contributor permet à Sentinel d'exécuter les playbooks, l'identité managée a besoin de Responder.
