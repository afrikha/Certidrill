La sécurité réseau de l'examen SC-100 a deux moitiés. Dans Azure, vous évaluez si une conception réseau segmente, inspecte et masque les charges de travail comme l'exigent les besoins et la Confiance Zéro. Pour les utilisateurs, vous évaluez le Security Service Edge (SSE) de Microsoft, **Global Secure Access** : Accès Internet Microsoft Entra pour le trafic Internet et SaaS, son profil de trafic Microsoft pour Microsoft 365 et le contrôle interlocataire, et Accès privé Microsoft Entra pour les applications privées.

<!-- section: network-design | objectives: 3.4.1 -->
## Évaluer les conceptions réseau par rapport aux exigences de sécurité

La Confiance Zéro appliquée aux réseaux : **aucune confiance implicite liée à l'emplacement**, segmentation en petites zones, chiffrement du trafic, inspection de ce qui traverse les zones et protection contre les menaces en périphérie. Les contrôles de sécurité réseau du MCSB disent la même chose : établir des limites de segmentation, sécuriser les services cloud par des contrôles réseau (points de terminaison privés, accès public désactivé), déployer un pare-feu en périphérie, se protéger contre les attaques DDoS, protéger les applications web, sécuriser le DNS.

| Contrôle | Couche | À recommander quand |
| --- | --- | --- |
| NSG avec groupes de sécurité d'application | 3-4, sous-réseau ou carte réseau | Segmenter les niveaux et les sous-réseaux |
| Règles d'administration de la sécurité (Azure Virtual Network Manager) | 3-4, évaluées avant les NSG | Garde-fous centraux sur de nombreux réseaux virtuels que les équipes des charges de travail ne peuvent pas contourner |
| Pare-feu Azure (Standard, Premium) | 3-7, central et avec état | Inspection dans le hub du trafic sortant et entre spokes, filtrage FQDN, renseignement sur les menaces ; Premium pour l'inspection TLS, l'IDPS et le filtrage sur l'URL complète |
| WAF sur Application Gateway ou Front Door | 7 | Protéger les applications web contre les attaques OWASP et les bots |
| Azure DDoS Protection | 3-4 sur les adresses IP publiques | Atténuation ajustée, télémétrie et réponse rapide pour les applications exposées à Internet |
| Point de terminaison privé | Adresse IP privée pour une ressource PaaS | Supprimer l'exposition publique, atteindre le PaaS depuis le réseau local, empêcher l'exfiltration vers les ressources d'autres locataires |
| Azure Bastion | RDP et SSH managés sur TLS | Administrer les machines virtuelles sans adresse IP publique ni port de gestion ouvert |

Topologies typiques : **hub and spoke** avec le Pare-feu Azure dans le hub et des itinéraires définis par l'utilisateur (`0.0.0.0/0` vers le pare-feu) sur les sous-réseaux des spokes, ou **Virtual WAN** avec un hub virtuel sécurisé (Pare-feu Azure ou un SSE partenaire dans le hub, intention de routage). Les sous-réseaux des réseaux virtuels créés après le 31 mars 2026 sont **privés par défaut** : l'accès Internet sortant doit être explicite (passerelle NAT, pare-feu), ce qui aide à respecter une exigence « aucune sortie non gérée ».

Comment évaluer une conception proposée :

| Faiblesse de la proposition | Correction |
| --- | --- |
| Machines virtuelles avec des adresses IP publiques pour l'administration | Azure Bastion ou accès juste-à-temps, sans adresse IP publique |
| Spokes appairés directement entre eux | Faire passer le trafic entre spokes par le pare-feu du hub |
| PaaS joignable sur son point de terminaison public « avec une règle de pare-feu » | Point de terminaison privé plus accès au réseau public désactivé |
| Point de terminaison de service utilisé pour empêcher l'exfiltration de données | Point de terminaison privé (les points de terminaison de service ne restreignent pas l'instance atteinte) |
| Règle NSG pour n'autoriser la sortie que vers `*.contoso.com` | Règle d'application du Pare-feu Azure (les NSG ne filtrent pas les FQDN) |
| Pare-feu Azure censé bloquer l'injection SQL | WAF |
| Réseau plat partagé par l'OT, l'IoT, les serveurs et les utilisateurs | Segments séparés avec des passages filtrés et surveillés |

> **Piège d'examen.** Un point de terminaison privé ne ferme pas le point de terminaison public à lui seul : la conception doit aussi désactiver l'accès au réseau public sur la ressource. Et DDoS Protection couvre les couches 3-4 : une inondation de couche 7 exige un WAF.

<!-- section: internet-access-swg | objectives: 3.4.2 -->
## Accès Internet Microsoft Entra comme passerelle web sécurisée

**Accès Internet Microsoft Entra** (Microsoft Entra Internet Access) est une **passerelle web sécurisée (SWG)** centrée sur l'identité pour le trafic Internet et SaaS, fournie depuis la périphérie mondiale de Microsoft. Le **client Global Secure Access** (Windows, macOS, iOS, Android) ou un **réseau distant** (succursale connectée au service) transfère le trafic par le **profil de transfert du trafic d'accès Internet**.

Fonctionnalités à évaluer :

| Fonctionnalité | Rôle |
| --- | --- |
| Filtrage du contenu web | Autoriser ou bloquer par **catégorie web**, **FQDN** ou URL ; HTTP est comparé sur l'URL, HTTPS sur le SNI sauf si l'inspection TLS est activée |
| Inspection TLS | Déchiffre le HTTPS pour une catégorisation plus fidèle et des règles sur les méthodes HTTP |
| Filtrage par renseignement sur les menaces | Bloque les destinations malveillantes connues |
| Accès conditionnel universel | Accès conditionnel pour toutes les destinations Internet, même les applications non fédérées avec Microsoft Entra ID |
| Protection contre l'injection de prompt, DLP, découverte du shadow AI | Contrôles sur l'IA générative et les données qui sortent par le web |
| Contrôles réseau pour les agents | Même filtrage pour le trafic des agents IA (exige une licence Microsoft Agent 365) |
| Journaux de trafic et tableaux de bord | Visibilité sur qui a atteint quoi |

Comment la stratégie se construit :

1. Les **stratégies de filtrage** contiennent des règles (catégorie, FQDN, URL) avec une action.
2. Les **profils de sécurité** regroupent les stratégies de filtrage avec des priorités de 100 (la plus haute) à 65 000 (la plus basse) ; l'évaluation s'arrête à la première règle qui correspond.
3. Une **stratégie d'accès conditionnel** qui cible « All internet resources with Global Secure Access » lie un profil de sécurité par le contrôle de session **Use Global Secure Access security profile**. C'est ce qui rend la passerelle sensible à l'utilisateur et au contexte (utilisateur, groupe, conformité de l'appareil, risque, emplacement).
4. Le **profil de base** s'applique à tout le trafic d'accès Internet, y compris les réseaux distants, sans accès conditionnel, à la priorité la plus basse, comme règle fourre-tout.

Licences : la licence **Microsoft Entra Internet Access** (autonome ou dans **Microsoft Entra Suite**), en plus de Microsoft Entra ID P1. La connectivité des réseaux distants exige au moins 50 licences Entra ID P1 et Internet Access cumulées.

Par rapport aux autres filtres : le filtrage du contenu web de Defender for Endpoint s'applique par groupe d'appareils ; le Pare-feu Azure filtre le trafic des charges de travail Azure. Accès Internet ajoute une stratégie sensible à l'identité, une application en périphérie du cloud pour les utilisateurs où qu'ils soient et la prise en charge de toutes les plateformes d'appareils.

> **Piège d'examen.** « Bloquer les sites de jeux d'argent pour tous les utilisateurs sauf le groupe marketing, où qu'ils travaillent » correspond à Accès Internet : des stratégies par catégorie web dans deux profils de sécurité, liés par l'accès conditionnel à des groupes différents. Les catégories web du Pare-feu Azure ne filtrent que le trafic qui passe par le réseau virtuel Azure.

<!-- section: internet-access-microsoft | objectives: 3.4.3 -->
## Accès Internet pour les services Microsoft et contrôles interlocataires

**Accès Internet Microsoft Entra pour les services Microsoft** utilise le **profil de transfert du trafic Microsoft** prérempli (Microsoft 365, Microsoft Entra ID, Microsoft Graph). Il est **inclus dans Microsoft Entra ID P1 ou P2** : aucune licence Internet Access n'est nécessaire.

| Fonctionnalité | Exigence satisfaite |
| --- | --- |
| Connectivité directe aux services Microsoft | Chemin optimisé et journalisé vers Microsoft 365 depuis n'importe où |
| **Vérification du réseau conforme** | L'accès conditionnel exige que l'accès passe par Global Secure Access, ce qui aide contre la relecture de jetons volés depuis d'autres réseaux, sans maintenir de listes d'adresses IP |
| **Restrictions de locataire universelles** | Les utilisateurs ne peuvent se connecter qu'aux locataires et applications autorisés par votre stratégie de restrictions de locataire : bloque l'exfiltration de données vers des locataires étrangers et des comptes personnels |
| **Restauration de l'adresse IP source** | L'adresse IP publique d'origine de l'utilisateur apparaît dans les journaux de connexion et les détections de risque d'Entra ID, au lieu de l'adresse IP de la périphérie |
| Journaux enrichis Microsoft 365 | Journaux de trafic détaillés pour Microsoft 365 |

Les contrôles interlocataires se trouvent tous dans les **paramètres d'accès interlocataire** de Microsoft Entra, mais répondent à des questions différentes :

| Paramètre | Contrôle |
| --- | --- |
| Paramètres entrants | Les comptes externes qui accèdent à **vos** applications (collaboration B2B et connexion directe) |
| Paramètres sortants | **Vos** comptes qui accèdent à des applications externes |
| **Restrictions de locataire v2** | Les comptes **externes** utilisés sur vos réseaux et appareils pour atteindre des applications **externes** |

Les restrictions de locataire v2 (TRv2) exigent Entra ID P1 et une application côté client :

| Application | Couverture |
| --- | --- |
| Restrictions de locataire universelles (client Global Secure Access ou réseau distant) | Plan d'authentification sur toutes les plateformes et tous les navigateurs, sans proxy d'entreprise ; plan de données pour Microsoft Graph |
| Proxy d'entreprise qui injecte l'en-tête `sec-Restrict-Tenant-Access-Policy` | Plan d'authentification uniquement, exige le déchiffrement TLS du trafic de connexion |
| Stratégie de groupe Windows (préversion) | Plans d'authentification et de données (SharePoint, OneDrive, Exchange, Teams) sur les appareils Windows |

TRv2 ne s'applique pas quand les utilisateurs accèdent à leur propre locataire, ni aux comptes invités de celui-ci. Les comptes Microsoft personnels peuvent être bloqués avec des exceptions au niveau des applications, pas par utilisateur. La configuration exige les rôles Global Secure Access Administrator et Security Administrator, et un profil de trafic Microsoft dont les points de terminaison Entra ID sont en tunnel.

> **Piège d'examen.** « Empêcher les employés de se connecter au locataire Microsoft 365 d'une autre entreprise depuis les appareils de l'entreprise » correspond aux restrictions de locataire v2, appliquées par les restrictions de locataire universelles. Les paramètres d'accès interlocataire sortants ne le font pas : ils régissent vos comptes dans les scénarios B2B, pas les comptes étrangers.

<!-- section: private-access | objectives: 3.4.4 -->
## Accès privé Microsoft Entra

**Accès privé Microsoft Entra** (Microsoft Entra Private Access) est la partie **accès réseau Confiance Zéro (ZTNA)** de Global Secure Access. Il remplace le VPN pour les ressources privées des centres de données et des clouds (toute application TCP ou UDP, définie par FQDN, adresse IP ou plage et port) et s'appuie sur le proxy d'application Microsoft Entra. Le trafic va du client Global Secure Access à la périphérie de Microsoft, puis aux **connecteurs de réseau privé** qui n'établissent que des connexions sortantes : aucun port entrant n'est ouvert.

| Option | Usage |
| --- | --- |
| **Quick Access** | Une application qui regroupe l'ensemble large des ressources privées : remplacement le plus rapide du VPN |
| **Accès par application** (applications d'entreprise Global Secure Access) | Applications distinctes pour les ressources sensibles, chacune avec ses propres attributions d'utilisateurs et sa stratégie d'accès conditionnel (MFA, appareil conforme, risque) |
| Découverte d'applications | Trouve les applications privées que les utilisateurs atteignent via Quick Access, pour les passer en accès par application |
| DNS privé | Suffixes DNS internes résolus par les connecteurs |
| SSO Kerberos | Authentification unique aux applications intégrées à AD DS avec les identifiants Microsoft Entra |

Licences : la licence **Microsoft Entra Private Access** (autonome ou dans Microsoft Entra Suite), avec Microsoft Entra ID P1. Accès privé peut fonctionner à côté d'un SSE tiers qui gère le trafic Internet.

| Exigence | À recommander |
| --- | --- |
| Remplacer un VPN pour des partages SMB, RDP et SSH avec MFA par application | Accès par application d'Accès privé |
| Publier une application web locale uniquement pour les navigateurs | Proxy d'application (Accès privé fonctionne aussi, avec le client) |
| Les administrateurs se connectent à des machines virtuelles Azure sans adresse IP publique | Azure Bastion |
| Connectivité site à site entre le centre de données et Azure | Passerelle VPN ou ExpressRoute (connectivité réseau, pas accès des utilisateurs) |
| Filtrage Internet et SaaS pour les mêmes utilisateurs | Accès Internet, un profil de trafic distinct |

> **Piège d'examen.** Accès Internet filtre le trafic qui **sort** vers Internet et le SaaS ; Accès privé donne accès **aux** applications privées. Et une ressource définie dans une application Global Secure Access par application a priorité sur le même segment dans Quick Access : les utilisateurs attribués uniquement à Quick Access en perdent l'accès.

<!-- section: key-points -->
## Points clés

- Conception réseau : segmentation, pare-feu dans le hub, WAF pour la couche 7, DDoS pour les couches 3-4, points de terminaison privés avec accès public désactivé, Bastion au lieu d'adresses IP publiques.
- Accès Internet : SWG sensible à l'identité ; stratégies de filtrage dans des profils de sécurité, liés par l'accès conditionnel ; profil de base comme règle fourre-tout ; inspection TLS pour une fidélité complète.
- Profil de trafic Microsoft : inclus dans Entra ID P1/P2 ; vérification du réseau conforme, restrictions de locataire universelles, restauration de l'adresse IP source.
- Les restrictions de locataire v2 contrôlent les comptes externes sur vos appareils ; les paramètres entrants et sortants contrôlent l'accès B2B.
- Accès privé : ZTNA qui remplace le VPN, connecteurs sortants uniquement, Quick Access puis accès par application avec l'accès conditionnel.
