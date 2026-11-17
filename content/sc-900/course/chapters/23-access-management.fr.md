Une fois l'utilisateur authentifié, deux mécanismes décident de la suite : l'accès conditionnel décide si la connexion peut aboutir et à quelles conditions, et les rôles décident de ce que l'utilisateur peut administrer. L'examen teste le vocabulaire des deux, et la différence entre les rôles Microsoft Entra et les rôles Azure.

<!-- section: conditional-access | objectives: 2.3.1 -->
## L'accès conditionnel Microsoft Entra

L'**accès conditionnel** est le moteur de stratégie Confiance Zéro de Microsoft : il rassemble des **signaux**, prend une **décision** et l'applique. Une stratégie est une instruction si-alors : *si* un utilisateur veut accéder à une ressource, *alors* il doit accomplir une action, par exemple « si un utilisateur accède à Microsoft 365, il doit effectuer l'authentification multifacteur ».

Une stratégie a deux parties. Les **affectations** disent quand elle s'applique ; elles doivent toutes être remplies :

| Affectation | Exemples |
| --- | --- |
| Utilisateurs | Tous les utilisateurs, des utilisateurs ou groupes précis, des rôles d'annuaire, les invités, des identités de charge de travail, des agents |
| Ressources cibles | Des applications cloud comme Microsoft 365, ou des actions de l'utilisateur comme l'inscription des informations de sécurité |
| Réseau | Emplacements nommés, plages d'adresses IP approuvées, pays ou régions |
| Conditions | Risque de connexion et risque utilisateur (issus de Protection Microsoft Entra ID), plateforme de l'appareil, applications clientes, filtres pour appareils |

Les **contrôles d'accès** disent ce qui se passe :

| Contrôle | Options |
| --- | --- |
| **Bloquer** | Refuser l'accès ; la décision la plus restrictive |
| **Accorder** | Autoriser l'accès, éventuellement sous condition : exiger l'authentification multifacteur, exiger une force d'authentification, exiger un appareil conforme, exiger un appareil à jonction hybride à Microsoft Entra, exiger une application cliente approuvée ou une stratégie de protection des applications, exiger un changement de mot de passe, exiger des conditions d'utilisation |
| **Session** | Limiter l'expérience une fois l'accès accordé : fréquence de connexion, restrictions appliquées par l'application, contrôle d'application par accès conditionnel avec Microsoft Defender pour les applications cloud |

Une **force d'authentification** précise quelles combinaisons de méthodes sont acceptées ; trois sont intégrées : authentification multifacteur, MFA sans mot de passe et MFA résistante au hameçonnage.

Stratégies couramment appliquées :

| Besoin | Stratégie |
| --- | --- |
| Protéger les administrateurs | Exiger la MFA pour les utilisateurs ayant des rôles d'administration |
| Protéger la gestion d'Azure | Exiger la MFA pour les tâches de gestion Azure |
| Fermer une ancienne voie d'attaque | Bloquer les connexions qui utilisent des protocoles d'authentification hérités |
| Restreindre selon l'emplacement | Bloquer ou accorder l'accès depuis des emplacements précis |
| Ne faire confiance qu'aux appareils gérés | Exiger un appareil conforme pour des applications précises |
| Réagir au risque | Bloquer ou soumettre à vérification les connexions à risque |

- L'accès conditionnel est appliqué **après l'authentification du premier facteur** : ce n'est pas une défense de première ligne contre des attaques comme le déni de service.
- Il demande **Microsoft Entra ID P1** ; les stratégies fondées sur le risque de connexion ou le risque utilisateur demandent Protection Microsoft Entra ID, une fonctionnalité **P2**.
- Le mode **rapport seul** permet d'évaluer l'impact d'une stratégie avant de l'appliquer.

> **Piège d'examen.** L'accès conditionnel n'est pas une méthode d'authentification et ne remplace pas la MFA : c'est la stratégie qui décide *quand* la MFA, ou un autre contrôle, est exigée. « Exiger la MFA seulement en dehors du réseau de l'entreprise » relève de l'accès conditionnel.

<!-- section: entra-roles | objectives: 2.3.2 -->
## Les rôles Microsoft Entra et le contrôle d'accès en fonction du rôle

Le **contrôle d'accès en fonction du rôle** (RBAC) accorde les autorisations par des rôles plutôt qu'utilisateur par utilisateur. Les **rôles Microsoft Entra** contrôlent les autorisations de gestion des ressources Microsoft Entra : créer des utilisateurs, réinitialiser des mots de passe, gérer des applications, consulter les informations de facturation.

| Type de rôle | Description |
| --- | --- |
| **Intégré** | Créé par Microsoft, avec un ensemble fixe d'autorisations ; gratuit |
| **Personnalisé** | Un ensemble d'autorisations que vous choisissez dans une liste prédéfinie, puis que vous attribuez ; demande Microsoft Entra ID P1 ou P2 |

| Rôle intégré | Peut |
| --- | --- |
| **Global Administrator** | Gérer toutes les fonctionnalités d'administration de Microsoft Entra ID et attribuer des rôles aux autres ; la personne qui crée le locataire reçoit ce rôle |
| **User Administrator** | Créer et gérer tous les aspects des utilisateurs et des groupes |
| **Billing Administrator** | Effectuer des achats et gérer les abonnements |

| Catégorie | Exemples |
| --- | --- |
| Rôles propres à Microsoft Entra | User Administrator, Application Administrator, Groups Administrator |
| Rôles propres à un service | Exchange Administrator, Intune Administrator, SharePoint Administrator, Teams Administrator |
| Rôles interservices | Security Administrator, Compliance Administrator |

Une **attribution de rôle** rattache une définition de rôle à un principal de sécurité (un utilisateur, un groupe ou un principal de service) à une **étendue** : tout le locataire, une unité administrative, ou une seule ressource comme une application.

Appliquez le **moindre privilège** : quelqu'un qui ne gère que des utilisateurs reçoit User Administrator, pas Global Administrator, ce qui limite les dégâts si le compte est compromis.

Les rôles Microsoft Entra et les rôles Azure sont deux systèmes distincts :

| | Rôles Microsoft Entra | Rôles Azure (Azure RBAC) |
| --- | --- | --- |
| Contrôlent l'accès | Aux ressources Microsoft Entra : utilisateurs, groupes, applications | Aux ressources Azure : machines virtuelles, stockage, bases de données |
| Étendue | Locataire, unité administrative, objet unique | Groupe d'administration, abonnement, groupe de ressources, ressource |
| Exemples | Global Administrator, User Administrator | Owner, Contributor, Reader |

> **Piège d'examen.** Par défaut, un Global Administrator n'a aucun accès aux ressources Azure, et un Owner d'un abonnement ne peut pas gérer les utilisateurs dans Microsoft Entra ID. Un Global Administrator peut toutefois élever son accès pour gérer tous les abonnements Azure du locataire.

<!-- section: key-points -->
## Points clés

- Accès conditionnel : des signaux, puis une décision (bloquer, ou accorder sous conditions), appliquée après le premier facteur.
- Signaux : utilisateur ou groupe, application, emplacement, appareil, risque. Contrôles d'octroi : MFA, force d'authentification, appareil conforme, changement de mot de passe, conditions d'utilisation.
- L'accès conditionnel demande Microsoft Entra ID P1 ; les stratégies fondées sur le risque demandent P2.
- Les rôles Microsoft Entra gèrent les ressources Microsoft Entra ; les rôles intégrés sont fixes et gratuits, les rôles personnalisés demandent P1.
- Global Administrator : tout dans Microsoft Entra ID ; la personne qui crée le locataire. Préférez le rôle le moins privilégié.
- Les rôles Azure (Owner, Contributor, Reader) gèrent les ressources Azure ; les deux systèmes ne se recoupent pas par défaut.
