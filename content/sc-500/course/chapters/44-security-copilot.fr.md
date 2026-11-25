Microsoft Security Copilot est un assistant d'IA générative pour les équipes de sécurité, utilisé dans un portail autonome (`https://securitycopilot.microsoft.com`) et intégré à Defender, Microsoft Entra, Intune et Microsoft Purview. À l'examen, on le configure plutôt qu'on ne lui écrit des invites : espaces de travail et leur capacité, rôles de propriétaire et de contributeur, plug-ins, et agents de Microsoft et du Security Store. Security Copilot est documenté uniquement pour les clouds commerciaux ; il n'est pas conçu pour les clouds du gouvernement américain.

<!-- section: workspaces | objectives: 4.3.1 -->
## Configurer des espaces de travail pour Security Copilot

Un **espace de travail** regroupe, pour une équipe ou un cas d'usage, la capacité qui alimente Security Copilot, les paramètres de résidence des données et les personnes qui y ont accès. Découpage type : un espace de production pour le SOC, un espace conformité dont les données doivent rester dans l'UE, un bac à sable pour les tests.

```text
Microsoft Entra tenant
├── Workspace: Contoso-SOC        capacity: Capacity-SOC (10 provisioned + 5 overage SCUs)
├── Workspace: Contoso-Compliance capacity: Capacity-EU  (data storage: Europe)
└── Workspace: Contoso-Sandbox    capacity: Capacity-Dev (data sharing: opt in)
```

La **capacité** est une ressource Azure mesurée en **unités de calcul de sécurité (SCU)**. Toute utilisation consomme des SCU : le portail autonome, les expériences intégrées, les agents Microsoft et les agents des partenaires.

| Type de capacité | Règle |
| --- | --- |
| SCU provisionnées | Achetées à l'avance, au minimum 1 ; renouvelées à chaque heure de facturation complète ; les SCU non utilisées expirent à la fin de l'heure ; facturées à l'heure, toute utilisation dans une heure compte comme une SCU entière |
| SCU de dépassement (overage) | Consommées seulement quand les SCU provisionnées sont épuisées ; un plafond ou illimitées ; facturées à l'usage exact, à une décimale près |
| Plus de capacité | Les requêtes s'arrêtent, sauf si un dépassement est disponible |
| Modifier les SCU provisionnées | Portail Azure ou portail Security Copilot ; il vaut mieux faire les changements en début d'heure |
| Microsoft 365 E5 et E7 | Security Copilot est inclus : Microsoft provisionne automatiquement une **capacité par défaut** et un **espace de travail par défaut** pour les locataires éligibles et activés |

Pour créer un espace de travail : dans le portail Security Copilot, sélectionnez le nom de l'espace de travail dans le fil d'Ariane (ou **Owner settings** > **Manage workspaces**) > **New workspace**, saisissez un nom, sélectionnez une capacité ou **Create new capacity** (abonnement, groupe de ressources, nom de capacité, SCU provisionnées et de dépassement), puis définissez l'emplacement de stockage des données, l'emplacement d'évaluation des invites et la préférence de partage des données, et **Create**.

| Paramètre | Comportement |
| --- | --- |
| Nom | Unique dans le locataire ; lettres, chiffres, traits d'union et traits de soulignement ; non modifiable ensuite |
| Emplacement de stockage des données | Où les données de session sont stockées au repos (Australie, Europe, Suisse, Royaume-Uni, États-Unis). **Immuable** : changer de géographie impose un nouvel espace de travail |
| Emplacement d'évaluation des invites | La géographie de stockage des données, ou « Evaluate anywhere with available capacity » (centre de données le moins chargé dans le monde, moins de contrôle géographique) |
| Partage des données | Si Microsoft peut capturer invites et réponses (avec révision humaine) pour valider le produit ou construire son modèle d'IA de sécurité ; désactivé par défaut dans les espaces provisionnés automatiquement |
| Capacité | Une capacité sert un seul espace de travail à la fois ; l'association peut changer, mais un espace de travail a toujours besoin d'une capacité |
| Accès aux données des services Microsoft 365 | Activé par défaut dans les espaces provisionnés automatiquement ; le désactiver limite Copilot avec les produits Microsoft 365 |
| Espace de travail par défaut | Celui qu'utilisent les expériences intégrées de Defender, Microsoft Entra, Purview et Intune quand aucun espace de travail n'est affecté au produit ; si des espaces existent déjà, le plus ancien |
| Workspaces for Microsoft Security Copilot agents | Paramètre de propriétaire qui affecte un espace de travail par produit (Defender XDR, Purview, Intune, Microsoft Entra), pour tout le locataire. Avant de réaffecter, désactivez les déclencheurs des agents : les commentaires et la mémoire restent dans l'ancien espace |

Pour provisionner de la capacité, il faut **Contributor ou Owner** sur l'abonnement Azure ou le groupe de ressources, et **Security Administrator** ou plus dans le locataire.

> **Piège d'examen.** « Toutes les invites et les données stockées doivent rester dans l'UE » exige à la fois un stockage des données en Europe **et** une évaluation des invites dans la même géographie. « Evaluate anywhere » enfreint l'exigence, et un espace de travail existant aux États-Unis ne peut pas être déplacé : créez un nouvel espace de travail.

<!-- section: roles | objectives: 4.3.2 -->
## Gérer les autorisations et les rôles dans Security Copilot

Security Copilot a deux rôles qui lui sont propres, **Copilot owner** et **Copilot contributor**. Ce ne sont pas des rôles Microsoft Entra : ils contrôlent seulement l'accès à la plateforme Security Copilot et ne donnent **aucun accès aux données de sécurité**. Les rôles s'attribuent par espace de travail : un propriétaire de l'espace SOC n'a rien dans le bac à sable s'il n'y est pas attribué.

| Fonctionnalité | Copilot owner | Copilot contributor |
| --- | --- | --- |
| Créer des sessions, exécuter des promptbooks | Oui | Oui |
| Charger des fichiers | Oui | Oui par défaut |
| Gérer l'utilisation des fichiers chargés | Oui | Non |
| Gérer ses plug-ins personnalisés | Oui | Non par défaut |
| Options de partage des données et de commentaires | Oui | Non |
| Gestion de la capacité, tableau de bord d'utilisation | Oui | Non |

Qui est propriétaire ou contributeur sans attribution explicite :

| Rôle par défaut | Membres |
| --- | --- |
| Copilot owner | Les rôles Microsoft Entra Global Administrator, Security Administrator, Intune Administrator, Billing Administrator et Compliance Administrator, et des rôles Purview (Purview Compliance Administrator, Purview Organization Management, Purview Data Governance Administrator) |
| Copilot contributor | Les rôles Defender XDR personnalisés et les rôles Intune qui incluent l'autorisation Security Copilot, et des rôles Purview ; les nouvelles instances utilisent le groupe **Recommended Microsoft Security roles** |
| Groupe Everyone | Contributeur sur les instances anciennes ; peut être retiré, et une fois retiré ne peut plus être ajouté |

Pour attribuer un rôle : menu d'accueil > **Role assignment** > **Add members** (ou **Owner settings** > **Role assignments** > **Add role assignment**), sélectionnez les utilisateurs ou groupes, choisissez **Copilot owner** ou **Copilot contributor**, puis **Add**. Security Copilot conserve toujours deux propriétaires, qui ne peuvent pas être retirés. L'appartenance aux rôles Microsoft Entra elle-même se gère uniquement dans le centre d'administration Microsoft Entra.

**Accès aux données.** Copilot utilise l'authentification **pour le compte de** (on-behalf-of) : chaque plug-in exige toujours le rôle de l'utilisateur lui-même sur son service. Un contributeur sans Microsoft Sentinel Reader n'obtient rien du plug-in Sentinel ; un contributeur sans rôle Intune comme Endpoint Security Manager n'obtient rien d'Intune.

> **Piège d'examen.** N'attribuez pas Security Administrator uniquement pour que quelqu'un puisse utiliser Copilot. Créez un groupe de sécurité, ajoutez-le à Copilot contributor (ou owner), et donnez aux membres les rôles de données nécessaires dans chaque produit. Remplacez le groupe Everyone par le groupe Recommended Microsoft Security roles.

Deux paramètres de propriétaire ont une étendue différente : la **journalisation d'audit** de l'activité Security Copilot vers Microsoft Purview s'applique à tout le locataire et seul un Security Administrator peut la modifier ; l'autorisation de chargement de fichiers (propriétaires seulement ou tous les contributeurs) s'applique par espace de travail.

<!-- section: plugins | objectives: 4.3.3 -->
## Activer et configurer des plug-ins

Les plug-ins donnent à Copilot l'accès aux données et fonctionnalités d'un service : plug-ins **Microsoft** préinstallés (Microsoft Sentinel, Microsoft Defender XDR, Natural Language to KQL...), plug-ins **non-Microsoft** préinstallés et plug-ins **personnalisés**.

| Tâche | Où |
| --- | --- |
| Activer ou désactiver un plug-in pour ses sessions | Icône **Sources** de la barre d'invite > **Manage plugins**, bouton bascule |
| Restreindre les plug-ins préinstallés | **Owner settings** > **Plugin settings** : All users ou Owners only. Immédiat, s'applique aux expériences autonome et intégrées ; les nouveaux plug-ins préinstallés vont alors aux seuls propriétaires |
| Qui peut ajouter ses propres plug-ins personnalisés | Owners only (par défaut) ou Contributors and Owners |
| Qui peut ajouter des plug-ins personnalisés pour tous dans l'espace de travail | Owners only ou Owners and Contributors |
| Ajouter un plug-in personnalisé | **Manage plugins** > **Custom** > ajouter un **Security Copilot plugin** (charger ou lier un manifeste YAML ou JSON) ou un **OpenAI plugin** |
| Plug-in qui demande des valeurs de configuration | **Set up** (icône d'engrenage) ; chaque utilisateur le configure pour lui-même |
| Modifier ou supprimer un plug-in personnalisé | Icône d'engrenage > **Edit file** ou **Delete** |

Règles à retenir :

- Les choix de plug-ins se font **par espace de travail** : activer un plug-in dans l'espace SOC ne l'active pas ailleurs.
- Un plug-in ajouté par un propriétaire peut être disponible pour ce seul propriétaire (il reçoit une étiquette **private**) ou pour tous dans l'organisation ; seuls les propriétaires peuvent modifier un plug-in de l'organisation, et les contributeurs ne peuvent pas modifier les plug-ins personnalisés créés par les propriétaires.
- Quand un agent est configuré, ses plug-ins requis sont activés **pour cet agent uniquement**, sans changer les paramètres de plug-ins de l'organisation.
- Validez un plug-in personnalisé au niveau utilisateur avant de le publier pour l'organisation.

> **Piège d'examen.** Activer le plug-in Microsoft Sentinel ne donne pas accès aux données Sentinel. L'utilisateur a aussi besoin d'un rôle Sentinel sur l'espace de travail, car le plug-in agit pour le compte de l'utilisateur connecté.

<!-- section: agents | objectives: 4.3.4 -->
## Activer et configurer des agents Microsoft et des agents du Security Store

Les **agents** exécutent des tâches de sécurité de façon autonome, selon une planification, sur un événement ou à la demande, et consomment des SCU de la capacité de l'espace de travail. Dans le portail Security Copilot, sélectionnez **Agents** pour ouvrir la bibliothèque d'agents (agents Microsoft et partenaires disponibles dans l'espace de travail) ; **Browse more agents** ou **Security Store** liste les autres. Dans le portail Defender : **Security Copilot** > **Agents**.

Configurer un agent : sélectionnez-le > **Set up** > choisissez une identité > saisissez les paramètres > terminez ; ensuite **Run** ou gérez-le depuis sa page.

| Élément | Détail |
| --- | --- |
| Qui configure | Les Copilot owners et contributors, plus les rôles produits que l'agent indique |
| Identité | **Create an agent identity** (identité non humaine dédiée, Microsoft Entra Agent ID ; recommandée ; pour l'instant agents conçus par Microsoft uniquement) ou **Assign an existing user account** (l'agent hérite des accès de cet utilisateur) |
| Déclencheur | Automatique (planification ou événement) ou manuel (**One time**) ; **pause** pour l'arrêter temporairement |
| Commentaires | Owners et contributors donnent des commentaires stockés dans la **mémoire** de l'agent ; **Manage memory** > **Reject feedback** retire un élément |
| Modifications | **Edit** pour changer l'identité ou les paramètres |

Agents Microsoft dans le portail Defender :

| Agent | Faits clés |
| --- | --- |
| Security Alert Triage Agent (préversion) | Étend le Phishing Triage Agent et n'est disponible que pour les clients de la préversion (les autres conservent le Phishing Triage Agent dans le Security Store) ; trie les alertes e-mail et collaboration (exige Defender for Office 365 Plan 2), plus les alertes cloud et identité ; s'exécute à chaque nouvelle alerte ; Security Administrator pour le configurer |
| Threat Intelligence Briefing Agent | Synthèses régulières et personnalisées de renseignement sur les menaces ; planifié ou manuel ; Security Administrator pour le configurer |
| Security Analyst Agent | Analyse à la demande des données Defender XDR ou Sentinel ; lié à l'identité de chaque utilisateur |
| Threat Hunting Assistant | Repérage en langage naturel qui écrit le KQL et interprète les résultats |
| Dynamic Threat Detection Agent | Service d'arrière-plan toujours actif qui cherche les faux négatifs dans Defender et Sentinel |

D'autres agents apparaissent dans leur produit, par exemple des agents d'identité comme l'optimisation de l'accès conditionnel dans le centre d'administration Microsoft Entra.

**Agents du Security Store.** Microsoft Security Store est un catalogue d'agents et de solutions de Microsoft et de partenaires. Parcours : **Explore agents** > choisir un agent > **Get solution** > sélectionner l'abonnement Azure de facturation, le groupe de ressources et un nom > sélectionner les ressources de déploiement (un espace de travail Sentinel si l'agent utilise des travaux du data lake Sentinel) > **Place order** > **Open Microsoft Security Copilot** pour le configurer. Les agents déployés figurent dans **Management** > **My solutions**.

| Étape | Rôle |
| --- | --- |
| Acheter et déployer | Contributor ou Owner sur l'abonnement Azure de facturation |
| Configurer dans Security Copilot | Copilot owner ou contributor |
| Approuver un agent partenaire qui accède à des produits Microsoft (Defender, Sentinel, Microsoft Entra, Intune, Defender Threat Intelligence) | **Global Administrator** |

> **Piège d'examen.** Un contributeur voit un agent partenaire avec **Set up** désactivé et une bannière de consentement : il ne peut pas régler cela lui-même. Il sélectionne **Copy link** et l'envoie à un Global Administrator, qui sélectionne **Start approval** ; le contributeur termine ensuite la configuration avec un compte d'utilisateur existant.

<!-- section: key-points -->
## Points clés

- Un espace de travail relie capacité, résidence des données et accès ; l'emplacement de stockage des données et le nom ne peuvent plus être modifiés.
- SCU : provisionnées (minimum 1, à l'heure, perdues si non utilisées) plus un dépassement facultatif ; les locataires E5 et E7 reçoivent un espace de travail et une capacité par défaut.
- Copilot owner et contributor sont des rôles Security Copilot, pas des rôles Microsoft Entra, et ne donnent aucun accès aux données : les plug-ins agissent pour le compte de l'utilisateur.
- Les propriétaires contrôlent la disponibilité des plug-ins préinstallés et qui peut ajouter des plug-ins personnalisés ; les choix de plug-ins se font par espace de travail.
- Agents : identité d'agent recommandée, déclencheurs automatiques ou manuels, commentaires en mémoire ; les agents partenaires viennent du Security Store et peuvent exiger l'approbation d'un Global Administrator.
