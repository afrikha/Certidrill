L'accès privilégié est le chemin le plus court vers une compromission totale : une session de Global Administrator volée ou un hachage de Domain Admin suffit pour déployer un rançongiciel partout. L'examen SC-100 vous demande de concevoir qui obtient des privilèges, comment, pour combien de temps et depuis quel appareil, dans Microsoft Entra ID, dans l'Active Directory local, dans les autres clouds et dans les applications SaaS, et d'évaluer si une configuration existante résiste aux attaques qui la visent.

<!-- section: enterprise-access-model | objectives: 2.3.1 -->
## Le modèle d'accès d'entreprise

Le **modèle d'accès d'entreprise** remplace le modèle de niveaux (tiers) d'Active Directory par un modèle qui couvre l'environnement local, plusieurs clouds et les accès internes et externes.

| Plan ou chemin d'accès | Contient | Remplace |
| --- | --- | --- |
| Plan de contrôle | Contrôle centralisé des identités et des accès (Microsoft Entra ID, AD DS, PIM, accès conditionnel), plus le contrôle d'accès réseau quand c'est la seule option (OT hérité) | Tier 0 |
| Plan de gestion | Gestion informatique des charges de travail et de leur infrastructure, en local, dans Azure ou un autre cloud | Tier 1 |
| Plan des données/charges de travail | Processus métier dans les applications et charges de travail, propriété intellectuelle dans les données | Tier 1 |
| Accès utilisateur | Employés, partenaires (B2B) et clients (B2C) qui atteignent les ressources | Tier 2 |
| Accès aux applications | Accès programmatique par des API | Tier 2 |
| Accès privilégié | Chemins utilisés par le personnel informatique, les développeurs et d'autres pour gérer les systèmes | Transversal |

Règles :

- **Les plans inférieurs ne doivent jamais contrôler les plans supérieurs** : plan de contrôle, puis plan de gestion, puis plan des données/charges de travail. Un administrateur de serveurs ne doit pas pouvoir modifier un contrôleur de domaine ou une stratégie d'accès conditionnel.
- Appliquer la Confiance Zéro à chaque accès : vérifier explicitement, privilège minimum, supposer une violation.
- Auditer en continu les configurations qui permettent une élévation involontaire (un groupe du support qui peut réinitialiser les mots de passe des administrateurs, une application avec `RoleManagement.ReadWrite.Directory`).

Conception de la délégation avec Microsoft Entra ID :

| Besoin | Conception |
| --- | --- |
| Le support réinitialise les mots de passe des utilisateurs d'un pays | Helpdesk Administrator limité à une **unité administrative** |
| Protéger les comptes privilégiés contre les administrateurs de niveau inférieur | **Unités administratives de gestion restreinte** ou groupes assignables à un rôle |
| Une équipe gère une application | Attribution de rôle limitée à l'application (Application Administrator sur cette application) ou rôle personnalisé |
| Les opérateurs Azure gèrent les machines virtuelles d'une zone d'atterrissage | Rôle Azure RBAC à l'abonnement ou au groupe de ressources, éligible par PIM |
| Déléguer l'attribution de rôles en sécurité | Role Based Access Control Administrator avec une condition qui limite les rôles attribuables |

> **Piège d'examen.** Accorder Global Administrator « faute de connaître un rôle plus restreint » viole le privilège minimum ; tout comme attribuer un rôle au niveau du locataire quand une unité administrative ou une étendue d'application répond à l'exigence.

<!-- section: entra-governance | objectives: 2.3.2 -->
## Sécurité et gouvernance de Microsoft Entra : PIM, gestion des droits d'utilisation, révisions d'accès

Les trois fonctionnalités répondent à des questions différentes :

| | Privileged Identity Management (PIM) | Gestion des droits d'utilisation | Révisions d'accès |
| --- | --- | --- | --- |
| Question | Quand les rôles privilégiés sont-ils actifs ? | Comment l'accès est-il demandé et accordé ? | L'accès existant doit-il continuer ? |
| Modèle | Attributions éligibles ou actives, activation juste-à-temps | Packages d'accès (groupes, Teams, applications, sites SharePoint) avec stratégies de demande, approbations et expiration | Recertification récurrente par des réviseurs, avec retrait automatique |
| Étendue | Rôles Microsoft Entra, rôles de ressources Azure, PIM for Groups | Employés et utilisateurs externes (organisations connectées) | Groupes, Teams, applications, invités, packages d'accès, rôles privilégiés |

Conception **PIM** : attributions éligibles pour chaque rôle privilégié ; l'activation exige la MFA ou un **contexte d'authentification** de l'accès conditionnel (par exemple une authentification résistante au hameçonnage), une justification et, pour les rôles les plus sensibles, une approbation ; durée d'activation maximale courte (1 à 24 heures) ; éligibilité limitée dans le temps ; alertes sur les rôles attribués hors de PIM ; PIM for Groups pour rendre l'appartenance aux groupes juste-à-temps.

Conception de la **gestion des droits d'utilisation** : catalogues détenus par les métiers, packages d'accès avec expiration, contrôles de séparation des tâches (packages incompatibles), organisations connectées pour que les partenaires demandent eux-mêmes l'accès et le perdent à l'expiration.

**Licences** : Microsoft Entra ID P2 inclut PIM et les révisions d'accès de base ; Microsoft Entra ID Governance (ou Microsoft Entra Suite) est la licence de l'ensemble des fonctionnalités de gouvernance, y compris les workflows de cycle de vie.

| Exigence | Fonctionnalité |
| --- | --- |
| Les administrateurs doivent demander le rôle Exchange Administrator et l'obtenir pour 4 heures | PIM, attribution éligible |
| Des prestataires demandent l'accès aux ressources d'un projet, approuvé par le chef de projet, retiré après 90 jours | Package d'accès de la gestion des droits d'utilisation |
| Chaque trimestre, les responsables confirment que les membres de leur équipe ont encore besoin d'une application | Révision d'accès |
| Des utilisateurs partenaires obtiennent l'accès sans qu'un administrateur crée des invités | Gestion des droits d'utilisation avec une organisation connectée |

> **Piège d'examen.** PIM limite **quand** un privilège est utilisable ; il ne décide pas si quelqu'un doit encore le détenir. C'est la révision d'accès. Et un package d'accès gouverne les demandes, pas l'activation d'un rôle privilégié.

<!-- section: ad-ds-resilience | objectives: 2.3.3 -->
## Évaluer la sécurité et la résilience d'AD DS

Évaluez AD DS par rapport aux attaques utilisées dans les rançongiciels et la compromission de domaine :

| Attaque | Ce que fait l'attaquant | Atténuation à rechercher |
| --- | --- | --- |
| Pass-the-hash, pass-the-ticket | Réutilise des informations d'identification volées dans la mémoire d'une machine | Hiérarchisation (les administrateurs ne se connectent jamais aux machines de niveau inférieur), Credential Guard, Windows LAPS, Protected Users |
| Kerberoasting | Demande des tickets de service et casse hors ligne les mots de passe des comptes de service | gMSA ou longs mots de passe aléatoires, AES uniquement, peu de SPN sur les comptes privilégiés |
| Pulvérisation de mots de passe, force brute | Essaie des mots de passe courants sur de nombreux comptes | Mots de passe interdits (Protection par mot de passe Microsoft Entra en local), verrouillage intelligent, MFA sur les services exposés |
| DCSync, DCShadow | Abuse des droits de réplication pour lire les hachages ou pousser des modifications | Auditer et restreindre les autorisations de réplication ; détection par Defender for Identity |
| Golden Ticket | Forge des tickets avec la clé `krbtgt` | Protéger les contrôleurs de domaine ; réinitialiser deux fois le mot de passe `krbtgt` après une compromission |
| Abus de certificats (AD CS) | Demande des certificats qui usurpent l'identité d'administrateurs | Traiter AD CS comme tier 0, réviser les modèles vulnérables |
| Abus de stratégie de groupe ou d'ACL | Utilise des droits délégués pour s'élever | Réviser les délégations, AdminSDHolder, les chemins de mouvement latéral |

Contrôles de **gouvernance et de résilience** :

- Un plan de **récupération de forêt** documenté, avec des sauvegardes de contrôleurs de domaine hors ligne ou immuables et des restaurations testées : les rançongiciels visent les contrôleurs de domaine.
- Les comptes d'administration AD DS ne sont pas synchronisés vers des rôles privilégiés Microsoft Entra : les administrateurs cloud sont des comptes **cloud uniquement**.
- Des capteurs **Microsoft Defender for Identity** sur les contrôleurs de domaine (et les serveurs AD FS, AD CS, Microsoft Entra Connect) ; ses évaluations de posture dans le **Niveau de sécurité Microsoft (Microsoft Secure Score)** et ses **chemins de mouvement latéral** montrent les comptes sensibles exposés.

> **Conseil d'examen.** « Une compromission locale ne doit pas donner le contrôle du locataire Microsoft 365 » signifie comptes privilégiés cloud uniquement, aucune synchronisation des comptes d'administration AD vers des rôles privilégiés, et PHS pour que la connexion cloud ne dépende pas de l'infrastructure locale.

<!-- section: cloud-tenant-admin | objectives: 2.3.4 -->
## Sécuriser l'administration des locataires cloud

**Locataires Microsoft Entra et Microsoft 365** :

| Contrôle | Conception |
| --- | --- |
| Accès d'urgence | Au moins deux comptes d'accès d'urgence cloud uniquement avec des informations d'identification résistantes au hameçonnage, exclus des stratégies d'accès conditionnel qui pourraient les bloquer, connexions surveillées et alertées |
| Global Administrators | Moins de cinq, éligibles par PIM, jamais utilisés pour le travail quotidien |
| Authentification | Force d'authentification résistante au hameçonnage (clés d'accès, Windows Hello Entreprise, authentification par certificat) pour chaque rôle d'administration |
| Appareils | Portails d'administration accessibles seulement depuis des appareils d'accès privilégié conformes (accès conditionnel) |
| Modifications sensibles | Actions protégées sur l'accès conditionnel, les paramètres interlocataires et la suppression définitive |
| Détection | Alertes sur les activations de rôles PIM hors des heures prévues, les nouvelles informations d'identification sur les applications privilégiées, les octrois de consentement |

**Azure** : rôles privilégiés (Owner, User Access Administrator, Role Based Access Control Administrator) éligibles par PIM à l'étendue du groupe d'administration ou de l'abonnement ; éviter les attributions permanentes au groupe d'administration racine ; un Global Administrator qui utilise l'**élévation d'accès** à l'étendue racine la retire juste après usage, et la modification est journalisée.

**AWS et GCP** : fédérer leurs consoles avec Microsoft Entra ID (SSO, provisionnement) pour que la MFA Microsoft Entra, l'accès conditionnel, PIM for Groups (pour un mappage des rôles par groupe) et les révisions d'accès s'appliquent ; mettre sous clé les utilisateurs root AWS et les super-administrateurs GCP avec une MFA forte et ne les utiliser qu'en dernier recours ; surveiller leur activité avec les connecteurs d'applications de Defender for Cloud Apps et Sentinel.

**Applications SaaS** : les administrer par SSO avec des comptes d'administration dédiés, réviser les titulaires des rôles d'administration, et utiliser la **gestion de la posture de sécurité SaaS (SSPM)** de Defender for Cloud Apps pour trouver les configurations risquées.

> **Piège d'examen.** Synchroniser un compte Domain Admin local et lui attribuer Global Administrator relie les deux plans de contrôle : la compromission de l'un devient la compromission des deux.

<!-- section: ciem | objectives: 2.3.5 -->
## Gestion des droits d'utilisation de l'infrastructure cloud

La **gestion des droits d'utilisation de l'infrastructure cloud (CIEM)** trouve l'écart entre les autorisations que les identités ont et celles qu'elles utilisent, dans tous les clouds.

**Microsoft Entra Permissions Management** a été mis hors service : plus vendu depuis le 1er avril 2025 et mis hors service le 1er novembre 2025. La CIEM fait désormais partie du plan **Defender Cloud Security Posture Management (Defender CSPM)** de Microsoft Defender pour le cloud :

| Cloud | Identités analysées |
| --- | --- |
| Azure | Utilisateurs, groupes et principaux de service Microsoft Entra |
| AWS | Utilisateurs, rôles et groupes IAM |
| GCP | Utilisateurs, groupes et comptes de service IAM |

Fonctionnalités : recommandations pour retirer les comptes inactifs, invités ou bloqués qui ont encore des accès, limiter les privilèges d'administration, ajuster les autorisations surdimensionnées selon l'usage réel et imposer la MFA aux utilisateurs IAM ; requêtes de l'**explorateur de sécurité cloud** sur les autorisations effectives (« qui peut atteindre ce stockage exposé sur Internet ? ») ; **analyse des chemins d'attaque** qui relie les identités surprivilégiées au mouvement latéral ; un classeur CIEM.

| Exigence | Recommandation |
| --- | --- |
| Trouver les autorisations inutilisées des rôles AWS et des comptes de service GCP avec un seul outil | CIEM de Defender CSPM dans Defender pour le cloud (activer le plan sur les connecteurs AWS et GCP) |
| Rendre juste-à-temps les attributions Owner dans Azure | PIM pour les ressources Azure |
| Détecter qu'une identité surprivilégiée ouvre un chemin vers une base de données sensible | Analyse des chemins d'attaque (Defender CSPM) |

> **Piège d'examen.** Une conception qui propose Microsoft Entra Permissions Management en novembre 2026 propose un produit mis hors service : utilisez Defender CSPM.

<!-- section: access-reviews | objectives: 2.3.6 -->
## Évaluer une solution de révision d'accès

Évaluez une conception de révisions d'accès selon ces critères :

| Critère | Bonne conception |
| --- | --- |
| Étendue | Tous les rôles privilégiés (Microsoft Entra et Azure, par PIM), les invités de tous les groupes et Teams, les packages d'accès, les applications à forte valeur |
| Réviseurs | Propriétaires de ressources ou responsables pour l'accès métier ; une deuxième étape de révision pour les rôles privilégiés ; autorévision seulement pour les accès à faible risque |
| Fréquence | Trimestrielle ou plus pour les rôles privilégiés et les invités ; au moins annuelle pour l'accès standard aux applications |
| Aides à la décision | Recommandations basées sur l'activité de connexion (utilisateurs inactifs), pour que les réviseurs n'approuvent pas à l'aveugle |
| Absence de réponse | *If reviewers don't respond* : retirer l'accès ou suivre les recommandations, pas approuver |
| Application | **Auto apply results** pour retirer l'accès automatiquement ; invités supprimés du locataire après refus |
| Preuves | Historique des révisions conservé et exportable pour les auditeurs |

Conceptions faibles : révisions sans application automatique (décisions jamais appliquées), réviseurs qui ne connaissent pas la ressource, approbation par défaut quand personne ne répond, et rôles privilégiés laissés hors de l'étendue.

> **Conseil d'examen.** « Retirer les invités qui n'utilisent plus l'équipe, avec le moins d'effort d'administration » signifie une révision d'accès des invités avec recommandations, application automatique et suppression en cas de refus, pas un script.

<!-- section: privileged-workstations | objectives: 2.3.7 -->
## Stations de travail sécurisées pour l'accès privilégié, y compris l'accès à distance

Le **principe de la source propre** : une session n'est jamais plus sûre que l'appareil d'où elle part. Un attaquant qui contrôle l'appareil vole les jetons et les informations d'identification, quelle que soit la MFA du compte.

| Profil d'appareil | Pour | Contrôles clés |
| --- | --- | --- |
| Entreprise | Tous les utilisateurs, développeurs généralistes | Defender for Endpoint, gestion par Intune, les utilisateurs peuvent exécuter la plupart des applications et naviguer |
| Spécialisé | Utilisateurs qui ont besoin d'un environnement contrôlé | Pas d'administrateur local, seules les applications autorisées (contrôle d'application appliqué), applications installées uniquement par Intune |
| Station de travail à accès privilégié (PAW) | Rôles dont la compromission affecterait sensiblement l'organisation | Pas d'administrateur local, contrôle d'application appliqué, navigation web refusée par défaut sauf destinations approuvées, pas de messagerie, Credential Guard, BitLocker, pas de BYOD |

Les PAW sont déployées avec **Windows Autopilot** sur du matériel avec TPM 2.0, démarrage sécurisé et sécurité basée sur la virtualisation, gérées par Intune, et leur conformité est imposée par l'accès conditionnel (portails d'administration uniquement depuis des PAW conformes). Les administrateurs utilisent donc des comptes et des appareils distincts pour la productivité et l'administration.

**Accès à distance par des intermédiaires** :

| Intermédiaire | Recommandations |
| --- | --- |
| VPN | Authentification Microsoft Entra et accès conditionnel, correctifs rapides ; évoluer vers un accès par application |
| Serveur de rebond, RDS, VDI | Ne jamais exposer RDP directement sur Internet ; publier par le proxy d'application Microsoft Entra ou utiliser Azure Bastion ; instances dédiées pour les rôles privilégiés |
| Azure Bastion | RDP et SSH dans le navigateur vers les machines virtuelles Azure sans IP publique ; la session du portail Azure doit atteindre le niveau de sécurité privilégié |
| Proxy d'application Microsoft Entra, Accès privé | Accès par application aux applications locales avec accès conditionnel ; contrôles de session de Defender for Cloud Apps |
| Solutions PAM | Stockent des informations d'identification privilégiées, donc cibles de grande valeur ; exiger une deuxième personne pour les workflows critiques |

> **Piège d'examen.** Un serveur de rebond ne corrige pas une station d'administrateur compromise : l'attaquant emprunte la session à travers lui. La source propre commence à la PAW, et chaque intermédiaire hérite sa confiance de l'appareil et du compte qui s'y connectent.

<!-- section: key-points -->
## Points clés

- Modèle d'accès d'entreprise : plan de contrôle, plan de gestion, plan des données/charges de travail, accès utilisateur et aux applications ; les plans inférieurs ne contrôlent jamais les plans supérieurs.
- Déléguer avec des unités administratives, des étendues d'application et des conditions, pas avec des rôles à l'échelle du locataire.
- PIM = quand (juste-à-temps) ; gestion des droits d'utilisation = comment l'accès est demandé ; révisions d'accès = si l'accès continue.
- AD DS : hiérarchisation, LAPS, gMSA, Protected Users, Defender for Identity, récupération de forêt testée.
- Les administrateurs cloud sont cloud uniquement, résistants au hameçonnage, éligibles par PIM, sur des PAW ; deux comptes d'accès d'urgence ; moins de cinq Global Administrators.
- Permissions Management est mis hors service ; la CIEM est dans Defender CSPM pour Azure, AWS et GCP.
- Révisions d'accès : bonne étendue et bons réviseurs, recommandations, application automatique, pas d'approbation par défaut.
- PAW plus un intermédiaire renforcé (Bastion, proxy d'application, Accès privé) ; jamais de RDP direct.
