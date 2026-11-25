Microsoft Entra ID est le service d'identité derrière Microsoft 365, Azure et des milliers d'autres applications. L'examen attend que vous sachiez dire ce qu'il est, reconnaître chaque type d'identité qu'il gère, et expliquer comment il fonctionne avec un Active Directory local.

<!-- section: entra-id | objectives: 2.1.1 -->
## Microsoft Entra ID

**Microsoft Entra** est une famille de produits d'identité et d'accès réseau. Son socle, **Microsoft Entra ID**, est le service cloud de gestion des identités et des accès de Microsoft : il fournit l'authentification, l'application des stratégies et la protection des utilisateurs, des appareils, des applications et des ressources. Il s'utilise seul ou synchronisé avec un Active Directory local.

| Terme | Sens |
| --- | --- |
| **Locataire** | Une instance de Microsoft Entra ID qui contient les utilisateurs, les groupes, les appareils et les inscriptions d'applications d'une organisation ; il a un ID de locataire unique et un nom de domaine comme `contoso.onmicrosoft.com` |
| **Annuaire** | Le conteneur des objets d'identité dans un locataire ; les deux mots sont souvent employés l'un pour l'autre |

Toute organisation abonnée à Microsoft 365, Azure ou Dynamics 365 dispose automatiquement d'un locataire Microsoft Entra.

| Qui | Ce que Microsoft Entra ID lui apporte |
| --- | --- |
| Administrateurs informatiques | Le contrôle de l'accès aux applications et aux ressources, par exemple en exigeant l'authentification multifacteur |
| Développeurs | Un moyen fondé sur des standards d'ajouter l'authentification unique à leurs applications |
| Utilisateurs | Une seule identité pour se connecter à Microsoft 365, au portail Azure, aux applications SaaS et aux applications internes |

Microsoft Entra ID existe en éditions Free, P1 et P2 ; les fonctionnalités Premium comme l'accès conditionnel (P1) ou Privileged Identity Management (P2, ou Microsoft Entra ID Governance) demandent la licence correspondante. Le **score d'identité sécurisée**, pourcentage qui montre dans quelle mesure le locataire suit les recommandations de sécurité des identités de Microsoft, est disponible dans toutes les éditions.

Autres membres de la famille que l'examen peut nommer :

| Produit | Rôle |
| --- | --- |
| Gouvernance Microsoft Entra ID | Automatise les demandes, les attributions et les révisions d'accès |
| Protection Microsoft Entra ID | Détecte et corrige les risques liés aux identités |
| Microsoft Entra External ID | L'accès des partenaires, des invités et des clients |
| Microsoft Entra Workload ID | La gestion des identités et des accès des applications, services et conteneurs |
| Microsoft Entra Agent ID | Cadre d'identité et de sécurité pour les agents IA |
| Microsoft Entra Domain Services | Services de domaine managés (stratégie de groupe, LDAP, Kerberos et NTLM) pour les applications anciennes |

<!-- section: user-device-identities | objectives: 2.1.2 -->
## Identités d'utilisateur et d'appareil

Microsoft Entra ID gère des identités pour les personnes (**identités d'utilisateur**), pour le matériel (**identités d'appareil**) et pour les logiciels (**identités de charge de travail**, section suivante).

Un utilisateur se décrit par l'endroit où il s'authentifie et par son **type d'utilisateur**, Membre ou Invité ; les invités ont par défaut des privilèges limités.

| Utilisateur | S'authentifie | Type d'utilisateur | Cas type |
| --- | --- | --- | --- |
| Membre interne | Dans votre locataire | Membre | Les employés |
| Invité externe | Avec un compte ou un fournisseur d'identité externe | Invité | Consultants, fournisseurs, partenaires invités par la collaboration B2B |
| Membre externe | Avec un compte externe | Membre | Utilisateurs d'un autre locataire de la même organisation multilocataire |
| Invité interne | Dans votre locataire | Invité | Hérité : un compte local créé pour une personne externe |

**Microsoft Entra External ID** couvre les personnes extérieures à l'organisation : la **collaboration B2B** ajoute des partenaires comme invités, qui se connectent avec leurs propres informations d'identification ; un **locataire externe** gère les clients des applications que vous publiez.

Les **groupes** accordent le même accès à plusieurs identités à la fois :

| Groupe | Usage |
| --- | --- |
| Groupe de **sécurité** | Gérer l'accès à des ressources partagées ; ses membres peuvent être des utilisateurs, des appareils, d'autres groupes et des principaux de service |
| Groupe **Microsoft 365** | La collaboration : boîte aux lettres partagée, calendrier, fichiers, site SharePoint ; ses membres sont uniquement des utilisateurs |

L'appartenance est **affectée** (choisie manuellement) ou **dynamique** (des règles ajoutent et retirent automatiquement les membres). L'appartenance dynamique demande des licences Microsoft Entra ID P1 pour ses utilisateurs ; les appareils n'en demandent aucune. Un groupe dynamique contient soit des utilisateurs, soit des appareils, jamais les deux.

Une **identité d'appareil** donne aux administrateurs des informations pour décider de l'accès :

| État de l'appareil | Scénario |
| --- | --- |
| **Inscrit à Microsoft Entra** | Appareils personnels (BYOD) qui accèdent aux ressources de l'organisation |
| **Joint à Microsoft Entra** | Appareils appartenant en général à l'organisation, sur lesquels on se connecte avec un compte professionnel |
| **Jonction hybride à Microsoft Entra** | Appareils joints à l'Active Directory local et à Microsoft Entra ID |

<!-- section: workload-identities | objectives: 2.1.2 -->
## Identités de charge de travail et d'agent

Une **identité de charge de travail** est une identité attribuée à une charge de travail logicielle (une application, un service, un script, un conteneur) pour qu'elle puisse s'authentifier et accéder à d'autres services et ressources. Avec les identités d'appareil, les identités de charge de travail forment les identités non humaines, ou identités de machine.

| Identité de charge de travail | Ce que c'est |
| --- | --- |
| **Application** | La définition globale d'une application, inscrite auprès de Microsoft Entra ID |
| **Principal de service** | L'identité de cette application dans un locataire ; il définit ce que l'application peut y faire et y atteindre. Quelqu'un doit gérer et protéger ses informations d'identification |
| **Identité managée** | Un type particulier de principal de service dont les informations d'identification sont gérées automatiquement par Microsoft Entra ID ; sans coût supplémentaire |

| Identité managée | Cycle de vie |
| --- | --- |
| **Affectée par le système** | Activée directement sur une ressource Azure, comme une machine virtuelle ; supprimée automatiquement avec cette ressource |
| **Affectée par l'utilisateur** | Une ressource Azure autonome qui peut être attribuée à une ou plusieurs ressources ; reste jusqu'à ce que vous la supprimiez |

> **Piège d'examen.** « Authentifier une ressource Azure auprès d'un autre service Azure sans stocker d'informations d'identification dans le code » désigne une identité managée. Un principal de service que vous créez vous-même a un secret ou un certificat que vous devez stocker et renouveler.

Les **identités d'agent**, fournies par Microsoft Entra Agent ID, sont des identités conçues pour les agents IA, distinctes des identités de charge de travail classiques. Chaque agent a un **sponsor** humain qui en répond, et l'accès conditionnel, la protection des identités et la gouvernance des identités s'étendent aux agents.

<!-- section: hybrid-identity | objectives: 2.1.3 -->
## L'identité hybride

La plupart des organisations exploitent à la fois des applications locales et des applications cloud. L'**identité hybride** donne à chaque utilisateur **une seule identité** pour s'authentifier et être autorisé partout. Elle repose sur le provisionnement (créer dans Microsoft Entra ID l'utilisateur d'Active Directory) et sur la **synchronisation**, qui maintient les utilisateurs et les groupes locaux en accord avec le cloud.

| Outil | Description |
| --- | --- |
| **Microsoft Entra Cloud Sync** | L'outil recommandé : un agent de provisionnement léger en local, avec une configuration stockée et gérée dans Microsoft Entra ID ; plusieurs agents assurent la haute disponibilité |
| **Microsoft Entra Connect Sync** | L'outil antérieur, un serveur de synchronisation local, que Cloud Sync remplace |

Synchroniser les comptes ne dit pas où les mots de passe sont vérifiés. Il existe trois méthodes de connexion (Cloud Sync ne configure ni l'authentification directe ni la fédération : elles se mettent en place avec des outils distincts) :

| Méthode | Où le mot de passe est validé | Infrastructure locale |
| --- | --- | --- |
| **Synchronisation de hachage du mot de passe** | Dans Microsoft Entra ID, par rapport à un hachage synchronisé du mot de passe | Aucune en dehors de la synchronisation ; la méthode la plus simple |
| **Authentification directe** | Par l'Active Directory local, au moyen d'agents légers | Des agents d'authentification sur des serveurs locaux |
| **Fédération** | Par un système approuvé distinct, comme Active Directory Federation Services (AD FS) | Des serveurs de fédération et des proxys |

> **Conseil d'examen.** « Les utilisateurs doivent pouvoir se connecter aux applications cloud même si le centre de données local est indisponible » : synchronisation de hachage du mot de passe, la seule méthode qui ne dépend pas de serveurs locaux au moment de la connexion.

<!-- section: key-points -->
## Points clés

- Microsoft Entra ID : gestion des identités et des accès dans le cloud ; un locataire est l'instance d'une organisation.
- Les utilisateurs sont membres ou invités, internes ou externes ; les invités de la collaboration B2B se connectent avec leurs propres informations d'identification.
- Appareils : inscrits (personnels), joints (appartenant à l'organisation), à jonction hybride (aussi dans l'Active Directory local).
- Identités de charge de travail : applications, principaux de service, identités managées. Identité managée : aucune information d'identification à gérer ; affectée par le système, elle suit sa ressource ; affectée par l'utilisateur, elle est autonome et partageable.
- Identités d'agent : pour les agents IA, avec un sponsor humain.
- Identité hybride : une seule identité en local et dans le cloud, synchronisée par Cloud Sync (recommandé) ou Connect Sync ; connexion par synchronisation de hachage du mot de passe, authentification directe ou fédération.
