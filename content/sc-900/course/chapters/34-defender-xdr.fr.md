Une attaque reste rarement au même endroit : un e-mail d'hameçonnage vole des informations d'identification, puis l'attaquant passe à un appareil et aux applications cloud. Microsoft Defender XDR réunit les signaux de plusieurs services Defender en une seule histoire. L'examen demande quel service protège quoi.

<!-- section: defender-xdr-services | objectives: 3.4.1 -->
## Services Microsoft Defender XDR

**Microsoft Defender XDR** (détection et réponse étendues, extended detection and response) est une suite unifiée de défense d'entreprise, avant et après violation, qui coordonne la détection, la prévention, l'investigation et la réponse sur les **points de terminaison, les identités, l'e-mail et les applications**.

| Service | Protège |
| --- | --- |
| **Microsoft Defender pour point de terminaison** (Defender for Endpoint) | Les appareils : ordinateurs portables, téléphones, tablettes, PC |
| **Gestion des vulnérabilités Microsoft Defender** (Defender Vulnerability Management) | Les ressources, en trouvant et en corrigeant les vulnérabilités et les erreurs de configuration |
| **Microsoft Defender pour Office 365** | L'e-mail, les liens et les outils de collaboration (Teams, SharePoint, OneDrive) |
| **Microsoft Defender pour Identity** | Les identités d'Active Directory local et des environnements hybrides |
| **Microsoft Entra ID Protection** | Les identités cloud, contre les risques liés à l'identité |
| **Microsoft Defender pour les applications cloud** (Defender for Cloud Apps) | Les applications SaaS et les données qu'elles contiennent |

Ce que la suite ajoute au-dessus de chaque service :

- **File d'attente d'incidents combinée** : les alertes et les ressources liées sont regroupées en un seul incident qui raconte toute l'histoire de l'attaque.
- **Interruption automatique des attaques** : contient une attaque en cours, par exemple en isolant un appareil ou en désactivant un compte compromis.
- **Autoréparation** : des actions automatiques remettent dans un état sûr les appareils, les identités et les boîtes aux lettres touchés.

<!-- section: defender-office-365 | objectives: 3.4.2 -->
## Microsoft Defender pour Office 365

**Defender pour Office 365** protège contre les menaces comme l'hameçonnage et les programmes malveillants qui arrivent par les e-mails, les liens (URL), les pièces jointes et les outils de collaboration.

| Fonctionnalité | Rôle |
| --- | --- |
| **Pièces jointes sécurisées** (Safe Attachments) | Ouvre les pièces jointes dans un environnement virtuel pour observer leur comportement (détonation) avant la remise |
| **Liens sécurisés** (Safe Links) | Vérifie les URL au moment du clic, dans les e-mails, Teams et les applications Office |
| **Protection anti-hameçonnage** | Détecte les expéditeurs usurpés et l'emprunt d'identité d'utilisateurs et de domaines |
| **Formation à la simulation d'attaque** (Attack simulation training) | Lance des attaques simulées réalistes pour repérer et former les utilisateurs vulnérables |
| **Explorateur de menaces** (Threat Explorer) ou **Détections en temps réel** | Des outils en temps quasi réel pour examiner les menaces et y répondre |
| **Investigation et réponse automatisées (AIR)** | Examine les menaces bien connues et corrige automatiquement |

Une protection de base contre les programmes malveillants, le courrier indésirable et l'usurpation est intégrée à toute boîte aux lettres cloud ; Defender pour Office 365 ajoute le reste, en deux plans (le Plan 2 apporte l'Explorateur de menaces, AIR et la formation à la simulation d'attaque).

<!-- section: defender-endpoint | objectives: 3.4.3 -->
## Microsoft Defender pour point de terminaison

**Defender pour point de terminaison** est une plateforme de sécurité des points de terminaison pour l'entreprise, qui aide à prévenir, détecter et examiner les menaces avancées, et à y répondre, sur les appareils Windows, macOS, Linux, Android et iOS.

| Fonctionnalité | Rôle |
| --- | --- |
| **Réduction de la surface d'attaque** | Première ligne de défense : configuration renforcée, protection réseau et protection web contre les adresses IP, les domaines et les URL malveillants |
| **Protection de nouvelle génération** | Microsoft Defender Antivirus : protection comportementale, en temps réel et assurée par le cloud |
| **Détection et réponse des points de terminaison (EDR)** | Détection en temps quasi réel des attaques avancées, avec des actions de réponse pour les analystes |
| **Investigation et correction automatisées** | Examine les alertes et résout les violations automatiquement |
| **Score de sécurité Microsoft pour les appareils** (Microsoft Secure Score for Devices) | Évalue la configuration de sécurité des appareils et recommande des améliorations |

<!-- section: defender-cloud-apps | objectives: 3.4.4 -->
## Microsoft Defender pour les applications cloud

**Defender pour les applications cloud** protège les applications SaaS. C'est un **broker de sécurité d'accès au cloud (CASB, cloud access security broker)** : un gardien placé entre les utilisateurs de l'entreprise et les ressources cloud qu'ils utilisent.

- **Découverte du cloud** (cloud discovery) : trouve les applications cloud que les utilisateurs emploient réellement, y compris l'**informatique fantôme** (shadow IT), et note chaque application selon plus de 90 indicateurs de risque.
- **Protection des informations** : trouve les fichiers sensibles dans les applications connectées, applique des étiquettes de confidentialité, bloque les téléchargements vers les appareils non gérés.
- **Gestion de la posture de sécurité SaaS (SSPM)** : fait ressortir les erreurs de configuration des applications connectées et recommande des corrections.
- **Protection avancée contre les menaces** : l'analyse du comportement des utilisateurs et des entités détecte les anomalies.
- **Gouvernance des applications** : visibilité et contrôle sur les applications OAuth qui accèdent aux données au nom des utilisateurs.
- **Contrôle d'application par accès conditionnel** (Conditional Access app control) : avec l'accès conditionnel Microsoft Entra, surveille et contrôle les sessions de navigateur en temps réel.

<!-- section: defender-identity | objectives: 3.4.5 -->
## Microsoft Defender pour Identity

**Defender pour Identity** est une solution cloud qui utilise les signaux de votre infrastructure d'identité pour détecter les attaques fondées sur l'identité. Des **capteurs** installés sur les contrôleurs de domaine et sur les serveurs AD FS et AD CS analysent les événements et le trafic réseau, puis envoient les données analysées au service cloud.

Il détecte chaque étape d'une attaque : **reconnaissance**, **informations d'identification compromises** (force brute, échecs d'authentification), **mouvement latéral** et **domination du domaine**. Il évalue aussi la posture des identités et alimente le Degré de sécurisation Microsoft (Microsoft Secure Score) en recommandations.

> **Piège d'examen.** Active Directory local attaqué : Defender pour Identity. Connexions à risque et utilisateurs à risque dans Microsoft Entra ID : Microsoft Entra ID Protection. Applications SaaS : Defender pour les applications cloud. Ressources Azure, AWS et GCP : Defender pour le cloud, un autre produit.

<!-- section: defender-vulnerability-management | objectives: 3.4.6 -->
## Gestion des vulnérabilités Microsoft Defender

La **Gestion des vulnérabilités Microsoft Defender** applique une approche fondée sur les risques pour découvrir, hiérarchiser et corriger les vulnérabilités et les erreurs de configuration sur Windows, macOS, Linux, Android, iOS et les appareils réseau.

| Fonctionnalité | Contenu |
| --- | --- |
| **Détection et surveillance continues des ressources** | Inventaires des logiciels, des certificats numériques, des extensions de navigateur, du matériel et des microprogrammes ; évaluation des bases de référence de sécurité par rapport à des benchmarks comme ceux du CIS |
| **Hiérarchisation intelligente basée sur les risques** | Classe les recommandations à l'aide du renseignement sur les menaces, de la probabilité de violation et du contexte métier : les vulnérabilités exploitées dans la nature passent en premier |
| **Correction et suivi** | Demandes de correction envoyées à l'informatique par Microsoft Intune, blocage des applications vulnérables |

Son tableau de bord montre un **score d'exposition** (plus il est bas, mieux c'est) et le Score de sécurité Microsoft pour les appareils (plus il est haut, mieux c'est).

<!-- section: threat-intelligence | objectives: 3.4.7 -->
## Microsoft Threat Intelligence

**Microsoft Threat Intelligence** rassemble et enrichit ce que Microsoft sait des acteurs de menace, de leurs outils et de leur infrastructure. On le trouve sous **Threat Intelligence** (renseignement sur les menaces) dans le portail Microsoft Defender :

- **Analyse des menaces** (threat analytics) : des rapports sur les menaces suivies, combinés à vos propres données pour montrer si une menace est active dans votre réseau.
- **Profils Intel** (intel profiles) : des connaissances organisées sur les acteurs de menace, les outils malveillants et les vulnérabilités.
- **Explorateur Intel** (intel explorer) : recherche d'articles et d'indicateurs de compromission par mot clé, indicateur ou identifiant CVE.
- **Projets Intel** (intel projects) : les indicateurs rassemblés pendant une investigation.

Le produit autonome Microsoft Defender Threat Intelligence (Defender TI) a été mis hors service le 1er août 2026 : ses fonctionnalités ont convergé vers Defender XDR et Microsoft Sentinel.

<!-- section: defender-portal | objectives: 3.4.8 -->
## Portail Microsoft Defender

Le **portail Microsoft Defender** (`https://security.microsoft.com`) est le lieu unique des opérations de sécurité. Il réunit Defender XDR, Microsoft Sentinel, Microsoft Defender pour le cloud, Microsoft Threat Intelligence et Microsoft Security Exposure Management.

| Zone | Contenu |
| --- | --- |
| **Gestion de l'exposition** (Exposure management) | La posture de sécurité des ressources, le **Degré de sécurisation Microsoft**, la gestion des vulnérabilités |
| **Investigation et réponse** | **Incidents et alertes**, **Repérage** (repérage avancé sur un maximum de 30 jours de données brutes, règles de détection personnalisées), **Actions et soumissions** |
| **Ressources** (Assets) | Les appareils et les identités |
| **Identités**, **Points de terminaison**, **E-mail et collaboration**, **Applications cloud** | Les fonctionnalités de Defender pour Identity, Defender pour point de terminaison, Defender pour Office 365 et Defender pour les applications cloud |
| **Rapports** | Des rapports de sécurité unifiés |

Le **Degré de sécurisation Microsoft** (Microsoft Secure Score) mesure la posture de sécurité de l'organisation : plus le nombre est élevé, plus les actions recommandées ont été réalisées.

> **Piège d'examen.** Opérations de sécurité : portail Microsoft Defender. Conformité et protection des données (étiquettes, DLP, eDiscovery, audit) : portail Microsoft Purview. Identités et accès conditionnel : Centre d'administration Microsoft Entra.

<!-- section: key-points -->
## Points clés

- Defender XDR corrèle en incidents les signaux des points de terminaison, des identités, de l'e-mail et des applications.
- Defender pour Office 365 : e-mail et collaboration (Pièces jointes sécurisées, Liens sécurisés, anti-hameçonnage).
- Defender pour point de terminaison : appareils (réduction de la surface d'attaque, protection de nouvelle génération, EDR).
- Defender pour les applications cloud : CASB pour les applications SaaS (découverte du cloud, informatique fantôme).
- Defender pour Identity : Active Directory local, par des capteurs.
- Gestion des vulnérabilités Microsoft Defender : découvrir, hiérarchiser selon le risque, corriger.
- Microsoft Threat Intelligence : analyse des menaces, profils Intel, explorateur Intel.
- Portail Defender : incidents, repérage, Degré de sécurisation et rapports, avec Sentinel et Defender pour le cloud.
