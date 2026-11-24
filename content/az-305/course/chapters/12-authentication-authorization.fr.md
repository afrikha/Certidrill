Microsoft Entra ID authentifie les personnes, les applications et les charges de travail ; Azure RBAC et quelques contrôles voisins autorisent ce qu'elles font. Les questions énoncent des contraintes (un Active Directory existant, des partenaires, des clients, des applications anciennes, des secrets dans le code) et demandent la conception qui y répond avec le moins d'infrastructure.

<!-- section: hybrid-authentication | objectives: 1.2.1 -->
## L'authentification des identités hybrides

Les utilisateurs d'un domaine Active Directory Domain Services (AD DS) local sont synchronisés vers Microsoft Entra ID, et vous choisissez où leur mot de passe est validé :

| | Synchronisation de hachage du mot de passe (PHS) | Authentification directe (PTA) | Fédération avec AD FS |
| --- | --- | --- | --- |
| Mot de passe validé | Dans le cloud, par rapport à un hachage synchronisé | En local, par des agents qui joignent les contrôleurs de domaine | En local, par le service de fédération |
| Infrastructure locale | Rien au-delà de l'outil de synchronisation | Des agents légers (trois recommandés), connexions sortantes uniquement | Serveurs AD FS et proxy d'application web, réseau de périmètre, équilibrage de charge, certificats |
| Compte désactivé ou verrouillé, mot de passe expiré, heures de connexion | Pas appliqués immédiatement (un compte désactivé peut prendre jusqu'à 30 minutes) | Appliqués à chaque connexion | Appliqués à chaque connexion |
| Connexion quand le centre de données est injoignable | Fonctionne | Échoue | Échoue |
| Détection des informations d'identification divulguées | Oui | Seulement si la PHS est aussi activée | Seulement si la PHS est aussi activée |
| À choisir quand | Rien d'autre n'est exigé : effort minimal, disponibilité maximale | Les états de compte locaux et les heures de connexion doivent s'appliquer immédiatement, sans serveurs de fédération | Une exigence que Microsoft Entra ID ne prend pas en charge nativement : fournisseur multifacteur tiers, connexion avec `sAMAccountName` |

- L'**authentification unique transparente** (Seamless SSO) fonctionne avec la PHS et la PTA : sur les appareils joints au domaine, à l'intérieur du réseau de l'entreprise, le mot de passe n'est pas redemandé aux utilisateurs.
- Activez la PHS même quand la PTA ou la fédération est la méthode de connexion : c'est la solution de secours si les serveurs locaux tombent, et le prérequis de la détection des informations d'identification divulguées.

> **Piège d'examen.** La PTA ne bascule pas d'elle-même vers la PHS : changer de méthode de connexion est une modification manuelle. « Les utilisateurs doivent pouvoir se connecter à Microsoft 365 même si le centre de données est hors ligne » désigne la PHS comme méthode principale.

<!-- section: strong-authentication | objectives: 1.2.1 -->
## Authentification forte et accès conditionnel

| Méthode | À retenir |
| --- | --- |
| Windows Hello Entreprise | Information d'identification liée à un appareil Windows, déverrouillée par un code PIN ou la biométrie |
| Clé d'accès (passkey FIDO2) sur une clé de sécurité ou dans Microsoft Authenticator | Liée à l'appareil et résistante à l'hameçonnage ; recommandée pour les administrateurs et les utilisateurs soumis à réglementation |
| Clé d'accès synchronisée | Stockée par un fournisseur de clés d'accès et disponible sur tous les appareils de l'utilisateur |
| Authentification basée sur un certificat | Certificats et cartes à puce validés par Microsoft Entra ID lui-même, sans serveurs de fédération |
| Mot de passe et authentification multifacteur | Plus fort qu'un mot de passe seul, mais pas résistant à l'hameçonnage |

L'**accès conditionnel** est le moteur de stratégies : si un ensemble de signaux est présent (utilisateur ou groupe, application, emplacement, plateforme et état de l'appareil, risque), alors bloquer, ou accorder l'accès sous contrôles (authentification multifacteur, force d'authentification, appareil conforme, appareil à jonction hybride Microsoft Entra, conditions d'utilisation, changement de mot de passe). Les stratégies sont évaluées après le premier facteur d'authentification.

| Exigence | Recommandation |
| --- | --- |
| Authentification multifacteur de base pour tous les utilisateurs, sans licence supplémentaire | Paramètres de sécurité par défaut |
| Authentification multifacteur seulement hors des emplacements approuvés, ou seulement pour certaines applications | Accès conditionnel (Microsoft Entra ID P1) |
| Les administrateurs doivent utiliser des méthodes résistantes à l'hameçonnage | Accès conditionnel avec une force d'authentification |
| Seuls les appareils gérés par l'entreprise peuvent atteindre une application | Accès conditionnel exigeant un appareil conforme ou à jonction hybride |
| Réagir automatiquement aux connexions à risque et aux utilisateurs dont les informations d'identification ont fuité | Accès conditionnel basé sur les risques avec Microsoft Entra ID Protection (Microsoft Entra ID P2) |
| Mesurer l'impact d'une stratégie avant de l'appliquer | Mode rapport seul et outil What If |

> **Conseil d'examen.** Lisez la licence dans l'énoncé. L'accès conditionnel demande Microsoft Entra ID P1 ; tout ce qui repose sur le risque de connexion ou le risque utilisateur demande P2. Si l'entreprise « possède Microsoft Entra ID Free et doit réduire les coûts », la réponse est les paramètres de sécurité par défaut.

<!-- section: identity-management | objectives: 1.2.2 -->
## Annuaires, synchronisation et utilisateurs externes

Deux outils synchronisent AD DS vers Microsoft Entra ID :

| | Microsoft Entra Cloud Sync | Microsoft Entra Connect Sync |
| --- | --- | --- |
| Architecture | Des agents légers en local, une configuration conservée dans le cloud | Un serveur de synchronisation en local |
| Haute disponibilité | Plusieurs agents actifs avec basculement automatique | Un serveur actif, plus un second en mode de préproduction |
| Forêts déconnectées (fusions et acquisitions) | Prises en charge | Non prises en charge |
| Limites | 150 000 objets par domaine ; groupes jusqu'à 50 000 membres | Pas de limite d'objets ; groupes jusqu'à 250 000 membres |
| Configuration de la PTA et d'AD FS | Gérée séparément | Incluse dans l'outil |
| Recommandation | Par défaut : c'est l'orientation stratégique de Microsoft | Quand une limite ou une fonctionnalité manquante écarte Cloud Sync |

De quel service d'annuaire une charge de travail a-t-elle besoin ?

| Besoin | Recommandation |
| --- | --- |
| Identités cloud, authentification unique vers les applications SaaS et personnalisées avec OpenID Connect, OAuth ou SAML | Microsoft Entra ID |
| Applications anciennes déplacées sur des machines virtuelles Azure qui ont besoin de la jonction de domaine, des stratégies de groupe, de LDAP, de Kerberos ou de NTLM, sans exploiter de contrôleurs de domaine | Microsoft Entra Domain Services (domaine managé) |
| La même chose, plus des extensions de schéma, des droits d'administrateur de domaine ou le contrôle total du domaine | AD DS sur des machines virtuelles Azure, autogéré |

> **Piège d'examen.** Microsoft Entra Domain Services valide Kerberos et NTLM avec des hachages de mots de passe. Les utilisateurs qui ne s'authentifient que par la fédération AD FS n'ont aucun hachage utilisable dans Microsoft Entra ID : activez la synchronisation de hachage du mot de passe, sinon Domain Services ne peut pas les connecter.

Les utilisateurs externes n'ont pas tous leur place au même endroit :

| Utilisateurs | Recommandation | Où vivent les comptes |
| --- | --- | --- |
| Partenaires et fournisseurs qui travaillent sur vos applications et vos ressources | Collaboration B2B | Utilisateurs invités dans votre locataire de personnel, qui se connectent avec leur propre fournisseur d'identité |
| Utilisateurs de partenaires dans les canaux partagés de Microsoft Teams | Connexion directe B2B | Dans leur locataire d'origine uniquement ; les deux organisations activent une approbation mutuelle |
| Employés d'une même organisation répartis sur plusieurs locataires | Synchronisation interlocataire | Dans leur locataire d'origine ; accès aux autres locataires sans invitation ni demande de consentement |
| Consommateurs et clients professionnels d'une application que vous publiez | Microsoft Entra External ID dans un locataire externe | Dans un locataire séparé de celui des employés, avec inscription personnalisée, comptes sociaux et codes secrets à usage unique |

Azure AD B2C est l'ancien service d'identité des clients : il n'est plus proposé aux nouveaux clients depuis le 1er mai 2025. Une nouvelle conception utilise un locataire externe External ID.

<!-- section: workload-identities | objectives: 1.2.2, 1.2.3 -->
## Identités des applications et des charges de travail

| Où le code s'exécute | Recommandation | Information d'identification à gérer |
| --- | --- | --- |
| Sur une ressource Azure : machine virtuelle, App Service, Functions, Azure Kubernetes Service | Identité managée | Aucune |
| Sur un serveur connecté avec Azure Arc | L'identité managée du serveur avec Azure Arc | Aucune |
| Hors d'Azure avec son propre fournisseur d'identité : GitHub Actions, Kubernetes ailleurs, un autre cloud | Fédération des identités de charge de travail, configurée sur une inscription d'application ou sur une identité managée affectée par l'utilisateur | Aucune : Microsoft Entra ID fait confiance au jeton externe |
| Partout ailleurs | Inscription d'application et son principal de service | Un certificat ou un secret client, conservé dans Azure Key Vault et renouvelé |

| | Identité managée affectée par le système | Identité managée affectée par l'utilisateur |
| --- | --- | --- |
| Cycle de vie | Créée avec la ressource et supprimée avec elle | Une ressource autonome, supprimée explicitement |
| Partage | Une seule ressource | Plusieurs ressources |
| Recommandation | Une ressource qui a besoin de sa propre identité, auditée séparément | Plusieurs ressources ayant les mêmes autorisations, des ressources souvent recréées, ou des autorisations qui doivent exister avant la ressource |

Une identité managée prouve seulement qui est la charge de travail. Il lui faut encore une attribution de rôle sur la cible (par exemple Storage Blob Data Reader sur un conteneur, ou Key Vault Secrets User sur un coffre).

<!-- section: authorize-azure | objectives: 1.2.3 -->
## Autoriser l'accès aux ressources Azure

Deux systèmes de rôles coexistent :

| | Rôles Azure (Azure RBAC) | Rôles Microsoft Entra |
| --- | --- | --- |
| Contrôlent | Les ressources Azure | Les objets de l'annuaire : utilisateurs, groupes, applications, licences |
| Étendues | Groupe d'administration, abonnement, groupe de ressources, ressource | Locataire, unité administrative, objet unique |
| Exemples | Owner, Contributor, Reader, Storage Blob Data Reader | Global Administrator, User Administrator, Application Administrator |

Un Global Administrator n'a par défaut aucun accès aux ressources Azure, mais il peut élever son accès pour obtenir User Access Administrator sur tous les abonnements du locataire.

Règles de conception :

- Attribuez les rôles à des **groupes**, à l'**étendue la plus étroite** qui couvre le besoin ; utilisez un groupe d'administration pour « tous les abonnements actuels et futurs ». Préférez un rôle intégré ; ne créez un rôle personnalisé que si aucun ne convient.
- Les rôles du plan de contrôle (Owner, Contributor) ne donnent pas accès aux données : lire des objets blob ou des secrets avec l'authentification Microsoft Entra demande un rôle de données.
- Le **contrôle d'accès basé sur les attributs (ABAC)** ajoute une condition à une attribution de rôle pour les données de blobs et de files d'attente : nom du conteneur, chemin du blob, étiquettes d'index de blob, attributs de sécurité personnalisés du principal, liaison privée, date et heure.

| Exigence | Contrôle |
| --- | --- |
| Qui peut faire quoi sur quelles ressources | Azure RBAC |
| Ce qui peut être déployé : régions, références SKU, configuration, quel que soit l'utilisateur | Azure Policy |
| Personne, pas même un Owner, ne supprime ou ne modifie par accident une ressource critique | Verrou de ressource |
| Lire uniquement les objets blob qui portent une étiquette donnée | Attribution de rôle avec une condition ABAC |
| Des rôles privilégiés détenus seulement quand c'est nécessaire, avec approbation | Attributions éligibles dans Privileged Identity Management |
| Un prestataire, ou une équipe centrale d'un autre locataire, gère des abonnements sans comptes invités | Azure Lighthouse (abonnements ou groupes de ressources délégués, sans coût supplémentaire) |

<!-- section: authorize-on-premises | objectives: 1.2.4 -->
## Autoriser l'accès aux ressources locales

| Exigence | Recommandation | Pourquoi |
| --- | --- | --- |
| Des utilisateurs distants ouvrent une application web locale avec la connexion Microsoft Entra et l'accès conditionnel, sans VPN | Proxy d'application Microsoft Entra | Un connecteur de réseau privé en local n'établit que des connexions sortantes (ports 80 et 443) ; préauthentification dans le cloud ; la délégation Kerberos contrainte donne l'authentification unique aux applications qui utilisent l'authentification Windows intégrée |
| Remplacer le VPN pour toute ressource privée définie par un nom de domaine complet ou une adresse IP : partages de fichiers, RDP, SSH | Microsoft Entra Private Access | Client Global Secure Access sur les appareils, les mêmes connecteurs en local, accès conditionnel par application |
| Des utilisateurs qui se connectent avec Windows Hello Entreprise ou une clé de sécurité sur des appareils joints à Microsoft Entra doivent atteindre des partages de fichiers et des applications Kerberos locaux | Microsoft Entra Kerberos (approbation Kerberos cloud) | Microsoft Entra ID émet un ticket Kerberos partiel qu'un contrôleur de domaine local complète ; l'autorisation reste dans AD DS. Fonctionne sur les appareils joints à Microsoft Entra et sur les appareils à jonction hybride Microsoft Entra ; pour les clés de sécurité, les contrôleurs de domaine exécutent Windows Server 2016 ou une version ultérieure, avec au moins un contrôleur de domaine accessible en écriture par site |
| Gérer des serveurs locaux avec les rôles, les stratégies et le monitoring Azure | Serveurs avec Azure Arc | Chaque serveur devient une ressource Azure ; les serveurs Linux acceptent la connexion SSH avec Microsoft Entra ID grâce aux rôles Virtual Machine Administrator Login et Virtual Machine User Login, sans adresse IP publique |
| Gouverner depuis le cloud l'accès à des applications locales qui autorisent avec des groupes AD | Groupes de sécurité cloud provisionnés dans AD DS par Cloud Sync (écriture différée de groupes), attribués par des packages d'accès | L'appartenance au groupe AD suit l'attribution cloud et son expiration |

> **Piège d'examen.** Le proxy d'application publie des applications web ; il ne donne pas d'accès réseau et ne demande ni port entrant sur le pare-feu ni réseau de périmètre. Pour un partage de fichiers ou une session SSH, la réponse est Private Access ou un VPN, pas le proxy d'application.

<!-- section: key-vault | objectives: 1.2.5 -->
## Secrets, clés et certificats

Azure Key Vault stocke trois sortes d'objets : des **secrets** (mots de passe, chaînes de connexion, clés d'API), des **clés** (clés de chiffrement, par exemple pour le chiffrement avec des clés gérées par le client) et des **certificats** (certificats TLS avec leur cycle de vie).

| Option | Protection des clés | Isolation | Stocke | À recommander quand |
| --- | --- | --- | --- | --- |
| Key Vault Standard | Logicielle, FIPS 140-2 niveau 1 | Multilocataire | Clés, secrets, certificats | Coût le plus bas et aucune exigence de HSM |
| Key Vault Premium | HSM, FIPS 140-3 niveau 3 (FIPS 140-2 niveau 2 pour les clés créées sur l'ancienne HSM Platform 1) | Multilocataire | Clés, secrets, certificats | Des clés protégées par HSM sont exigées ; minimum recommandé pour les clés gérées par le client |
| HSM managé Azure Key Vault (Managed HSM) | HSM, FIPS 140-3 niveau 3 | Locataire unique, contrôlé par le client | Clés uniquement | La souveraineté des clés ou un HSM dédié est exigé |
| Azure Cloud HSM | HSM, FIPS 140-3 niveau 3 | Locataire unique | Clés, certificats | Applications migrées qui appellent un HSM via PKCS#11 ; pas d'intégration aux services de plateforme Azure |
| Azure Payment HSM | HSM | Locataire unique | Clés | Traitement des codes PIN de paiement |

- **Un coffre par application, par environnement et par région** : une compromission reste contenue, et l'accès s'accorde coffre par coffre.
- **Azure RBAC** est le modèle d'autorisation recommandé et le modèle par défaut des nouveaux coffres à partir de la version d'API 2026-02-01. Avec les **stratégies d'accès** héritées, quiconque peut écrire sur la ressource coffre (Contributor, par exemple) peut s'accorder l'accès à son contenu, et Privileged Identity Management n'est pas pris en charge.
- Les applications s'authentifient avec une **identité managée**. App Service et Azure Functions acceptent des **références Key Vault** dans leurs paramètres : aucun changement de code, et une référence sans version récupère une nouvelle version du secret dans les 24 heures, et toute modification de configuration redémarre l'application et récupère immédiatement tous les secrets référencés.
- La **suppression réversible** est toujours active et ne peut pas être désactivée : les coffres et les objets supprimés sont récupérables pendant 7 à 90 jours (90 par défaut). La **protection contre la suppression définitive** est facultative : elle interdit la suppression définitive jusqu'à la fin de la période de rétention, et les services qui chiffrent avec des clés gérées par le client, comme Stockage Azure, l'exigent.
- **Rotation** : une stratégie de rotation crée automatiquement de nouvelles versions de clés ; les certificats se renouvellent automatiquement avec les autorités de certification intégrées (DigiCert, GlobalSign) ; un secret est renouvelé par une fonction déclenchée par l'événement d'expiration proche que Key Vault envoie à Event Grid. Deux jeux d'informations d'identification utilisés en alternance évitent toute interruption.
- **Réseau et audit** : point de terminaison privé, accès public désactivé, journaux de ressources envoyés par un paramètre de diagnostic.

> **Piège d'examen.** Le HSM managé ne stocke que des clés. Une conception qui a aussi besoin de secrets ou de certificats ajoute un coffre Key Vault, de niveau Premium si ses clés doivent être protégées par HSM.

<!-- section: key-points -->
## Points clés

- PHS par défaut et toujours en secours ; PTA pour appliquer immédiatement les états de compte locaux ; fédération seulement pour ce que Microsoft Entra ID ne sait pas faire.
- L'accès conditionnel demande P1, les stratégies basées sur les risques demandent P2, les paramètres de sécurité par défaut ne demandent aucune licence.
- Cloud Sync par défaut ; Domain Services pour les protocoles anciens sans contrôleurs de domaine ; locataire externe External ID pour les clients, collaboration B2B pour les partenaires.
- Identité managée sur Azure et Arc, fédération des identités de charge de travail hors d'Azure, principal de service avec certificat ou secret en dernier recours.
- Les rôles Azure agissent sur les ressources, les rôles Microsoft Entra sur l'annuaire ; l'accès aux données demande des rôles de données ; ABAC affine l'accès aux blobs et aux files d'attente.
- Proxy d'application pour les applications web locales, Private Access pour toute ressource privée, Microsoft Entra Kerberos pour les ressources AD DS.
- Key Vault Premium pour les clés protégées par HSM, HSM managé pour des clés en locataire unique ; Azure RBAC, identités managées, protection contre la suppression définitive, un coffre par application et par environnement.
