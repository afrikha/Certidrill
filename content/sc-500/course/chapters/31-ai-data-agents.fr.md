Sécuriser Microsoft 365 Copilot et les agents commence par les données : Copilot répond à partir de tout contenu que l'utilisateur peut déjà ouvrir, si bien que les sites SharePoint surpartagés deviennent une exposition à l'IA. Viennent ensuite les agents eux-mêmes : leurs identités Microsoft Entra Agent ID, les stratégies d'accès conditionnel et les packages d'accès qui les encadrent, le rayon d'impact (blast radius) que Defender XDR affiche pour eux, la protection à l'exécution des agents Copilot Studio et l'inventaire des agents du Centre d'administration Microsoft 365. Beaucoup de ces fonctionnalités sont en préversion.

<!-- section: sharepoint-overexposure | objectives: 3.1.1 -->
## Identifier la surexposition des données dans SharePoint

La surexposition, ce sont des autorisations plus larges que la sensibilité du contenu : **Tout le monde sauf les utilisateurs externes** (Everyone except external users, EEEU), partage avec toute personne disposant du lien, groupes trop larges. Deux ensembles d'outils la détectent.

**SharePoint Advanced Management (SAM)**, utilisé par les administrateurs SharePoint dans le Centre d'administration SharePoint :

| Outil | Ce qu'il montre ou fait |
| --- | --- |
| Rapports de gouvernance de l'accès aux données (DAG) | Rapports d'état des autorisations (sites, OneDrive, fichiers), autorisations de site d'un utilisateur donné, instantané des étiquettes de confidentialité, activité des liens de partage (28 derniers jours), informations EEEU (28 derniers jours) |
| Révisions d'accès aux sites | Délèguent la révision d'un constat DAG aux propriétaires du site surpartagé |
| Découverte de contenu restreinte (Restricted content discovery, RCD) | Exclut un site de la recherche à l'échelle de l'organisation et des réponses de Copilot, sans changer les autorisations |
| Contrôle d'accès restreint (Restricted access control, RAC) | Limite l'accès à un site aux membres de groupes précis, quel que soit le partage |
| Accès conditionnel avec contextes d'authentification | Applique une stratégie Entra à un site précis |
| Stratégie de blocage du téléchargement | Bloque les téléchargements depuis un site |

```powershell
Set-SPOSite -Identity https://contoso.sharepoint.com/sites/Finance `
  -RestrictContentOrgWideSearch $true
Set-SPOTenant -DelegateRestrictedContentDiscoverabilityManagement $true
```

Faits sur la RCD : seuls les administrateurs SharePoint la gèrent, sauf si la seconde cmdlet la délègue aux administrateurs de site (qui doivent justifier les changements) ; sites SharePoint uniquement, pas OneDrive ; les utilisateurs qui ont accès ouvrent toujours le contenu ; le contenu reste indexé pour eDiscovery et l'étiquetage automatique ; sur les très grands sites, l'application peut prendre plus d'une semaine. C'est un contrôle temporaire, le temps que les propriétaires corrigent les autorisations.

**Microsoft Purview DSPM for AI** exécute des **évaluations des risques liés aux données** : une évaluation par défaut s'exécute **chaque semaine sur les 100 premiers sites SharePoint** par utilisation, et vous pouvez créer des évaluations personnalisées pour d'autres sites ou utilisateurs. Pour chaque site, les onglets **Overview**, **Identify**, **Protect** et **Monitor** montrent les éléments analysés, les données sensibles et les liens de partage. Correction depuis l'onglet Protect :

| Option | Effet |
| --- | --- |
| Restreindre l'accès par étiquette (Restrict access by label) | Crée une stratégie DLP qui empêche Microsoft 365 Copilot et les agents de résumer le contenu portant certaines étiquettes ; autorisations inchangées |
| Restreindre tous les éléments (Restrict all items) | Utilise la découverte de contenu restreinte pour retirer le site des données d'ancrage de Copilot ; les personnes gardent l'accès |
| Créer une stratégie d'étiquetage automatique | Étiquette les fichiers non étiquetés qui contiennent des types d'informations sensibles |
| Créer des stratégies de rétention | Supprime le contenu obsolète (non consulté depuis au moins trois ans) |

> **Piège d'examen.** La découverte de contenu restreinte ne retire l'accès à personne : elle masque seulement le site dans la recherche à l'échelle de l'organisation et dans Copilot. Pour empêcher des personnes d'ouvrir un site surpartagé, corrigez ses autorisations ou appliquez le contrôle d'accès restreint.

<!-- section: dspm-ai-risks | objectives: 3.1.2 -->
## Identifier les risques liés à Copilot et aux applications d'IA avec DSPM

Dans le portail Microsoft Purview, **Solutions > DSPM for AI (classic)** reste disponible ; les nouvelles fonctionnalités sont ajoutées à la nouvelle expérience **Data Security Posture Management**. Prérequis :

| Exigence | Détail |
| --- | --- |
| Audit Microsoft Purview | Activé (actif par défaut pour les nouveaux locataires) |
| Licences | Microsoft 365 Copilot pour les utilisateurs surveillés ; facturation à l'utilisation pour les applications d'IA autres que Microsoft 365 Copilot ; Microsoft 365 E5 ou Microsoft Purview Suite (E3 ne suffit pas) |
| Rôle | Compliance Administrator ou un rôle équivalent |
| Sites d'IA externes (ChatGPT grand public, Gemini) | Appareils intégrés à Microsoft Purview et extension de navigateur Microsoft Purview |
| Étiquettes de confidentialité | Recommandées : sans elles, seuls les types d'informations sensibles sont détectés |

La section **Get started** active des stratégies en un clic qui créent pour vous les règles sous-jacentes, par exemple **Detect risky AI usage**, **Unethical behavior in AI apps** et **Detect sensitive info shared with AI via network**.

| Zone du tableau de bord | Contenu |
| --- | --- |
| Rapports (Reports) | Interactions d'IA par catégorie : Copilot experiences and agents, Enterprise AI apps, Other AI apps |
| Évaluations des risques liés aux données | Sites SharePoint surpartagés utilisés comme données d'ancrage |
| Explorateur d'activités | Événements : AI interaction, AI website visit, Sensitive info types, DLP rule match, avec l'utilisateur, l'application, l'étiquette ou le type d'informations sensibles |
| Applications et agents (Apps and agents) | Applications d'IA et agents découverts, avec leur utilisation |

Risques mis en évidence par DSPM : données sensibles dans un prompt, données sensibles dans une réponse (Copilot qui cite des fichiers étiquetés), données sensibles collées dans un site d'IA externe, et données qui franchissent des zones de sécurité.

> **Piège d'examen.** DSPM for AI donne de la visibilité ; il ne bloque rien. Pour empêcher les utilisateurs de coller du contenu sensible dans des applications d'IA externes, créez une stratégie DLP Microsoft Purview pour ce scénario.

<!-- section: copilot-studio-realtime | objectives: 3.1.3 -->
## Protection en temps réel des agents Copilot Studio

Les agents personnalisés Copilot Studio ont une protection intégrée contre les attaques par injection de prompt utilisateur (UPIA) et les attaques par injection de prompt inter-domaines (XPIA). Pour les agents qui utilisent l'orchestration générative, la **protection en temps réel** ajoute un contrôle externe : chaque fois que l'orchestrateur s'apprête à invoquer un outil, il envoie le prompt, l'historique récent, les sorties des outils précédents et l'appel d'outil proposé à un point de terminaison de détection des menaces, qui répond autoriser ou bloquer. Une requête bloquée arrête l'agent et indique à l'utilisateur que son message a été bloqué. Le fournisseur peut être Microsoft Defender, un autre éditeur ou votre propre service.

Avec Microsoft Defender, les stratégies de protection en temps réel couvrent les agents Copilot Studio (préversion ; seuls les appels d'outils sont évalués), les agents Foundry (préversion) et les Agent 365 Tooling Servers (WorkIQ et Custom MCP, en disponibilité générale). L'intégration actuelle de Copilot Studio est une procédure à deux équipes qui est **retirée le 23 décembre 2026** ; l'intégration automatique au niveau du locataire des agents Copilot Studio pris en charge (locataires où Security for AI agents est activé) est déployée en préversion publique à partir du 22 novembre 2026. La procédure actuelle :

1. Ingénieur sécurité, portail Microsoft Defender : **System > Settings > Security for AI**, activez **Security for AI Agents** (lance la découverte), puis activez **Real time protection during agent runtime** et copiez l'URL fournie.
2. Administrateur Power Platform, Centre d'administration Power Platform : **Security > Threat Protection > Microsoft Defender - Copilot Studio AI Agents**, activez-le, saisissez l'URL, créez ou sélectionnez une application Microsoft Entra et communiquez son **App ID**.
3. Ingénieur sécurité : saisissez l'App ID dans les paramètres Security for AI et enregistrez. L'état **Connected** confirme la liaison.

| Fait | Valeur |
| --- | --- |
| Rôles | Power Platform Administrator côté Power Platform ; Security Administrator ou supérieur pour activer la sécurité des agents d'IA et connecter le connecteur d'application Microsoft 365 |
| Connecteur d'application Microsoft 365 | Doit être connecté avec au moins Microsoft Entra ID Management events et Microsoft 365 activities, sinon les blocages ont lieu mais aucune alerte ni aucun incident n'apparaît |
| Configuration d'un fournisseur personnalisé | **Security > Threat detection > Additional threat detection**, par environnement, y compris les environnements créés plus tard |
| Délai d'expiration | Sans décision en une seconde, l'outil s'exécute par défaut (le comportement en cas d'erreur peut être réglé sur le blocage) |
| Sessions | S'applique uniquement aux nouvelles sessions |
| Application Entra pour un fournisseur personnalisé | Inscription d'application monolocataire avec une information d'identification fédérée (sans secret) |

Dans le portail Defender, **Settings > Security for AI > Policies & rules > Real-time protection** contient les règles : la règle par défaut **audite** tous les agents ; les règles personnalisées **bloquent** les types de détection choisis (contenu malveillant, exfiltration de secrets, techniques d'évasion, domaine de messagerie non sûr) pour tous les agents ou certains. Résultats : alertes et incidents dans **Incidents & alerts**, tables `BehaviorInfo`, `CloudAppEvents` et `AIAgentsInfo` du repérage avancé, et colonne **Protection status** de la page Agents de Copilot Studio.

```kusto
AIAgentsInfo
| summarize arg_max(Timestamp, *) by AIAgentId
| project AIAgentName, Platform, CreatorAccountUpn, AgentToolsDetails, IsBlocked
```

> **Piège d'examen.** Les paramètres de blocage définis par l'intégration actuelle ne sont pas migrés. Avant le 23 décembre 2026, désactivez-la sous **Settings > Security for AI > Get started > Copilot Studio**, puis recréez et activez les règles de blocage sous **Policies & rules > Real-time protection**. Après le retrait, un agent sans règle de blocage activée fonctionne en mode audit : des alertes, mais aucun blocage.

<!-- section: agent-conditional-access | objectives: 3.1.4 -->
## Accès conditionnel pour Microsoft Entra Agent ID

L'accès conditionnel s'applique au **sujet du jeton** :

| Modèle d'accès | Sujet du jeton | Cibles de la stratégie |
| --- | --- | --- |
| On-behalf-of (délégué) | L'utilisateur connecté | Utilisateurs et groupes |
| Autonome (application uniquement) | L'identité d'agent | Identités d'agent ou blueprints d'identité d'agent |
| Utilisateur d'agent | Le compte d'utilisateur d'agent | Agent Users |

Créez la stratégie dans **Entra ID > Accès conditionnel > Stratégies > Nouvelle stratégie** : **Users, agents or workload identities > What does this policy apply to? > Agents**, puis incluez **All agent identities**, des identités d'agent ou des principaux de blueprint choisis, ou les agents sélectionnés par des **attributs de sécurité personnalisés**. Une stratégie qui cible un **blueprint** couvre toutes les identités d'agent créées à partir de celui-ci, y compris les futures. Stratégies types, toutes deux démarrées en **Report-only** (rapport seul) :

| Objectif | Configuration |
| --- | --- |
| Uniquement les agents approuvés | Inclure All agent identities, exclure les agents approuvés (ou utiliser des attributs de sécurité personnalisés), All resources, **Block** |
| Bloquer les agents à risque | All agent identities, condition **Agent risk (Preview)** = High, **Block** |

| Fait | Valeur |
| --- | --- |
| Rôle | Conditional Access Administrator |
| Licences | Microsoft 365 E7, ou Microsoft Agent 365 avec Microsoft Entra ID P1 ou Microsoft 365 E3 ; le risque d'agent exige Entra ID P2 ou Microsoft 365 E5 |
| Évaluée | Quand Entra ID émet ou actualise un jeton |
| Non évaluée | Clés API, ressources non sécurisées par Entra ID, blueprints qui créent des agents, paramètres de sécurité par défaut |

> **Piège d'examen.** Les stratégies ciblées par **Users** (tous les utilisateurs, groupes, rôles) ne s'appliquent jamais aux comptes d'utilisateur d'agent, et les stratégies sur les identités d'agent ne couvrent pas le compte d'utilisateur de l'agent. Chaque sujet de jeton a besoin de sa propre stratégie.

<!-- section: agent-blast-radius | objectives: 3.1.5 -->
## Analyser le rayon d'impact des agents avec Defender XDR

Le **rayon d'impact** (blast radius) d'une identité d'agent est ce qu'un attaquant atteint si elle est compromise. Defender XDR évalue trois composantes et attribue à chaque agent un score de risque :

| Composante | Rayon d'impact plus large | Rayon d'impact plus étroit |
| --- | --- | --- |
| Autorisations | Autorisations d'application comme `Sites.FullControl.All`, `Mail.ReadWrite.All` | `Sites.Selected`, `Files.Read.Selected`, étendues déléguées |
| Sources de connaissances | Nombreux sites au contenu Highly Confidential | Peu de sites au contenu correctement étiqueté |
| Configuration du blueprint | Actions comme l'envoi d'e-mails externes ou l'exécution de code | Uniquement les actions nécessaires à la tâche |

L'**inventaire des agents d'IA** se trouve dans **Assets > AI Agents** (préversion). Il liste les agents dotés d'identités Entra provenant de Copilot Studio, de Microsoft Foundry, d'AWS Bedrock et de GCP Vertex AI, avec leur état, leurs identités, leur dernière activité et leur niveau de risque. Sélectionner un agent Foundry, Bedrock ou Vertex AI ouvre un volet avec les autorisations, les sources de connaissances et les facteurs de risque ; **View on map** affiche les **chemins d'attaque** de l'agent vers des données sensibles ou des comptes privilégiés. Les agents Copilot Studio s'analysent avec les requêtes **AI Agents** du repérage avancé. Depuis le 1er juillet 2026, la découverte, la posture et la détection des menaces au niveau de l'agent pour les agents Copilot Studio et Foundry exigent une licence éligible Microsoft Agent 365.

Correction : moins d'autorisations, moins de sources de connaissances, moins d'actions de blueprint, accès conditionnel. **ID Protection pour les agents** liste les détections (Sign-in spike, Unfamiliar resource access...) dans le rapport **Risky Agents** ; **Confirm compromise** fait passer le risque à High, ce qu'une stratégie Block sur le risque d'agent applique, et **Disable** bloque toutes les connexions.

> **Piège d'examen.** Priorisez les chemins d'attaque selon la criticité de la cible, pas selon le nombre d'étapes : un chemin de trois étapes vers des données financières passe avant un chemin de sept étapes vers des notes de réunion.

<!-- section: agent-id-access | objectives: 3.1.6 -->
## Gérer l'accès de Microsoft Entra Agent ID

Un **blueprint d'identité d'agent** est le modèle à partir duquel les **identités d'agent** sont créées ; une identité d'agent peut avoir un **compte d'utilisateur d'agent** associé. Les identités d'agent reçoivent un accès **autonome** (autorisations d'application Microsoft Graph, rôles Azure RBAC, rôles Microsoft Entra, rôles d'application) ou **délégué** (agir pour un utilisateur, dans la limite des droits qu'il délègue).

Chaque objet a des relations distinctes des rôles d'administration Entra comme **Agent ID Administrator** :

| Relation | Qui | Obligatoire | Peut |
| --- | --- | --- | --- |
| Propriétaire (owner) | Utilisateurs (invités compris) ou principaux de service, pas des groupes | Non | Administration technique : paramètres, informations d'identification, propriétaires et sponsors, désactiver, réactiver, restaurer, supprimer |
| Sponsor | Utilisateurs ou groupes (groupes d'appartenance dynamique, groupes Microsoft 365 à appartenance affectée ; pas de groupes assignables à un rôle ni de groupes de sécurité à appartenance affectée) | **Oui**, au moins un par identité d'agent et par blueprint (jusqu'à 100, dont 5 groupes) ; facultatif sur un compte d'utilisateur d'agent (jusqu'à 5, tout type de groupe) | Responsabilité métier : demander des packages d'accès, renouveler ou retirer l'accès, désactiver ou supprimer de façon réversible, mais pas réactiver ni restaurer |
| Responsable (manager) | Utilisateurs individuels | Non | Demander des packages d'accès pour le compte d'utilisateur de l'agent ; ne peut ni modifier ni supprimer l'agent |

La **gestion des droits d'utilisation** encadre ce que reçoivent les agents : dans la stratégie du package d'accès, **Who can get access** = **For users, service principals, and agent identities in your directory** > **All agents** ; les agents qui utilisent des principaux de service classiques au lieu d'identités d'agent exigent une seconde stratégie avec **All Service principals**. L'agent peut demander le package lui-même (Graph `accessPackageAssignmentRequest`), son sponsor ou son propriétaire peut le demander pour lui, ou un administrateur l'attribue. Les packages peuvent contenir des appartenances à des groupes de sécurité, des autorisations d'API OAuth (déléguées et d'application) et des rôles Microsoft Entra. Avant l'expiration d'une attribution, le sponsor est averti et peut demander une prolongation. Les flux de travail de cycle de vie peuvent transférer le parrainage au responsable d'un sponsor qui quitte l'organisation, et une stratégie d'inactivité par défaut désactive les identités d'agent inactives.

> **Piège d'examen.** Un sponsor est responsable, pas administrateur : il peut désactiver une identité d'agent mais ne peut ni la réactiver ni la restaurer. La récupération exige un propriétaire ou un administrateur.

<!-- section: m365-admin-agents | objectives: 3.1.11 -->
## Gérer les agents dans le Centre d'administration Microsoft 365

Le **registre des agents** (Agent Registry, **Agents > All agents > Registry**) est l'inventaire des agents du locataire, avec les vignettes **Total agents**, **Agents without owners** et **Unmanaged agents**, des filtres et une colonne **Risks** (licence E7 ou Agent 365). Types d'éditeur : **Microsoft agents**, **External partner-built agents**, **Published by your org**, **Shared by creator** ; un même agent Copilot Studio peut apparaître deux fois avec deux types d'éditeur.

| Action | Effet |
| --- | --- |
| Install / Uninstall | Déployer pour toute l'organisation ou pour des utilisateurs et des groupes / retirer |
| Block / Unblock | Restreint ou rétablit l'agent dans toute l'organisation |
| Publish to store / Reject submission | Répond à la demande d'un utilisateur de publier un agent dans l'Agent Store |
| Assign new owner | Réattribue un agent partagé sans propriétaire ; l'ancien propriétaire perd l'accès |
| Delete / Restore / Permanently delete | Suppression réversible avec rétention de 30 jours |
| Start / Stop | Agents Foundry uniquement ; exige le rôle Azure AI Owner |

**Agents > Settings** contient **Agent and plugin access** (autoriser les agents créés par Microsoft, par votre organisation, par des éditeurs externes), **User access** (All users par défaut, No users, ou des utilisateurs ou groupes précis), **Sharing** (qui peut partager les agents Agent Builder ; **No users** désactive le partage au niveau de l'organisation mais permet toujours le partage direct avec des personnes précises), **Agent management rules** (actions en bloc : bloquer les agents sans propriétaire et inutilisés, réattribuer les agents Agent Builder sans propriétaire au responsable de l'ancien propriétaire, appliquer un modèle, installer des agents Microsoft, rejeter les anciennes demandes de publication) et les étiquettes. Utilisez le rôle **AI Administrator** plutôt que Global Administrator ; les AI Administrators ne peuvent configurer ni l'accès conditionnel ni les stratégies de packages d'accès.

> **Piège d'examen.** Désactiver « Allow agents and plugins built by your organization » masque ces agents dans l'Agent Store ; pour arrêter partout un seul agent à risque, **bloquez-le** (Block) plutôt dans le registre.

<!-- section: key-points -->
## Points clés

- SharePoint : les rapports DAG détectent la surexposition ; la RCD masque un site à Copilot sans changer l'accès ; le RAC et les autorisations le restreignent ; DSPM évalue chaque semaine les 100 premiers sites.
- DSPM for AI exige l'audit Purview et E5 ou Purview Suite ; il montre les risques, la DLP bloque.
- Protection en temps réel de Copilot Studio : le blocage vient des règles personnalisées de Policies & rules > Real-time protection (règle par défaut = audit) ; l'intégration actuelle Defender plus Power Platform est retirée le 23 décembre 2026 et ses paramètres de blocage ne sont pas migrés ; délai d'une seconde qui autorise par défaut.
- L'accès conditionnel pour les agents cible des identités d'agent ou des blueprints, jamais les utilisateurs d'agent via Users ; jetons émis par Entra uniquement.
- Rayon d'impact = autorisations, sources de connaissances, actions du blueprint ; inventaire dans Assets > AI Agents, chemins d'attaque avec View on map.
- Agent ID : sponsors obligatoires, propriétaires techniques ; packages d'accès pour All agents ; registre du Centre d'administration Microsoft 365 pour installer, bloquer et publier.
