L'AZ-140 vérifie que vous savez planifier, déployer et exploiter Azure Virtual Desktop : le réseau et le stockage qui le soutiennent, les pools d'hôtes et leurs images, l'identité et la sécurité, l'environnement utilisateur et ses applications, puis la supervision, les mises à jour et la reprise. Il suppose un niveau AZ-104 sur le calcul, le réseau, l'identité et le stockage Azure, et s'appuie dessus. Ce cours suit le guide d'étude officiel objectif par objectif ; chaque section indique les objectifs qu'elle prépare.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | Microsoft Certified: Azure Virtual Desktop Specialty |
| Durée | 100 minutes d'examen |
| Questions | Nombre non publié ; les formats ne le sont pas non plus, et l'examen « peut comporter des composants interactifs » |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft documente l'accès à Microsoft Learn pendant les examens de niveau associé et expert ; il ne le précise pas pour les examens de spécialité. Préparez-vous comme pour un examen sans documents |
| Validité | Un an, renouvelée gratuitement par une évaluation en ligne sur Microsoft Learn |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Planifier et implémenter une infrastructure Azure Virtual Desktop | 40 à 45 % |
| Planifier et implémenter l'identité et la sécurité | 15 à 20 % |
| Planifier et implémenter des environnements et des applications utilisateur | 20 à 25 % |
| Monitorer et gérer une infrastructure Azure Virtual Desktop | 10 à 15 % |

Le domaine infrastructure pèse à lui seul près de la moitié du score : réseau, stockage FSLogix, conception des pools d'hôtes, déploiement et images. Le score est mis à l'échelle : 700 ne signifie pas 70 % des questions. Les questions à plusieurs éléments (listes déroulantes, affirmations Oui/Non, glisser-déposer, étapes à ordonner) rapportent un point par élément correct.

Un examen se compose de sections :

- **Étude de cas.** La description d'une entreprise en onglets (environnement existant, exigences, contraintes) suivie de plusieurs questions. Une fois l'étude de cas quittée, vous ne pouvez plus y revenir.
- **Série Oui/Non.** Le même scénario est répété avec une solution différente à chaque fois ; vous indiquez si la solution atteint l'objectif. Chaque réponse est définitive. Plusieurs solutions peuvent convenir, ou aucune.
- **Section principale.** Des questions indépendantes que vous pouvez marquer et revoir jusqu'à la validation : une réponse parmi quatre, « sélectionnez deux réponses », affirmations Oui/Non, listes déroulantes qui complètent un paramètre, une commande PowerShell ou un fragment Bicep, glisser-déposer, et étapes de déploiement à mettre dans l'ordre.

<!-- section: reading-questions -->
## Lire une question

Un énoncé type compte trois à six phrases : « Vous avez un pool d'hôtes Azure Virtual Desktop nommé Pool1 qui contient... », souvent un tableau d'hôtes de session ou d'utilisateurs avec leur type de jonction, puis une contrainte décisive et la question « Que devez-vous configurer ? » ou « Que devez-vous faire en premier ? ».

Procédez en trois temps :

1. Notez le **type de pool d'hôtes** (regroupé ou personnel), le **type de jonction** des hôtes de session (joints à Microsoft Entra, joints à Microsoft Entra hybride, joints à un domaine AD DS ou Microsoft Entra Domain Services) et le **système d'exploitation** (Windows client multisession ou mono-session, Windows Server).
2. Notez d'où les utilisateurs se connectent : réseau d'entreprise via ExpressRoute ou VPN, ou internet.
3. Trouvez la contrainte qui départage les deux réponses plausibles.

| Mots de l'énoncé | Pensez à |
| --- | --- |
| « réduire les coûts » | Pool d'hôtes regroupé en multisession, mise à l'échelle automatique, Start VM on Connect, le niveau de stockage le plus économique qui couvre le besoin en IOPS |
| « réduire l'effort d'administration » | L'option managée : Azure Files plutôt qu'un cluster de serveurs de fichiers, configuration d'hôte de session plutôt que des scripts, App attach plutôt qu'une réinstallation dans l'image |
| « les utilisateurs se connectent depuis le réseau d'entreprise via ExpressRoute » | RDP Shortpath pour les réseaux gérés, QoS sur UDP 3390 |
| « les utilisateurs se connectent de chez eux par internet » | RDP Shortpath pour les réseaux publics (STUN, puis TURN) |
| « le trafic ne doit pas traverser internet » | Private Link : points de terminaison privés `connection`, `feed` et `global` |
| « le même profil sur tous les hôtes de session » | Conteneur de profil FSLogix sur un partage SMB |
| « un profil qui survit à la perte d'un emplacement de stockage » | FSLogix Cloud Cache avec plusieurs emplacements |
| « latence la plus faible », « des milliers d'utilisateurs », « échelle entreprise » | Azure NetApp Files |
| « clients externes », « SaaS » | Tarification de l'accès par utilisateur sur l'abonnement |
| « un bureau dédié qui conserve les applications et les données de l'utilisateur » | Pool d'hôtes personnel |
| « une seule application, pas le bureau complet » | Groupe d'applications RemoteApp |

> **Conseil d'examen.** Le type de jonction des hôtes de session décide de nombreuses réponses : la façon dont le partage FSLogix authentifie les utilisateurs, l'option d'authentification unique qui fonctionne, le rôle Azure dont les utilisateurs ont besoin sur les machines virtuelles. Notez-le avant de lire les options.

<!-- section: building-blocks -->
## Les briques de base

| Objet | Ce que c'est | Règles qui reviennent |
| --- | --- | --- |
| Pool d'hôtes | Un ensemble de machines virtuelles Azure inscrites comme hôtes de session | Regroupé (plusieurs utilisateurs par hôte, équilibrage de charge breadth-first ou depth-first) ou personnel (un utilisateur par hôte). Tous les hôtes d'un pool doivent provenir de la même image |
| Hôte de session | Une machine virtuelle Windows dotée de l'agent Azure Virtual Desktop | Jointe à Microsoft Entra ID, ou à un domaine AD DS ou Microsoft Entra Domain Services. N'établit que des connexions sortantes vers le service |
| Groupe d'applications | Publie un bureau complet ou un ensemble d'applications d'un pool d'hôtes | Un seul groupe d'applications de bureau par pool d'hôtes ; plusieurs groupes d'applications RemoteApp sont possibles. Les utilisateurs y sont affectés |
| Espace de travail | Regroupe les groupes d'applications dans le flux auquel les utilisateurs s'abonnent | Un groupe d'applications n'appartient qu'à un seul espace de travail |
| Plan de mise à l'échelle | Les planifications de mise à l'échelle automatique attachées aux pools d'hôtes | Allume et éteint les hôtes de session, ou les crée et les supprime avec la configuration d'hôte de session |

Les utilisateurs s'authentifient toujours avec Microsoft Entra ID, et leurs comptes doivent exister dans le locataire utilisé pour Azure Virtual Desktop. Avec AD DS ou Microsoft Entra Domain Services, les comptes doivent être des identités hybrides.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Pool d'hôtes regroupé | Pool d'hôtes personnel | Regroupé : les utilisateurs arrivent sur l'hôte choisi par l'équilibreur, les profils sont dans FSLogix, les hôtes sont reconstruits depuis des images mises à jour. Personnel : chaque utilisateur est attribué à un hôte, automatiquement ou directement, et peut garder ses données sur le disque du système d'exploitation |
| Groupe d'applications de bureau | Groupe d'applications RemoteApp | Le bureau publie le bureau Windows complet. RemoteApp publie des applications individuelles. Si un utilisateur reçoit les deux sur le même pool d'hôtes, seul le type de groupe d'applications préféré s'affiche |
| Joint à Microsoft Entra | Joint à Microsoft Entra hybride ou joint à un domaine | Les hôtes hybrides et joints à un domaine ont besoin d'une visibilité réseau sur les contrôleurs de domaine. Les hôtes joints à Microsoft Entra n'en ont pas besoin et utilisent Microsoft Entra Kerberos pour accéder à un partage Azure Files |
| RDP Shortpath pour les réseaux gérés | RDP Shortpath pour les réseaux publics | Gérés : UDP direct via le peering privé ExpressRoute ou un VPN, avec un écouteur sur UDP 3390 ou avec STUN. Publics : UDP par internet via STUN, ou relayé par TURN |
| RDP Shortpath | RDP Multipath | Shortpath fournit des transports UDP. Multipath garde plusieurs chemins ouverts et bascule sur un chemin de secours quand le chemin actif se dégrade |
| Conteneur de profil | Conteneur ODFC | Le conteneur de profil contient tout le profil utilisateur. Le conteneur ODFC ne contient que les données des Microsoft 365 Apps, par exemple quand une autre solution de profil gère le reste |
| VHDLocations | Cloud Cache | VHDLocations désigne des emplacements SMB où le conteneur est attaché directement. Cloud Cache écrit vers plusieurs fournisseurs à partir d'un cache local, pour la résilience |
| Azure Files | Azure NetApp Files | Azure Files : service de plateforme dans toutes les régions, dès 1 Gio, joint à AD DS, Microsoft Entra Domain Services ou Microsoft Entra Kerberos. Azure NetApp Files : certaines régions, pool de capacité de 1 Tio minimum, latence la plus faible, AD DS ou Microsoft Entra Domain Services uniquement |
| Licences Windows client | Licences Windows Server | Windows 10 et 11 Entreprise : licences par utilisateur éligibles (Microsoft 365 E3, E5, F3, Business Premium...). Windows Server : CAL RDS avec Software Assurance et un serveur de licences RDS |
| Mise à l'échelle automatique | Start VM on Connect | La mise à l'échelle automatique suit des planifications et l'utilisation de tout le pool. Start VM on Connect démarre un hôte libéré quand un utilisateur se connecte |
| App attach | Installation dans l'image | App attach monte des packages d'applications depuis un partage à l'ouverture de session, par utilisateur ou par groupe, sans reconstruire l'image. L'installation dans l'image exige une nouvelle image à chaque mise à jour |
| Rôles Azure RBAC | Droits dans l'hôte de session | Les rôles Desktop Virtualization gèrent les objets du service ou donnent accès aux groupes d'applications. Les droits dans Windows viennent des groupes locaux, des stratégies de groupe ou d'Intune |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : l'identité, les profils et la distribution des applications dépendent tous des choix réseau et stockage du premier module.
2. Montez un petit labo dans un abonnement avec paiement à l'utilisation : un pool d'hôtes regroupé avec deux hôtes de session, un partage Azure Files avec FSLogix, un groupe d'applications RemoteApp. Connectez-vous avec Windows App, ouvrez **Informations de connexion** et vérifiez le transport. Libérez ou supprimez les hôtes de session à la fin de chaque séance : ils sont facturés tant qu'ils tournent.
3. Refaites le labo avec des hôtes de session joints à Microsoft Entra et Microsoft Entra Kerberos sur le partage : les différences avec les hôtes joints à un domaine sont testées encore et encore.
4. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
5. Réservez le vrai examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
