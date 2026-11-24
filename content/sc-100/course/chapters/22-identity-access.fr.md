L'identité est le plan de contrôle de la Confiance Zéro : tout accès commence par un jeton que Microsoft Entra ID émet, ou refuse. L'examen vous demande de la concevoir pour les utilisateurs, les partenaires, les clients, les charges de travail et les agents IA, dans Microsoft 365, Azure, d'autres clouds et l'Active Directory local, et de vérifier que l'accès conditionnel applique la stratégie.

<!-- section: agent-identities | objectives: 2.2.1 -->
## Identités d'agent avec Microsoft Entra Agent ID

**Microsoft Entra Agent ID** est la partie de Microsoft Entra qui crée et gère les identités des agents IA. Il est disponible pour tous les clients Microsoft Entra ; étendre les fonctionnalités de sécurité de Microsoft Entra (accès conditionnel, protection, gouvernance) aux agents exige **Microsoft Agent 365**, inclus dans Microsoft 365 E7 ou disponible en module complémentaire.

| Objet | Rôle |
| --- | --- |
| Identité d'agent (agent identity) | Le compte d'identité qui identifie et authentifie de façon unique un agent IA ; il obtient des jetons pour appeler Microsoft Graph, Azure, des services internes ou tiers |
| Blueprint d'identité d'agent (agent identity blueprint) | Le modèle à partir duquel les identités d'agent sont créées ; une stratégie qui cible un blueprint s'applique à toutes ses identités d'agent, présentes et futures |
| Utilisateur d'agent (agent user) | Un compte d'utilisateur spécial associé un à un à une identité d'agent, pour les systèmes qui n'acceptent qu'un utilisateur (une boîte aux lettres, une présence Teams) |
| Sponsor | L'humain responsable de l'agent, par exemple l'utilisateur qui l'a créé dans Copilot Studio |

Les agents n'utilisent ni mot de passe, ni MFA, ni clé d'accès. Ils accèdent aux ressources de trois façons :

| Mode d'accès | Autorisations utilisées | L'accès conditionnel évalue |
| --- | --- | --- |
| Autonome (application seule) | Droits accordés à l'identité d'agent : autorisations Graph, rôles Azure RBAC, rôles d'annuaire, rôles d'application | L'**identité d'agent** (ou son blueprint) |
| Délégué (on-behalf-of) | Droits de l'utilisateur connecté, limités à ce qu'il délègue | L'**utilisateur** |
| En tant qu'utilisateur d'agent | Droits du compte d'utilisateur de l'agent | L'**utilisateur d'agent**, sélectionné sous *Agents*, pas sous *Users* |

L'**accès conditionnel pour les agents** évalue la stratégie quand Microsoft Entra émet ou actualise un jeton. Les stratégies peuvent bloquer l'accès, bloquer les agents identifiés comme à risque élevé, exiger un appareil conforme pour les utilisateurs d'agent qui s'exécutent sur des points de terminaison gérés comme Windows 365 Cloud PCs for Agents (la condition *Agent execution environments* est en préversion), ou cibler tous les agents porteurs d'un attribut de sécurité personnalisé. Les stratégies portent sur le sujet du jeton : un agent qui utilise deux modes d'accès a besoin de deux stratégies. Limites : les stratégies ciblées par l'affectation *Users*, même sur tous les utilisateurs, ne s'appliquent pas aux utilisateurs d'agent ; les stratégies qui ciblent les identités d'agent ne couvrent pas l'utilisateur d'agent ; les utilisateurs d'agent ne peuvent pas être inclus ou exclus par groupe ; et un agent qui s'authentifie avec une **clé API** contourne entièrement Microsoft Entra.

Licences pour l'accès conditionnel des agents : Microsoft 365 E7, ou Microsoft Agent 365 avec au moins Microsoft Entra ID P1 ou Microsoft 365 E3.

> **Piège d'examen.** Une identité managée ou le principal de service d'une application est une **identité de charge de travail** ; un agent IA inscrit avec Agent ID (par exemple depuis Copilot Studio) a une **identité d'agent**. Une stratégie qui cible l'identité d'agent ne couvre pas ce que l'agent fait au nom d'un utilisateur : cela s'évalue sur l'utilisateur.

<!-- section: access-to-resources | objectives: 2.2.2 -->
## Accès aux ressources SaaS, PaaS, IaaS, hybrides et multiclouds

L'accès Confiance Zéro combine trois types de contrôles, quelle que soit la ressource :

| Contrôle | Solution Microsoft | Exemple |
| --- | --- | --- |
| Identité | Authentification unique Microsoft Entra ID, accès conditionnel, identités managées, Azure RBAC | Une identité et une stratégie pour Microsoft 365, Salesforce et le portail Azure |
| Réseau | Points de terminaison privés, NSG, Pare-feu Azure, Accès privé Microsoft Entra, Accès Internet Microsoft Entra | Atteindre une application privée sans VPN ; PaaS joignable seulement depuis le réseau virtuel |
| Application | Defender for Cloud Apps (contrôle d'application par accès conditionnel, stratégies de session), rôles d'application, étendues d'API | Bloquer les téléchargements depuis un appareil non géré dans une session SaaS |

| Ressource | Conception d'accès recommandée |
| --- | --- |
| SaaS (application de la galerie ou personnalisée) | SSO Microsoft Entra (SAML ou OpenID Connect), provisionnement automatique (SCIM), accès conditionnel, Defender for Cloud Apps |
| PaaS (Azure SQL, Stockage, Key Vault) | Authentification Microsoft Entra, identités managées plutôt que clés, points de terminaison privés, accès réseau public désactivé |
| Machines virtuelles IaaS | Connexion avec Microsoft Entra ID, Azure Bastion ou accès juste-à-temps, pas de RDP ni de SSH publics |
| Applications web locales | Accès privé Microsoft Entra ou proxy d'application, avec accès conditionnel |

> **Conseil d'examen.** « Remplacer le VPN par un accès Confiance Zéro par application aux applications locales » : Accès privé Microsoft Entra. « Contrôler ce que font les utilisateurs dans une session SaaS » : contrôle de session de Defender for Cloud Apps.

<!-- section: entra-hybrid-multicloud | objectives: 2.2.3 -->
## Microsoft Entra ID dans les environnements hybrides et multiclouds

Deux moteurs synchronisent les utilisateurs AD DS vers Microsoft Entra ID :

| Fonctionnalité | Microsoft Entra Connect Sync | Microsoft Entra Cloud Sync |
| --- | --- | --- |
| Architecture | Serveur de synchronisation local | Agents de provisionnement légers, configuration dans le cloud, plusieurs agents actifs pour la haute disponibilité |
| Forêts déconnectées (fusions, acquisitions) | Non | Oui |
| Synchronisation du hachage de mot de passe | Oui | Oui |
| Configuration de l'authentification directe et d'AD FS | Oui | Non (configurée séparément) |
| Réécriture d'appareils | Oui | Non (remplacée par Cloud Kerberos Trust) |
| Grands groupes | 250 000 membres | 50 000 membres |

Méthode d'authentification :

| Méthode | À choisir quand |
| --- | --- |
| Synchronisation du hachage de mot de passe (PHS) | Recommandation par défaut : la plus simple, résiliente si l'environnement local est en panne, active la détection des informations d'identification divulguées dans ID Protection |
| Authentification directe (PTA) | Les mots de passe doivent être validés en local, par exemple pour appliquer les stratégies de compte locales à la connexion |
| Fédération (AD FS) | Une exigence que Microsoft Entra ID ne couvre pas nativement ; augmente la surface d'attaque, et les organisations migrent pour en sortir |

Multicloud : gardez **Microsoft Entra ID comme fournisseur d'identité unique** et fédérez-y les consoles AWS et GCP (par exemple AWS IAM Identity Center), pour que la MFA, l'accès conditionnel, PIM et les révisions d'accès gouvernent aussi les consoles cloud. Utilisez un seul locataire de main-d'œuvre sauf exigence impérative.

> **Piège d'examen.** Cloud Sync est la réponse pour des forêts déconnectées après une acquisition ; Connect Sync est la réponse quand la conception exige la configuration de l'authentification directe, la réécriture d'appareils ou des groupes de plus de 50 000 membres.

<!-- section: external-identities | objectives: 2.2.4 -->
## Identités externes : B2B et identité décentralisée

| Scénario | Solution | Remarques |
| --- | --- | --- |
| Des partenaires utilisent des applications et ressources de votre locataire | **Collaboration B2B** | Un objet utilisateur invité est créé ; l'invité se connecte avec les informations d'identification de son organisation |
| Canaux partagés Teams avec une autre organisation Microsoft Entra | **Connexion directe B2B** | Confiance mutuelle requise des deux côtés ; aucun objet invité dans votre annuaire |
| Applications pour consommateurs ou clients professionnels | **Locataire externe** (Microsoft Entra External ID) | Locataire séparé, inscription en libre-service, connexion sociale ou par e-mail, personnalisation de la marque |
| Les utilisateurs de vos propres locataires doivent atteindre les ressources des autres sans invitation | **Synchronisation interlocataire** | Synchronisation unidirectionnelle dans une organisation multilocataire |
| Prouver une affirmation (emploi, diplôme) sans contacter l'émetteur | **Microsoft Entra Verified ID** | Informations d'identification vérifiables et identificateurs décentralisés |

Les **paramètres d'accès interlocataire** définissent des règles entrantes et sortantes pour la collaboration B2B et la connexion directe B2B, par défaut ou par organisation (les paramètres d'organisation prévalent sur les paramètres par défaut), et peuvent **approuver les revendications MFA et d'appareil** (conforme, joint à Microsoft Entra hybride) du locataire partenaire, pour que les partenaires n'aient pas à inscrire deux fois leur MFA. La connexion directe B2B avec une stratégie d'accès conditionnel qui exige la MFA ne fonctionne que si les paramètres d'approbation acceptent les revendications MFA du partenaire. Les **restrictions de locataire** sont indépendantes : les paramètres entrants, sortants et d'approbation ne les affectent pas. Azure AD B2C n'est plus vendu aux nouveaux clients depuis le 1er mai 2025 : les nouvelles applications destinées aux clients utilisent un locataire externe.

L'**identité décentralisée** (Verified ID) a trois rôles : l'**émetteur** signe une information d'identification vérifiable avec son identificateur décentralisé (DID) ; le **détenteur** la garde dans un portefeuille (Microsoft Authenticator) et décide quand la présenter ; le **vérificateur** contrôle la signature par rapport aux émetteurs qu'il approuve, sans contacter l'émetteur. Microsoft prend en charge la méthode de confiance `did:web`. Usages typiques : intégration avec vérification d'identité, preuve d'emploi auprès de partenaires.

<!-- section: modern-authn-authz | objectives: 2.2.5 -->
## Authentification et autorisation modernes

L'**accès conditionnel** est le moteur de stratégie de la Confiance Zéro : des signaux (utilisateur, groupe, rôle, identité d'agent ou de charge de travail, application, état de l'appareil, emplacement, application cliente, risque) mènent à une décision (bloquer, accorder avec des contrôles comme la MFA, une **force d'authentification**, un appareil conforme, des conditions d'utilisation) et à des contrôles de session (fréquence de connexion, contrôle d'application). Il exige Microsoft Entra ID P1.

L'**évaluation des risques** vient de **Microsoft Entra ID Protection** (P2) : le **risque de connexion** (cette authentification ne vient probablement pas du propriétaire) et le **risque utilisateur** (le compte est probablement compromis, par exemple des informations d'identification divulguées), chacun faible, moyen ou élevé. Stratégies typiques : un risque de connexion moyen ou élevé exige la MFA ; un risque utilisateur élevé exige un changement de mot de passe sécurisé. Les stratégies de risque des **identités de charge de travail** exigent Workload ID Premium (sans cette licence, les détections apparaissent avec des détails limités) ; les identités managées sont hors périmètre.

L'**évaluation continue de l'accès (CAE)** permet à Exchange Online, SharePoint Online, Teams et Microsoft Graph de rejeter un jeton avant son expiration :

| Déclencheur CAE | Comportement |
| --- | --- |
| Compte désactivé ou supprimé, mot de passe changé ou réinitialisé, MFA activée, jetons d'actualisation révoqués, risque utilisateur élevé | Événement critique, appliqué en quasi temps réel (jusqu'à 15 minutes), avec ou sans accès conditionnel |
| L'IP du client sort d'un emplacement nommé autorisé | Stratégie IP appliquée immédiatement par la ressource |

Les sessions compatibles CAE reçoivent des jetons valides jusqu'à 28 heures, révoqués par les événements. Limites : les invités ne sont pas couverts ; seuls les emplacements nommés basés sur l'IP sont appliqués, pas les pays.

Les **actions protégées** associent un **contexte d'authentification** de l'accès conditionnel à des autorisations Microsoft Entra sensibles : la stratégie s'applique au moment où l'action est effectuée, pas à la connexion ni à l'activation du rôle. Exemples : créer, modifier ou supprimer des stratégies d'accès conditionnel, modifier les paramètres d'accès interlocataire, supprimer définitivement des objets d'annuaire, modifier les emplacements nommés. Elles exigent P1 et sont configurées par un Conditional Access Administrator ou un Security Administrator. Excluez toujours un compte d'accès d'urgence.

| Exigence | Recommandation |
| --- | --- |
| Révoquer l'accès aux boîtes aux lettres quelques minutes après la désactivation d'un compte | CAE (activée par défaut pour les services pris en charge) |
| Les administrateurs ne doivent utiliser une méthode résistante au hameçonnage que lorsqu'ils modifient l'accès conditionnel | Action protégée avec un contexte d'authentification qui exige une force d'authentification résistante au hameçonnage |
| Exiger la MFA uniquement quand la connexion semble risquée | Stratégie de risque de connexion (ID Protection, P2) |
| Authentification renforcée pour un site SharePoint ou une action d'application sensible | Contexte d'authentification |

> **Piège d'examen.** Les paramètres d'activation de PIM protègent le moment où un rôle devient actif ; les actions protégées protègent le moment où une autorisation précise est utilisée, quel que soit le rôle qui l'accorde.

<!-- section: ca-zero-trust | objectives: 2.2.6 -->
## Valider l'accès conditionnel par rapport à la Confiance Zéro

Une conception Confiance Zéro est un ensemble de stratégies par **persona** (utilisateurs, administrateurs, invités, identités de charge de travail et d'agent, comptes d'urgence) qui ensemble ne laissent aucune lacune :

| Principe Confiance Zéro | Stratégies qui doivent exister |
| --- | --- |
| Vérifier explicitement | MFA pour tous les utilisateurs et toutes les ressources ; force d'authentification résistante au hameçonnage pour les administrateurs et les portails d'administration Microsoft ; authentification héritée bloquée ; stratégies basées sur le risque |
| Utiliser le privilège minimum | Limites de session pour les appareils non gérés (contrôle d'application, pas de téléchargement) ; exigences renforcées par contexte d'authentification sur les actions sensibles |
| Supposer une violation | Appareil conforme ou joint hybride pour les applications sensibles ; fréquence de connexion pour les sessions privilégiées ; application stricte de la CAE là où les réseaux sont stables |

Méthode de validation :

1. Ciblez **All resources** plutôt que des listes d'applications, pour couvrir les nouvelles applications.
2. Inventoriez les exclusions : seulement les comptes d'accès d'urgence et des exceptions de service documentées ; les exclusions de groupes sont révisées.
3. Déployez les nouvelles stratégies en mode **rapport seul** (report-only), lisez le classeur d'insights et de rapports, et utilisez l'outil **What If** pour les cas limites.
4. Vérifiez les invités, les identités de charge de travail et les agents : ils ont besoin de leurs propres stratégies.
5. Comparez avec les modèles d'accès conditionnel intégrés, et utilisez l'agent d'optimisation de l'accès conditionnel pour détecter les utilisateurs et applications non couverts.

> **Piège d'examen.** Une stratégie qui cible une liste d'applications, ou qui exclut « temporairement » un grand groupe, n'est pas Confiance Zéro : la lacune est l'endroit où passe l'attaque. Et l'accès conditionnel ne s'applique jamais tant que les paramètres de sécurité par défaut sont activés.

<!-- section: harden-ad-ds | objectives: 2.2.7 -->
## Exigences de sécurisation d'AD DS

AD DS reste la racine de confiance des organisations hybrides : un contrôleur de domaine compromis compromet tout ce qui en est synchronisé.

| Domaine | Exigence |
| --- | --- |
| Modèle d'administration | Hiérarchiser la forêt (modèle d'accès d'entreprise) : Domain Admins uniquement sur les contrôleurs de domaine, jamais sur les serveurs ni les postes de travail ; comptes d'administration distincts |
| Comptes privilégiés | Peu de membres dans Enterprise Admins, Domain Admins, Schema Admins ; groupe Protected Users pour les administrateurs ; « le compte est sensible et ne peut pas être délégué » |
| Mots de passe des administrateurs locaux | Windows LAPS sur chaque serveur membre et poste de travail |
| Comptes de service | Comptes de service administrés de groupe (gMSA) plutôt que des comptes d'utilisateur avec des mots de passe statiques |
| Protocoles hérités | Supprimer SMBv1, restreindre NTLM, AES pour Kerberos ; exiger la signature LDAP (intégrité et authenticité, contre les attaques de l'intercepteur et par relecture, mais sans confidentialité) et la liaison de canal LDAP (lie l'authentification à la session TLS, contre le relais d'informations d'identification ; ne s'applique qu'aux liaisons SASL sur TLS) |
| Contrôleurs de domaine | Isolés, rôles minimaux, corrigés en premier, sauvegardés hors ligne |
| Serveurs hybrides | Les serveurs Microsoft Entra Connect et AD FS et les autorités de certification AD CS sont traités comme tier 0 |
| Surveillance | Capteurs Microsoft Defender for Identity, évaluations de la posture de sécurité des identités dans le Niveau de sécurité Microsoft (Microsoft Secure Score) |

<!-- section: secrets-keys-certificates | objectives: 2.2.8 -->
## Gérer les secrets, les clés et les certificats

| Exigence | Solution | Location, niveau FIPS 140 |
| --- | --- | --- |
| Secrets, clés et certificats d'applications ; clés gérées par le client | Azure Key Vault Standard | Multilocataire, FIPS 140-2 niveau 1 |
| Clés protégées par HSM à un coût modéré | Azure Key Vault Premium | Multilocataire, FIPS 140-3 niveau 3 (HSM Platform 2) |
| Pool HSM monolocataire, contrôle total des clés, clés gérées par le client pour les services Azure | HSM managé Azure Key Vault (Managed HSM) | Monolocataire, FIPS 140-3 niveau 3 |
| Migration lift-and-shift d'une application qui utilise PKCS#11, déchargement TLS, TDE, signature de code | Azure Cloud HSM | Monolocataire, FIPS 140-3 niveau 3 |
| Traitement des codes PIN de paiement | Azure Payment HSM | Monolocataire, FIPS 140-2 niveau 3 |

Règles de conception : un coffre par application, environnement et région pour limiter le rayon d'impact ; le modèle d'autorisation **Azure RBAC** ; **suppression réversible** et **protection contre le vidage** ; points de terminaison privés, accès public désactivé ; les applications s'authentifient avec des **identités managées** ; stratégies de rotation des clés et renouvellement automatique des certificats ; journaux vers le SIEM et **Defender for Key Vault** pour les accès anormaux. Mieux encore, supprimez les secrets avec les identités managées et la fédération d'identité de charge de travail.

> **Piège d'examen.** « La clé doit être dans un HSM monolocataire sous le seul contrôle du client » exclut Key Vault Standard et Premium, qui sont multilocataires. Choisissez Managed HSM pour le chiffrement des services Azure, Cloud HSM pour une application qui a besoin d'une interface PKCS#11.

<!-- section: key-points -->
## Points clés

- Agent ID : identités d'agent, blueprints, utilisateurs d'agent, sponsors. L'accès conditionnel évalue le sujet du jeton : identité d'agent (application seule), utilisateur (délégué), utilisateur d'agent (sous *Agents*).
- Accès = contrôles d'identité + réseau + application.
- Cloud Sync pour les forêts déconnectées ; Connect Sync pour la configuration PTA, la réécriture d'appareils, les grands groupes. PHS est la méthode d'authentification par défaut.
- La collaboration B2B crée des invités ; la connexion directe B2B non ; les locataires externes servent les clients ; Verified ID prouve des affirmations avec des informations d'identification vérifiables.
- La CAE révoque les jetons sur des événements critiques ; les actions protégées appliquent la stratégie quand une autorisation est utilisée ; les stratégies de risque exigent P2.
- Accès conditionnel Confiance Zéro : personas, All resources, exclusions minimales, rapport seul d'abord.
- Sécuriser AD DS comme tier 0 ; le surveiller avec Defender for Identity.
- Key Vault pour la plupart des besoins ; Managed HSM ou Cloud HSM pour les exigences de HSM monolocataire ; identités managées plutôt que secrets.
