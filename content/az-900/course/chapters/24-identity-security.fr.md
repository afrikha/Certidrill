L'identité est la première ligne de défense dans le cloud : avant d'atteindre une ressource, quelqu'un ou quelque chose prouve qui il est. Ce chapitre couvre les services d'identité d'Azure, puis les modèles et outils de sécurité que l'examen nomme.

<!-- section: directory-services | objectives: 2.4.1 -->
## Services d'annuaire

**Microsoft Entra ID** est le service cloud de gestion des identités et des accès de Microsoft. Les utilisateurs s'y connectent pour accéder aux services cloud de Microsoft (Azure, Microsoft 365) et aux applications que vous développez.

| Service fourni | Sens |
| --- | --- |
| Authentification | Vérifier l'identité, avec la réinitialisation de mot de passe en libre-service, l'authentification multifacteur et le verrouillage intelligent |
| Authentification unique | Une seule identité pour accéder à de nombreuses applications |
| Gestion des applications | Gérer les applications cloud et locales et leur accès |
| Gestion des appareils | Inscrire les appareils, pour que l'accès puisse dépendre de l'appareil |

Active Directory sur Windows Server est l'annuaire local ; Microsoft Entra ID est un service différent, basé sur le cloud. **Microsoft Entra Connect** synchronise les identités locales vers Microsoft Entra ID pour que les utilisateurs gardent une seule identité pour les deux.

**Microsoft Entra Domain Services** fournit des services de domaine managés : **jonction de domaine, stratégie de groupe, LDAP et authentification Kerberos ou NTLM**, sans déployer, gérer ni corriger de contrôleurs de domaine. Il permet d'exécuter dans Azure les applications anciennes qui ne peuvent pas utiliser l'authentification moderne. Un domaine managé tire ses identités de Microsoft Entra ID par une synchronisation à sens unique.

<!-- section: authentication-methods | objectives: 2.4.2 -->
## Méthodes d'authentification

L'**authentification** établit qui est une personne, un service ou un appareil.

| Méthode | Principe | Avantage |
| --- | --- | --- |
| **Authentification unique** (SSO) | Se connecter une fois, puis accéder à plusieurs applications, même de fournisseurs différents | Moins de mots de passe à retenir et à gérer ; l'accès s'accorde et se retire à un seul endroit. Elle n'est sûre qu'autant que la connexion initiale |
| **Authentification multifacteur** (MFA) | Une preuve supplémentaire à la connexion, venant d'au moins deux catégories : quelque chose que vous **savez** (mot de passe), que vous **possédez** (téléphone, clé matérielle), que vous **êtes** (empreinte, visage) | Un mot de passe volé ne suffit plus |
| **Sans mot de passe** (passwordless) | Le mot de passe est remplacé par quelque chose que vous possédez, plus quelque chose que vous êtes ou savez | Plus pratique et plus sûr qu'un mot de passe |

Options sans mot de passe dans Microsoft Entra ID : **Windows Hello Entreprise** (biométrie ou code PIN liés à un appareil), l'application **Microsoft Authenticator**, et les **clés de sécurité FIDO2** ou clés d'accès.

<!-- section: external-identities | objectives: 2.4.3 -->
## Identités externes

Une **identité externe** est une personne, un appareil ou un service extérieur à votre organisation. Microsoft Entra External ID couvre les façons de travailler avec elles :

| Capacité | Usage |
| --- | --- |
| **Collaboration interentreprises (B2B)** | Les utilisateurs externes se connectent à vos applications avec **leur propre identité** ; ils apparaissent en général dans votre annuaire comme utilisateurs invités |
| **Connexion directe B2B** | Une approbation mutuelle avec une autre organisation Microsoft Entra, utilisée par exemple par les canaux partagés de Teams ; les utilisateurs n'apparaissent pas dans votre annuaire |
| **Locataires externes pour les clients** | La gestion des identités des clients d'une application que vous publiez, qui s'inscrivent avec un compte local ou un compte de réseau social |

Les utilisateurs externes apportent leurs propres informations d'identification : vous ne gérez pas leurs mots de passe.

<!-- section: conditional-access | objectives: 2.4.4 -->
## Accès conditionnel

L'**accès conditionnel** est l'outil de Microsoft Entra qui autorise ou refuse l'accès aux ressources en fonction de **signaux** :

- qui est l'utilisateur et à quels groupes il appartient ;
- où il se trouve (emplacement réseau) ;
- quel appareil il utilise, et si celui-ci est conforme ;
- quelle application est demandée ;
- le niveau de risque de la connexion.

À partir de ces signaux, il prend une **décision** : autoriser, bloquer, ou autoriser sous condition, par exemple l'authentification multifacteur ou un appareil conforme. Usages types : exiger la MFA pour les seuls administrateurs, exiger la MFA depuis des emplacements inconnus, bloquer l'accès depuis des lieux non approuvés, n'autoriser certaines applications que depuis des appareils gérés.

<!-- section: rbac | objectives: 2.4.5 -->
## Contrôle d'accès en fonction du rôle Azure

**Azure RBAC** applique le principe du moindre privilège : donner à chaque identité seulement l'accès dont elle a besoin. L'accès s'accorde en **attribuant un rôle à une identité à une étendue**.

| Élément | Sens |
| --- | --- |
| Rôle | Un ensemble d'autorisations. Rôles intégrés : **Owner** (tout, y compris la gestion des accès), **Contributor** (tout sauf la gestion des accès), **Reader** (consultation seule) ; des rôles personnalisés sont possibles |
| Étendue | Un groupe d'administration, un abonnement, un groupe de ressources ou une seule ressource |

- Les attributions sont **héritées** par les étendues enfants : un rôle sur un abonnement s'applique à tous ses groupes de ressources et ressources.
- RBAC est un **modèle d'autorisation** : les autorisations de plusieurs rôles s'additionnent.
- Il est appliqué par Azure Resource Manager à chaque action qui atteint une ressource, quel que soit l'outil utilisé.

<!-- section: zero-trust-defense-in-depth | objectives: 2.4.6, 2.4.7 -->
## Confiance Zéro et défense en profondeur

La **Confiance Zéro** (Zero Trust) est un modèle de sécurité qui suppose le pire scénario et protège les ressources en conséquence. Le modèle traditionnel faisait confiance à tout ce qui se trouvait dans le réseau de l'entreprise ; la Confiance Zéro ne fait confiance à rien par défaut et oblige chaque requête à faire ses preuves.

| Principe | Sens |
| --- | --- |
| **Vérifier explicitement** | Toujours authentifier et autoriser, à partir de toutes les données disponibles |
| **Utiliser l'accès selon le moindre privilège** | Limiter l'accès au juste nécessaire et au juste-à-temps |
| **Supposer une violation** | Réduire l'impact d'une intrusion : segmenter l'accès, chiffrer de bout en bout, surveiller |

La **défense en profondeur** protège l'information par **plusieurs couches** : si l'une est franchie, la suivante ralentit l'attaque.

| Couche | Exemples |
| --- | --- |
| Sécurité physique | Contrôle d'accès aux bâtiments des centres de données |
| Identité et accès | Authentification unique, authentification multifacteur, audit des accès |
| Périmètre | Protection DDoS, pare-feux de périmètre |
| Réseau | Segmentation, refus par défaut, accès entrants et sortants restreints |
| Calcul | Accès sécurisé aux machines virtuelles, protection des points de terminaison, correctifs |
| Application | Applications sans vulnérabilités, secrets stockés de façon sûre |
| Données | Accès contrôlé et chiffré aux données, le centre du modèle |

<!-- section: defender-for-cloud | objectives: 2.4.8 -->
## Microsoft Defender pour le cloud

**Defender pour le cloud** est un outil de gestion de la posture de sécurité et de protection contre les menaces. Il surveille vos environnements cloud, locaux, hybrides et multiclouds, et vous indique comment les renforcer.

| Il protège | Comment |
| --- | --- |
| Les ressources Azure | Nativement : de nombreux services sont surveillés sans aucun déploiement |
| Les environnements hybrides | Les serveurs locaux connectés par **Azure Arc** |
| Les autres clouds | Amazon Web Services et Google Cloud |

Ses trois fonctions :

| Fonction | Sens |
| --- | --- |
| **Évaluer en continu** | Connaître votre posture de sécurité ; un **score de sécurité** la résume, et les vulnérabilités sont identifiées |
| **Sécuriser** | Renforcer les ressources grâce à des recommandations fondées sur le benchmark de sécurité cloud Microsoft et sur Azure Policy |
| **Défendre** | Détecter les menaces et émettre des **alertes de sécurité** ; protections avancées pour les serveurs, les conteneurs, le stockage, les bases de données |

<!-- section: key-points -->
## Points clés

- Microsoft Entra ID : identité cloud (authentification, SSO, applications, appareils). Entra Domain Services : jonction de domaine, stratégie de groupe, LDAP et Kerberos managés, pour les applications anciennes.
- SSO : une connexion pour de nombreuses applications. MFA : au moins deux facteurs parmi savoir, posséder, être. Sans mot de passe : Windows Hello Entreprise, application Authenticator, FIDO2.
- Les identités externes se connectent avec leurs propres informations d'identification (invités B2B).
- Accès conditionnel : des signaux, puis autoriser, bloquer ou exiger la MFA.
- RBAC : rôle + identité + étendue, hérité, additif. Owner, Contributor, Reader.
- Confiance Zéro : vérifier explicitement, moindre privilège, supposer une violation. Défense en profondeur : sept couches, de la sécurité physique aux données.
- Defender pour le cloud : évaluer (score de sécurité), sécuriser (recommandations), défendre (alertes), sur Azure, l'hybride et le multicloud.
