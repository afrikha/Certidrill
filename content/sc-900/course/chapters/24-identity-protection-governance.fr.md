Donner un accès est facile ; s'assurer qu'il reste approprié est la partie difficile. Microsoft Entra offre quatre fonctionnalités que l'examen aime mélanger : Gouvernance Microsoft Entra ID, les révisions d'accès, Privileged Identity Management et Protection Microsoft Entra ID.

<!-- section: id-governance | objectives: 2.4.1 -->
## Gouvernance Microsoft Entra ID

**Gouvernance Microsoft Entra ID** (Microsoft Entra ID Governance) aide à garantir que les bonnes personnes ont le bon accès aux bonnes ressources, en automatisant les processus d'identité et d'accès. Elle aide à répondre à quatre questions :

- Quelles identités doivent avoir accès à quelles ressources ?
- Que font ces identités de cet accès ?
- Des contrôles organisationnels sont-ils en place pour gérer l'accès ?
- Les auditeurs peuvent-ils vérifier que ces contrôles fonctionnent efficacement ?

Elle gouverne trois cycles de vie :

| Cycle de vie | Ce qu'il couvre | Fonctionnalités |
| --- | --- | --- |
| Cycle de vie des **identités** | Les personnes qui arrivent, changent de poste et partent | Le provisionnement à partir de systèmes RH comme Workday ou SuccessFactors ; les **workflows de cycle de vie**, qui automatisent des tâches avant une date d'arrivée, lors d'un changement ou au départ |
| Cycle de vie des **accès** | Obtenir, garder et perdre un accès à mesure que les besoins changent | La **gestion des droits d'utilisation**, les groupes dynamiques, les **révisions d'accès** |
| Cycle de vie des **accès privilégiés** | Les droits d'administrateur | **Privileged Identity Management** |

La **gestion des droits d'utilisation** automatise les demandes d'accès, les approbations, les attributions et l'expiration. Son unité est le **package d'accès** : un lot des ressources dont une personne a besoin pour un projet ou un rôle (appartenances à des groupes et à des équipes, applications, sites SharePoint), avec des stratégies qui disent qui peut le demander, qui approuve et quand l'accès expire. Elle gère aussi les utilisateurs externes : un partenaire approuvé est ajouté comme invité, et son compte d'invité peut être supprimé quand l'accès prend fin.

Utiliser ces fonctionnalités demande une licence Gouvernance Microsoft Entra ID ou Microsoft Entra Suite ; certaines, dont Privileged Identity Management et les révisions d'accès de base, sont aussi dans Microsoft Entra ID P2.

<!-- section: access-reviews | objectives: 2.4.2 -->
## Les révisions d'accès

Les **révisions d'accès** permettent à une organisation de vérifier régulièrement que seules les bonnes personnes ont encore un accès. Les gens changent d'équipe ou partent, des invités restent dans des groupes, et l'excès d'accès devient un risque de sécurité et un constat d'audit.

| Élément | Options |
| --- | --- |
| Ce qui est révisé | Les appartenances aux groupes (invités compris), l'accès aux applications, les rôles Microsoft Entra et les rôles de ressources Azure, les attributions de packages d'accès |
| Qui révise | Les utilisateurs eux-mêmes (autorévision), les propriétaires de groupes, les responsables des utilisateurs, ou des réviseurs spécifiés |
| À quelle fréquence | De façon récurrente : chaque semaine, mois, trimestre ou année |
| Aide aux réviseurs | Des recommandations d'approbation ou de refus, fondées par exemple sur l'activité de connexion |
| À la fin | Résultats appliqués manuellement ou automatiquement : l'accès non approuvé est retiré |

Une révision peut comporter jusqu'à trois étapes, avec des réviseurs différents à chaque étape. Les révisions des rôles Microsoft Entra et des rôles de ressources Azure se créent dans Privileged Identity Management.

> **Conseil d'examen.** « Chaque trimestre, les responsables doivent confirmer que les invités d'une équipe ont encore besoin de leur accès » : révisions d'accès. Les mots-clés sont « périodiquement », « recertifier », « encore besoin ».

<!-- section: pim | objectives: 2.4.3 -->
## Microsoft Entra Privileged Identity Management

**Privileged Identity Management** (PIM) est un service de Microsoft Entra ID qui permet de gérer, de contrôler et de surveiller l'accès aux ressources importantes. Il réduit le nombre de personnes qui détiennent un accès privilégié en permanence.

| PIM est | Sens |
| --- | --- |
| **Juste-à-temps** | L'accès privilégié seulement quand il est nécessaire |
| **Limité dans le temps** | Des dates de début et de fin pour une attribution |
| **Basé sur l'approbation** | Une approbation peut être exigée pour activer un rôle |
| **Visible** | Des notifications quand des rôles privilégiés sont activés |
| **Auditable** | Un historique d'accès complet peut être téléchargé |

| Attribution | Sens |
| --- | --- |
| **Éligible** | L'utilisateur doit **activer** le rôle pour s'en servir, pour une durée limitée, éventuellement avec l'authentification multifacteur, une justification ou une approbation |
| **Active** | L'utilisateur détient le rôle sans aucune action |

PIM gère les **rôles Microsoft Entra**, les **rôles Azure** et, avec PIM pour les groupes, l'appartenance ou la propriété juste-à-temps d'un groupe. Il peut aussi mener des révisions d'accès de ces rôles, et il empêche la suppression des dernières attributions actives des rôles Global Administrator et Privileged Role Administrator.

> **Piège d'examen.** PIM ne détecte pas les attaques et ne décide pas qui doit avoir un rôle : il limite quand et pendant combien de temps un rôle privilégié est utilisable. « Un administrateur doit demander le rôle et l'obtient pour deux heures après approbation » désigne PIM.

<!-- section: id-protection | objectives: 2.4.4 -->
## Protection Microsoft Entra ID

**Protection Microsoft Entra ID** (Microsoft Entra ID Protection) aide les organisations à **détecter, examiner et corriger** les risques liés aux identités. Elle utilise les signaux que Microsoft collecte pour calculer un risque :

| Risque | Sens | Exemples de détections |
| --- | --- | --- |
| **Risque de connexion** | La probabilité qu'une demande d'authentification donnée ne vienne pas du propriétaire de l'identité | Adresse IP anonyme, voyage atypique, propriétés de connexion inhabituelles |
| **Risque utilisateur** | La probabilité qu'une identité ou un compte soit compromis | Informations d'identification divulguées, activité suspecte signalée par l'utilisateur |

| Étape | Comment |
| --- | --- |
| Détecter | Des détections de risque calculées à la connexion ou après coup ; elles couvrent aussi les identités de charge de travail |
| Examiner | Trois rapports : **détections de risque**, **connexions à risque**, **utilisateurs à risque** |
| Corriger | Des stratégies d'**accès conditionnel basées sur les risques** exigent l'authentification multifacteur pour une connexion à risque et, pour un utilisateur à risque, un changement de mot de passe sécurisé (**Require password change**) ou la correction adaptée à sa méthode d'authentification (**Require risk remediation**) ; quand l'utilisateur s'y conforme, le risque est corrigé automatiquement. Sinon, un administrateur rejette le risque, confirme que la connexion est sûre ou confirme la compromission |

Les stratégies de risque se créent dans l'accès conditionnel : les anciennes stratégies de risque utilisateur et de risque de connexion configurées dans Protection Microsoft Entra ID elle-même sont mises hors service le 1er octobre 2026. Les données de risque peuvent être exportées vers un outil de gestion des informations et des événements de sécurité (SIEM) comme Microsoft Sentinel. Les stratégies basées sur les risques et les rapports complets demandent Microsoft Entra ID P2.

Choisir entre les quatre :

| Besoin | Réponse |
| --- | --- |
| Bloquer ou soumettre à vérification une connexion depuis une adresse IP anonyme | Protection Microsoft Entra ID, avec une stratégie d'accès conditionnel basée sur les risques |
| Être averti que les informations d'identification d'un utilisateur ont été trouvées dans une fuite | Protection Microsoft Entra ID (risque utilisateur) |
| Donner un rôle d'administrateur seulement pour la durée d'une tâche | Privileged Identity Management |
| Exiger une approbation avant qu'un rôle privilégié soit utilisé | Privileged Identity Management |
| Confirmer tous les six mois que les membres d'un groupe ont encore besoin de leur accès | Révisions d'accès |
| Laisser les employés demander un lot de ressources qui expire automatiquement | Gestion des droits d'utilisation (package d'accès) |
| Automatiser des tâches quand un employé arrive ou part | Workflows de cycle de vie |

<!-- section: key-points -->
## Points clés

- Gouvernance Microsoft Entra ID : les bonnes personnes, le bon accès, les bonnes ressources ; cycles de vie des identités, des accès et des accès privilégiés.
- Gestion des droits d'utilisation : des packages d'accès avec demande, approbation et expiration, pour les utilisateurs internes et externes.
- Révisions d'accès : recertification périodique des appartenances aux groupes, de l'accès aux applications et des rôles ; les résultats peuvent s'appliquer automatiquement.
- PIM : juste-à-temps, limité dans le temps, basé sur l'approbation, visible, auditable ; une attribution éligible s'active, une attribution active non.
- Protection Microsoft Entra ID : détecter, examiner, corriger. Le risque de connexion concerne une connexion ; le risque utilisateur concerne le compte.
- L'accès conditionnel basé sur les risques automatise la correction : MFA pour une connexion à risque, changement de mot de passe pour un utilisateur à risque.
