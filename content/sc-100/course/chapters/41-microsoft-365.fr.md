Sécuriser Microsoft 365 est un exercice d'évaluation à l'examen SC-100 : vous mesurez la posture des charges de travail de productivité, puis vous choisissez entre des produits qui semblent se recouvrir. Les menaces liées à la messagerie et à la collaboration relèvent de Microsoft Defender for Office 365, l'usage des applications SaaS et les applications OAuth de Microsoft Defender for Cloud Apps, les appareils de Microsoft Intune, les informations de Microsoft Purview, et Microsoft 365 Copilot n'ajoute aucun nouveau modèle d'autorisations mais rend visible chaque partage excessif existant. Les questions décrivent des exigences et demandent quelle solution, quel plan ou quel contrôle recommander.

<!-- section: m365-posture | objectives: 4.1.1 -->
## Mesurer la posture avec le Niveau de sécurité Microsoft

Le **Niveau de sécurité Microsoft** (Microsoft Secure Score) est la métrique de posture du portail Microsoft Defender pour les identités, les applications, les appareils et les données Microsoft 365. Plus le nombre est élevé, plus les actions recommandées sont en place. C'est une mesure de configuration et de comportement, pas une garantie contre les violations.

Fonctionnement des points :

| Fait | Valeur |
| --- | --- |
| Points par action recommandée | 10 au maximum |
| Actions binaires | Implémentée = 100 % des points |
| Actions partielles | Points proportionnels à la couverture : MFA pour 50 utilisateurs sur 100 pour une action à 10 points donne 5 points |
| Paramètres de sécurité par défaut | Tous les points pour l'inscription MFA de tous les utilisateurs, la MFA des rôles d'administration et le blocage de l'authentification héritée |
| Non applicable ou couvert ailleurs | **Risque accepté**, ou **résolu par un tiers** ou par une **atténuation alternative** : le score reflète la décision |
| Licences | Les recommandations apparaissent pour les produits sous licence, mais la posture absolue ne change pas selon les licences détenues |
| Actualisation | Visualisations en temps réel ; points obtenus synchronisés chaque jour |

Les recommandations couvrent Microsoft Entra ID, Exchange Online, SharePoint Online, Microsoft Teams, Defender for Endpoint, Defender for Identity, Defender for Office 365, Defender for Cloud Apps, Purview Information Protection et la gouvernance des applications, ainsi que les applications SaaS connectées par Defender for Cloud Apps (par exemple Salesforce, ServiceNow, Okta, GitHub, Zoom). Utilisez l'**historique**, les **métriques et tendances** et la **comparaison avec des organisations similaires** pour fixer des indicateurs clés et rendre compte des progrès à la direction.

Accès : avec le RBAC unifié de Defender, les rôles personnalisés ont besoin de **Exposure Management (read)** ou **(manage)** avec la source de données Microsoft Security Exposure Management ; avec les rôles Microsoft Entra, Security Administrator (ainsi qu'Exchange ou SharePoint Administrator) peut changer les statuts, Security Reader et Global Reader ne peuvent que lire.

Quel score répond à quelle question :

| Exigence | Métrique |
| --- | --- |
| Posture des charges de travail et des identités Microsoft 365 | Niveau de sécurité Microsoft (Microsoft Secure Score) |
| Posture des ressources Azure, AWS et GCP | **Score de sécurité** (secure score) de Microsoft Defender for Cloud (Cloud Secure Score fondé sur les risques dans le portail Defender, score de sécurité classique dans le portail Azure) |
| Progression vers une réglementation (RGPD, ISO 27001, NIST) | **Score de conformité** de Microsoft Purview Compliance Manager |
| Configuration des points de terminaison uniquement | Microsoft Secure Score for Devices (Defender Vulnerability Management) |
| Mauvaises configurations d'une application SaaS tierce | Gestion de la posture de sécurité SaaS (SSPM) de Defender for Cloud Apps, remontée dans Secure Score |

> **Piège d'examen.** Le Niveau de sécurité Microsoft et le score de sécurité de Defender for Cloud sont deux métriques différentes. « Suivre la posture de sécurité d'Exchange Online et de Teams » relève de Microsoft Secure Score ; « suivre la posture des abonnements Azure et des comptes AWS » relève de Defender for Cloud.

<!-- section: mdo-mdca | objectives: 4.1.2 -->
## Defender for Office 365 et Defender for Cloud Apps

Chaque boîte aux lettres cloud dispose d'**Exchange Online Protection (EOP)**. Defender for Office 365 ajoute deux plans :

| Fonctionnalité | EOP | Plan 1 | Plan 2 |
| --- | --- | --- | --- |
| Anti-programme malveillant, anti-courrier indésirable, protection contre l'usurpation, quarantaine, purge automatique zéro heure (ZAP) pour les e-mails | Oui | Oui | Oui |
| Protection contre l'emprunt d'identité d'utilisateur et de domaine, intelligence des boîtes aux lettres | Non | Oui | Oui |
| **Pièces jointes fiables** (Safe Attachments : e-mail, SharePoint, OneDrive, Teams) et **Liens fiables** (Safe Links : e-mail, Office, Teams) | Non | Oui | Oui |
| Outil d'investigation | Suivi des messages, rapports | **Détections en temps réel** | **Threat Explorer**, Threat Trackers, campagnes |
| **Investigation et réponse automatisées (AIR)** | Non | Non | Oui |
| **Formation à la simulation d'attaque**, protection des comptes prioritaires | Non | Non | Oui |

Le Plan 1 est inclus dans Microsoft 365 E3/G3 et Microsoft 365 Business Premium ; le Plan 2 dans Microsoft 365 E5 (ainsi que A5 et G5) ; les deux sont vendus en module complémentaire. Déployez la protection avec les **stratégies de sécurité prédéfinies** **Standard** ou **Strict** plutôt qu'avec des stratégies construites à la main : Microsoft fait évoluer leurs paramètres avec les menaces.

**Defender for Cloud Apps** est le CASB (cloud access security broker) de Microsoft, et davantage :

| Exigence | Fonctionnalité |
| --- | --- |
| Trouver les applications cloud non approuvées (shadow IT) et évaluer leur risque | **Cloud Discovery** : journaux de trafic (intégration Defender for Endpoint, collecteur de journaux) comparés au catalogue d'applications cloud et à ses indicateurs de risque ; approuver ou désapprouver les applications |
| Analyser les fichiers et les activités d'une application SaaS approuvée | **Connecteurs d'applications** (API) |
| Bloquer les téléchargements depuis des appareils non gérés pendant une session | **Contrôle d'application par accès conditionnel** (Conditional Access app control : stratégies de session, lancées depuis une stratégie d'accès conditionnel Microsoft Entra) |
| Détecter les applications OAuth inutilisées ou dotées de trop de privilèges, et leurs informations d'identification | **Gouvernance des applications** (app governance) |
| Trouver les mauvaises configurations de Salesforce, ServiceNow ou GitHub | **Gestion de la posture de sécurité SaaS (SSPM)**, remontée dans Secure Score |
| Appliquer des étiquettes de confidentialité ou retirer des collaborateurs externes sur les fichiers confidentiels des applications SaaS | Stratégies de fichiers avec actions de gouvernance, intégrées à Microsoft Purview ; les stratégies de fichiers sont mises hors service le 6 janvier 2027, donc les nouvelles conceptions utilisent les stratégies DLP ou d'étiquetage automatique de Purview |
| Détecter un voyage impossible, un téléchargement massif, une activité de rançongiciel dans les applications SaaS | Protection contre les menaces avec l'analyse du comportement des utilisateurs et des entités, dans les incidents Defender XDR |

> **Piège d'examen.** Le hameçonnage et les pièces jointes malveillantes relèvent de Defender for Office 365 ; le consentement OAuth malveillant et l'usage risqué des applications SaaS relèvent de Defender for Cloud Apps. « Investiguer une campagne et corriger automatiquement » exige le **Plan 2**, car Threat Explorer et AIR ne sont pas dans le Plan 1.

<!-- section: intune | objectives: 4.1.3 -->
## Gestion des appareils avec Microsoft Intune

Intune est un service de gestion des points de terminaison entièrement cloud pour Windows, macOS, iOS/iPadOS, Android et Linux. Il n'authentifie personne : il s'appuie sur Microsoft Entra ID et transmet l'**état de conformité** de chaque appareil à l'accès conditionnel, ce qui ferme la boucle Confiance Zéro (utilisateur, appareil, application, emplacement, risque).

| Modèle | Ce qu'Intune gère | Cas typique | Réinitialisation sélective |
| --- | --- | --- | --- |
| Gestion des appareils mobiles (MDM) | L'appareil inscrit entier : paramètres, sécurité, applications | Appareils d'entreprise (Windows Autopilot, Apple Automated Device Enrollment, Android Enterprise) | Réinitialisation complète ou mise hors service |
| Gestion des applications mobiles (MAM) | Uniquement les applications professionnelles et leurs données, par des **stratégies de protection des applications** | Appareils personnels (BYOD) que les utilisateurs refusent d'inscrire | Données de l'organisation uniquement |

Briques de conception :

| Exigence | Fonctionnalité Intune |
| --- | --- |
| N'autoriser l'accès que depuis des appareils gérés et sains | **Stratégie de conformité** + contrôle d'octroi d'accès conditionnel **Require device to be marked as compliant** |
| Protéger les données de l'entreprise sur des téléphones non gérés (pas de copie vers les applications personnelles, code PIN, chiffrement) | **Stratégie de protection des applications** + contrôle d'octroi **Require app protection policy** |
| Bloquer les appareils que Defender for Endpoint évalue à risque élevé | Connecteur Defender for Endpoint + paramètre de conformité sur le score de risque de la machine |
| Imposer BitLocker, le pare-feu, l'antivirus, la réduction de la surface d'attaque, l'intégration EDR | Stratégies de **sécurité des points de terminaison** |
| Appliquer le durcissement recommandé par Microsoft | **Bases de référence de sécurité** |
| Provisionner sans intervention les nouveaux appareils Windows | Windows Autopilot |
| Conserver Configuration Manager pour les charges de travail locales pendant le passage au cloud | Cogestion |
| Retirer les droits d'administrateur local mais élever les applications approuvées | Endpoint Privilege Management (fonctionnalité avancée, Intune Suite ou module complémentaire) |

> **Piège d'examen.** « Les utilisateurs n'inscriront pas leur téléphone personnel, mais la messagerie d'entreprise ne doit pas être copiée dans des applications personnelles » relève de la MAM avec des stratégies de protection des applications, pas d'une stratégie de conformité : une stratégie de conformité nécessite un appareil inscrit.

<!-- section: purview-m365 | objectives: 4.1.4 -->
## Sécuriser les données Microsoft 365 avec Microsoft Purview

Purview protège les informations où qu'elles aillent, selon le cycle **connaître ses données, les protéger, empêcher leur perte, les gouverner** :

| Exigence | Solution Purview |
| --- | --- |
| Détecter des numéros de carte bancaire, des identifiants ou des valeurs exactes issues d'une base clients | **Types d'informations sensibles** (intégrés, personnalisés, **correspondance exacte des données** (EDM)) |
| Reconnaître des contrats, des CV ou du code source par catégorie de contenu | **Classifieurs entraînables** |
| Chiffrer et marquer un document pour que la protection le suive hors du locataire | **Étiquettes de confidentialité** avec chiffrement et marquage du contenu |
| Contrôler la confidentialité et le partage externe des équipes Teams, des groupes Microsoft 365 et des sites SharePoint | Étiquettes de confidentialité pour les **conteneurs** |
| Étiqueter le contenu existant sans action de l'utilisateur | **Étiquetage automatique** (côté client dans les applications Office, côté service pour SharePoint, OneDrive et Exchange) |
| Bloquer ou avertir quand des données sensibles sont partagées par e-mail, Teams, SharePoint, OneDrive ou depuis les points de terminaison | **Protection contre la perte de données (DLP)** |
| Conserver ou supprimer le contenu pendant une durée définie, déclarer des enregistrements | **Gestion du cycle de vie des données** et **gestion des enregistrements** (stratégies et étiquettes de rétention) |
| Détecter un employé sur le départ qui exfiltre des données | **Gestion des risques internes** (Insider Risk Management) |
| Détecter du harcèlement ou des violations réglementaires dans les messages | **Conformité des communications** (Communication Compliance) |
| Empêcher deux groupes de communiquer (cloison éthique) | **Obstacles aux informations** (information barriers) |
| Rechercher, conserver et exporter du contenu pour des affaires juridiques | **eDiscovery** |
| Enquêter sur qui a accédé à quoi | **Audit** |
| Microsoft ne doit jamais pouvoir déchiffrer le contenu le plus sensible | **Double Key Encryption** (une clé détenue par le client) |
| Contrôler les clés racines qui chiffrent les données Microsoft 365 au repos | **Customer Key** |
| Hiérarchiser les risques à partir de tous ces signaux | **Gestion de la posture de sécurité des données (DSPM)** |

Ordre de conception : définir d'abord la taxonomie des étiquettes et la classification, publier les étiquettes, puis construire les stratégies DLP et de gestion des risques internes sur ces étiquettes, et démarrer les stratégies en mode simulation ou audit avant de les appliquer.

> **Piège d'examen.** La DLP ne chiffre rien et une étiquette de confidentialité n'empêche pas un utilisateur d'envoyer un fichier par e-mail. « Empêcher les utilisateurs d'envoyer à des destinataires externes des documents contenant des numéros de carte bancaire » relève de la DLP ; « garder les fichiers chiffrés même après leur téléchargement » relève d'une étiquette de confidentialité avec chiffrement.

<!-- section: copilot-controls | objectives: 4.1.5 -->
## Sécurité des données et conformité pour Microsoft 365 Copilot

Microsoft 365 Copilot fonde ses réponses sur Microsoft Graph et l'index sémantique, et **ne fait apparaître que les données que l'utilisateur peut déjà consulter**. Les invites, les réponses et les données consultées par Graph ne servent pas à entraîner les modèles de fondation. Copilot ne crée pas de nouvel accès ; il rend le partage excessif existant facile à trouver. La conception de la sécurité commence donc par les autorisations.

| Risque ou exigence | Contrôle |
| --- | --- |
| Sites partagés à l'excès (Everyone except external users, liens larges) | SharePoint Advanced Management : rapports de gouvernance de l'accès aux données, révisions d'accès aux sites, **contrôle d'accès restreint** (restricted access control) ; **évaluations des risques liés aux données** de Purview DSPM |
| Exclure un site de Copilot et de la recherche à l'échelle de l'organisation pendant que les propriétaires corrigent les autorisations | **Découverte de contenu restreinte** (restricted content discovery, qui ne change pas qui peut ouvrir le site) |
| Copilot ne doit pas renvoyer le contenu de fichiers chiffrés à des utilisateurs non autorisés | Étiquettes de confidentialité avec chiffrement : l'utilisateur a besoin des droits d'utilisation **VIEW** et **EXTRACT** |
| Copilot ne doit pas résumer les fichiers ou e-mails portant une étiquette donnée | **Stratégie DLP pour l'emplacement Copilot** (nommé Microsoft Copilot, Copilot Chat, and Copilot Cowork) : condition sur les étiquettes de confidentialité |
| Copilot ne doit pas répondre aux invites contenant des types d'informations sensibles, ni lancer de recherche web pour elles | Même emplacement DLP : actions de **traitement des invites** et de **recherches web** (blocage des invites en préversion) |
| Détecter une injection d'invite ou l'accès à des contenus protégés par un initié | Gestion des risques internes, modèle de stratégie **Risky AI usage** |
| Détecter un contenu inapproprié dans les invites et les réponses | Conformité des communications |
| Enregistrer et investiguer les interactions avec Copilot | **Audit** (un enregistrement par interaction : identifiants des messages, indicateur invite ou réponse, ressources consultées et leurs étiquettes de confidentialité, pas le texte) et explorateur d'activités DSPM |
| Conserver ou supprimer les interactions, les retrouver pour une affaire juridique | Stratégies de rétention pour les applications d'IA ; **eDiscovery** (les interactions sont stockées dans la boîte aux lettres de l'utilisateur) |
| Évaluer les réglementations sur l'IA | Modèles Compliance Manager pour l'IA générative |
| Contrôler quels agents les utilisateurs peuvent exécuter | Centre d'administration Microsoft 365, **Applications intégrées** |

Faits DLP qui décident des réponses : l'emplacement Copilot n'existe que dans le modèle de stratégie **personnalisé** et exclut les autres emplacements de la même stratégie ; une règle ne peut pas combiner une condition sur les étiquettes de confidentialité et une condition sur les types d'informations sensibles (utilisez deux règles) ; un élément étiqueté peut encore apparaître dans les **citations** ; le contenu des fichiers chargés dans une invite n'est pas analysé ; les modifications de stratégie prennent jusqu'à quatre heures.

> **Piège d'examen.** « Des utilisateurs voient des fichiers RH confidentiels dans les réponses de Copilot » n'est pas un paramètre de Copilot à changer : ces utilisateurs ont déjà l'accès. La correction porte sur les autorisations (révisions d'accès, contrôle d'accès restreint), avec la découverte de contenu restreinte ou une règle DLP fondée sur les étiquettes comme barrière temporaire.

<!-- section: key-points -->
## Points clés

- Niveau de sécurité Microsoft : posture Microsoft 365, 10 points au maximum par action, statuts risque accepté ou atténuation alternative ; le score de sécurité de Defender for Cloud concerne les ressources cloud, Compliance Manager les réglementations.
- Defender for Office 365 Plan 2 = Threat Explorer, AIR, formation à la simulation d'attaque ; Plan 1 = Liens fiables, Pièces jointes fiables, protection contre l'emprunt d'identité.
- Defender for Cloud Apps : Cloud Discovery, connecteurs d'applications, contrôle d'application par accès conditionnel, gouvernance des applications, SSPM.
- Intune : MDM avec stratégies de conformité pour les appareils gérés, MAM avec stratégies de protection des applications pour le BYOD ; l'accès conditionnel applique les deux.
- Purview : classer (types d'informations sensibles, classifieurs entraînables), protéger (étiquettes), empêcher la perte (DLP), gouverner (rétention, risques internes, eDiscovery, Audit).
- Copilot respecte les autorisations et les droits EXTRACT ; corriger d'abord le partage excessif, puis DLP pour l'emplacement Copilot, audit, rétention et eDiscovery.
