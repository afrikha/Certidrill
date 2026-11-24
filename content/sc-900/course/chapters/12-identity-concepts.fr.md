Quand les utilisateurs, les appareils et les applications sont partout, la frontière du réseau ne protège plus grand-chose : c'est l'identité qui protège. Ce chapitre définit le vocabulaire sur lequel l'examen s'appuie : authentification, autorisation, fournisseurs d'identité, services d'annuaire et fédération.

<!-- section: identity-perimeter | objectives: 1.2.1 -->
## L'identité comme périmètre de sécurité principal

Les pare-feux et les passerelles VPN protégeaient une frontière qui avait un sens quand les employés travaillaient dans un seul bureau, sur des appareils gérés, avec des serveurs locaux. Les applications cloud et SaaS, le télétravail, les appareils personnels (BYOD), l'accès des partenaires et des clients et les appareils IoT l'ont érodée. La question n'est plus « cette demande vient-elle de l'intérieur de notre réseau ? » mais « qui ou quoi fait cette demande, et faut-il lui faire confiance ? ».

Une **identité** est l'ensemble des attributs qui définissent une personne, un appareil ou un composant logiciel :

| Identité | Représente |
| --- | --- |
| Humaine | Employés, sous-traitants, partenaires, clients |
| Appareil | Ordinateurs portables, téléphones, tablettes, capteurs IoT |
| Charge de travail | Applications, services et processus automatisés qui s'exécutent sans personne |
| Agent | Agents IA qui agissent pour le compte d'utilisateurs ou de processus |

Une infrastructure d'identité repose sur **quatre piliers** :

| Pilier | Sens |
| --- | --- |
| **Administration** | Créer, gérer et gouverner les identités : provisionnement, mise à jour quand les rôles changent, déprovisionnement |
| **Authentification** | Vérifier qu'une identité est bien qui ou ce qu'elle prétend être |
| **Autorisation** | Déterminer ce qu'une identité authentifiée a le droit de faire |
| **Audit** | Suivre qui a fait quoi, quand et d'où : journaux de connexion, rapports, alertes |

<!-- section: authentication | objectives: 1.2.2 -->
## L'authentification

L'**authentification** (AuthN) est le processus qui prouve que vous êtes bien qui vous dites être. Elle répond à « qui êtes-vous ? » et exige des **informations d'identification**. Elle réussit ou échoue ; elle ne dit rien de ce que vous pourrez faire ensuite.

| Facteur | Exemples |
| --- | --- |
| Quelque chose que vous **savez** | Mot de passe, code PIN |
| Quelque chose que vous **possédez** | Téléphone, clé de sécurité matérielle, carte à puce |
| Quelque chose que vous **êtes** | Empreinte digitale, reconnaissance du visage |

- L'**authentification à un seul facteur** utilise un facteur, en général un mot de passe : s'il est volé, l'attaquant peut se faire passer pour l'utilisateur.
- L'**authentification multifacteur** (MFA) exige au moins deux facteurs de catégories **différentes**.

> **Piège d'examen.** Un mot de passe et un code PIN sont deux secrets de la même catégorie : ce n'est pas de l'authentification multifacteur. Un mot de passe plus une approbation sur votre téléphone en est.

<!-- section: authorization | objectives: 1.2.3 -->
## L'autorisation

L'**autorisation** (AuthZ) est le processus qui détermine ce qu'une identité authentifiée a le droit de faire. Elle répond à « qu'avez-vous le droit de faire ? » et s'appuie sur des rôles (administrateur, responsable), des autorisations (lire, écrire, supprimer) et des attributs (service, emplacement).

| | Authentification | Autorisation |
| --- | --- | --- |
| Question | Qui êtes-vous ? | Que pouvez-vous faire ? |
| Ordre | En premier, à la connexion | Après une authentification réussie |
| Fondée sur | Les informations d'identification | Les rôles, autorisations et attributs |
| Analogie de l'hôtel | Présenter sa pièce d'identité à la réception | La carte qui ouvre votre chambre, pas les autres |

Le **principe du moindre privilège** s'applique à l'autorisation : donner à chaque identité seulement l'accès dont elle a besoin pour son travail.

<!-- section: identity-providers | objectives: 1.2.4 -->
## Les fournisseurs d'identité

Avec l'**authentification moderne**, les applications ne vérifient plus elles-mêmes les informations d'identification : un **fournisseur d'identité** (IdP) central crée, tient à jour et gère les informations d'identité, et offre aux applications des services d'authentification, d'autorisation et d'audit. Microsoft Entra ID est un fournisseur d'identité ; Google, Amazon, LinkedIn et GitHub en sont aussi.

1. L'utilisateur ouvre une application, qui le dirige vers le fournisseur d'identité.
2. Le fournisseur d'identité vérifie les informations d'identification et émet un **jeton de sécurité**.
3. L'application, qui approuve le fournisseur d'identité, accepte le jeton comme preuve.

Un jeton porte des **revendications** sur l'identité (identifiant, nom, rôles, heure d'expiration) et sa durée est limitée.

| Notion | Sens |
| --- | --- |
| Jeton d'ID | Prouve que l'utilisateur s'est connecté : authentification |
| Jeton d'accès | Permet à l'application d'accéder à une ressource pour le compte de l'utilisateur : autorisation |
| **Authentification unique** (SSO) | Se connecter une fois au fournisseur d'identité, puis accéder à toutes les applications qui l'approuvent sans ressaisir ses informations d'identification |

| Protocole | Rôle |
| --- | --- |
| OpenID Connect | Authentification ; construit au-dessus d'OAuth 2.0 |
| OAuth 2.0 | Autorisation, au moyen de jetons d'accès |
| SAML | Authentification et fédération, courant avec les applications d'entreprise et anciennes |

Centraliser l'identité donne des stratégies cohérentes (la MFA à un seul endroit), une vue unique des connexions pour détecter les schémas suspects, et un seul endroit où désactiver un compte pour toutes les applications connectées.

<!-- section: directory-services | objectives: 1.2.5 -->
## Les services d'annuaire et Active Directory

Un **annuaire** est un référentiel structuré d'informations sur les objets d'un réseau : utilisateurs, appareils, groupes, applications. Un **service d'annuaire** stocke ces données et les met à la disposition des utilisateurs, des administrateurs, des applications et des services.

**Active Directory** (AD) est un ensemble de services d'annuaire développé par Microsoft pour les réseaux locaux organisés en domaines. Son composant le plus connu, **Active Directory Domain Services** (AD DS), stocke les informations sur les membres du domaine, vérifie leurs informations d'identification à la connexion et définit leurs droits d'accès. Un serveur qui exécute AD DS est un **contrôleur de domaine**.

| | AD DS | Microsoft Entra ID |
| --- | --- | --- |
| Conçu pour | Les réseaux locaux | Internet et le cloud ; l'identité en tant que service |
| Authentification | Kerberos et NTLM | Protocoles modernes : OpenID Connect, OAuth 2.0, SAML |
| Gestion des appareils | Stratégie de groupe sur les appareils Windows joints au domaine ; utilisateurs et ordinateurs organisés en unités d'organisation (UO) | Fonctionne sur toutes les plateformes et tous les types d'appareils |
| Applications cloud et SaaS | Pas nativement : il faut une synchronisation ou une fédération | Natif |
| Accès à distance | Hors du réseau de l'entreprise, les utilisateurs ont besoin d'un VPN pour s'authentifier | Ni VPN ni infrastructure locale nécessaires |

> **Piège d'examen.** Microsoft Entra ID n'est pas AD DS hébergé dans le cloud : il n'a ni contrôleurs de domaine, ni stratégie de groupe, ni unités d'organisation. Les organisations qui exploitent AD DS le connectent à Microsoft Entra ID : c'est l'identité hybride.

<!-- section: federation | objectives: 1.2.6 -->
## La fédération

La **fédération** donne accès à des services par-delà les frontières d'une organisation ou d'un domaine, en établissant une **relation d'approbation** entre des fournisseurs d'identité distincts. Les utilisateurs s'authentifient auprès du fournisseur d'identité de leur propre organisation et atteignent les ressources d'une autre organisation sans second compte. Elle fonctionne comme un passeport : votre pays le délivre, les autres pays l'acceptent.

1. Un utilisateur de l'organisation B s'authentifie auprès du fournisseur d'identité de B.
2. L'utilisateur demande une ressource de l'organisation A.
3. Le fournisseur d'identité de A, qui approuve celui de B, accepte cette authentification, et A accorde l'accès.

- L'approbation **n'est pas automatiquement bidirectionnelle** : si A approuve B, B n'approuve pas A tant que cela n'est pas configuré aussi.
- Exemples : les employés d'une entreprise partenaire qui utilisent leurs propres informations d'identification (collaboration B2B) ; « se connecter avec Google » sur un site grand public ; les utilisateurs d'un Active Directory local qui atteignent des services cloud par Active Directory Federation Services (AD FS).

> **Conseil d'examen.** L'authentification unique fonctionne au sein d'un seul fournisseur d'identité ; la fédération est une approbation entre deux fournisseurs d'identité.

<!-- section: key-points -->
## Points clés

- L'identité est le périmètre de sécurité principal : le cloud, le télétravail et le BYOD ont érodé la frontière du réseau.
- Quatre piliers : administration, authentification, autorisation, audit.
- L'authentification prouve qui vous êtes (savoir, posséder, être) ; l'autorisation décide de ce que vous pouvez faire, et vient toujours en second.
- Un fournisseur d'identité authentifie de façon centralisée et émet des jetons ; le SSO consiste à se connecter une fois pour de nombreuses applications.
- AD DS : annuaire local, contrôleurs de domaine, Kerberos, stratégie de groupe. Microsoft Entra ID : service d'identité cloud aux protocoles modernes.
- Fédération : une relation d'approbation entre fournisseurs d'identité, à sens unique sauf si elle est configurée dans les deux sens.
