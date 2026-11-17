La SC-500 est l'examen de l'ingénieur sécurité cloud et IA : elle teste la façon dont vous implémentez des contrôles de sécurité sur l'identité, les données, les réseaux, le calcul et les charges de travail d'IA, puis dont vous mesurez et surveillez la posture avec Microsoft Defender for Cloud, Microsoft Sentinel et Security Copilot. Les questions portent sur la mise en œuvre, pas sur la conception : quel paramètre, quel rôle, quel effet de stratégie, quelle étape vient en premier. Ce chapitre présente le format, une méthode pour lire les questions et les paires de contrôles que l'examen vous demande de distinguer.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | Microsoft Certified: Cloud and AI Security Engineer Associate. L'ancienne certification Azure Security Engineer Associate a été retirée le 31 août 2026 |
| Prérequis | Aucun. Microsoft attend une pratique de l'administration d'Azure et des environnements hybrides, une solide maîtrise de Microsoft Entra ID et une bonne connaissance de l'administration de Microsoft 365 |
| Durée | 120 minutes d'examen (140 minutes sur place), la valeur de Microsoft pour les examens associate qui peuvent contenir des laboratoires |
| Questions | Nombre non publié ; environ 40 à 60 sur la plupart des examens Microsoft |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn peut être ouvert pendant l'examen, sur le même chronomètre ; les autres sites sont bloqués |
| Langues | Anglais, français, allemand, espagnol, italien, japonais, coréen, chinois (simplifié et traditionnel), portugais (Brésil) |
| Composants interactifs | L'examen est surveillé et « peut comporter des composants interactifs » |
| Entraînement | Le bac à sable d'examen (aka.ms/examdemo) montre l'interface ; l'évaluation d'entraînement de Microsoft arrive en général dans les 8 semaines qui suivent la bêta |

Les quatre domaines du guide d'étude (mis à jour le 13 mai 2026) pèsent à peu près autant :

| Domaine | Poids |
| --- | --- |
| Gérer l'identité, l'accès et la gouvernance | 20 à 25 % |
| Sécuriser le stockage, les bases de données et la mise en réseau | 25 à 30 % |
| Sécuriser le calcul | 20 à 25 % |
| Gérer et surveiller la posture de sécurité | 20 à 25 % |

« Sécuriser le calcul » contient les nouveaux objectifs d'IA : Microsoft Purview DSPM pour l'IA, protection des agents Copilot Studio, Microsoft Entra Agent ID, AI Gateway dans API Management, Defender for AI Services et garde-fous de Foundry. L'examen peut inclure des fonctionnalités en préversion quand elles sont couramment utilisées.

Formats de questions : une réponse parmi quatre, « sélectionnez deux réponses », affirmations Oui/Non, listes déroulantes qui complètent une phrase, une commande ou une stratégie, glisser-déposer (associations ou étapes à ordonner), et zones réactives. Deux sections ont leurs propres règles :

- **Étude de cas.** Une entreprise décrite en onglets (vue d'ensemble, environnement existant, exigences) suivie de plusieurs questions. Une fois sortie, vous ne pouvez plus y revenir.
- **Série problème-solution.** Le même objectif revient avec une solution différente à chaque fois ; vous dites si la solution atteint l'objectif. Chaque réponse est définitive.

> **Conseil d'examen.** Microsoft Learn est disponible, mais le chronomètre continue de tourner. Servez-vous-en pour confirmer un nom de rôle, un effet de stratégie ou une limite, jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question de sécurité

Un énoncé type décrit une entreprise (Contoso, Fabrikam...), montre une pièce jointe (utilisateurs et rôles, VM et sous-réseaux, règles de NSG, une définition de stratégie), pose une ou deux contraintes et demande « Que devez-vous faire ? ». Procédez dans cet ordre :

1. Lisez la dernière phrase : que devez-vous choisir, configurer ou faire **en premier** ?
2. Soulignez les contraintes. Ce sont elles qui éliminent les distracteurs plausibles.
3. Vérifiez l'étendue : locataire, groupe d'administration, abonnement, groupe de ressources, ressource.
4. Dans une pièce jointe ou un bloc de code, lisez chaque ligne : un effet, une étendue ou une propriété manquante décide généralement de la réponse.

| Mots de l'énoncé | Ce qu'ils désignent |
| --- | --- |
| « privilège minimum » | Le rôle le plus spécifique à l'étendue la plus étroite, éligible dans PIM plutôt que permanent |
| « réduire l'effort d'administration » | L'option intégrée et gérée : une stratégie ou une initiative intégrée, un plan Defender, une identité managée |
| « sans stocker d'identifiants » | Une identité managée ou la fédération des identités de charge de travail |
| « juste-à-temps », « limité dans le temps », « soumis à approbation » | Attribution éligible PIM, ou accès JIT aux ports de gestion des VM |
| « empêcher » | Stratégie `deny`, verrou, paramètres de refus, pare-feu : un contrôle bloquant |
| « identifier », « signaler », « évaluer » | `audit`, recommandations, tableau de bord de conformité réglementaire |
| « corriger les ressources existantes » | `deployIfNotExists` ou `modify` avec une tâche de correction |
| « aucun accès public », « connectivité privée » | Point de terminaison privé et accès réseau public désactivé |
| « être alerté en cas d'attaque » | Un plan de protection des charges de travail de Defender for Cloud |
| « répondre automatiquement aux incidents » | Règle d'automatisation Sentinel, qui peut exécuter un playbook |

Le code que vous devez savoir lire, sans l'écrire de mémoire :

- **JSON d'Azure Policy** : la condition `if`, les alias qu'elle teste et l'`effect`.
- **Azure CLI et PowerShell** : attributions de rôles, paramètres de Key Vault, règles réseau, paramètres des plans Defender.
- **Bicep et ARM** : propriétés de sécurité comme `publicNetworkAccess`, `minimumTlsVersion` ou `allowBlobPublicAccess`.
- **KQL** : courtes requêtes Sentinel et Defender XDR qui filtrent, projettent et agrègent des événements.

Dans une question à liste déroulante sur du code, les autres lignes de l'extrait sont des indices : un type de ressource, une étendue ou un paramètre désigne souvent la valeur manquante.

> **Piège d'examen.** Prenez « devrait » et « doit » au pied de la lettre. Si l'exigence est de **détecter** un accès suspect, un pare-feu qui le bloque n'est pas la réponse ; si elle est d'**empêcher** une configuration, une stratégie d'audit ne l'est pas non plus.

<!-- section: confusing-pairs -->
## Les contrôles faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Attribution éligible PIM | Attribution active PIM | L'éligible exige une activation (MFA, approbation, justification) ; l'active est un accès permanent, même limité dans le temps |
| Rôles Azure | Rôles Microsoft Entra | Les ressources Azure par Resource Manager ; les objets Entra par Microsoft Graph |
| Azure RBAC pour Key Vault | Stratégies d'accès de Key Vault | Des rôles à l'étendue du coffre ou de l'objet, recommandés ; d'anciennes stratégies par coffre que tout Contributor peut modifier |
| Suppression réversible | Protection contre le vidage | Fenêtre de récupération, toujours active ; empêche la suppression définitive pendant cette fenêtre, facultative et irréversible |
| `deny` | `audit` / `deployIfNotExists` / `modify` | Bloque la requête ; signale ; déploie une ressource associée manquante ; modifie des propriétés |
| Point de terminaison de service | Point de terminaison privé / service Private Link | Identité du sous-réseau vers un point de terminaison public ; adresse IP privée pour une ressource PaaS dans votre réseau ; votre propre service exposé à d'autres réseaux |
| NSG | Règles d'administration de sécurité / Azure Firewall | Filtre de sous-réseau ou de carte réseau ; règles de Virtual Network Manager évaluées avant les NSG ; pare-feu central avec état, FQDN et renseignement sur les menaces |
| SAS de service | SAS de compte / SAS de délégation d'utilisateur | Un seul service, signé avec la clé ; plusieurs services, signé avec la clé ; signé avec des identifiants Entra, Blob uniquement |
| Azure Disk Encryption | Chiffrement sur l'hôte | BitLocker ou DM-Crypt dans l'invité ; chiffrement du disque temporaire et des caches sur l'hôte, sans agent invité |
| Foundational CSPM | Defender CSPM | Recommandations et score de sécurité gratuits ; chemins d'attaque, explorateur, analyse sans agent et gouvernance payants |
| Defender for Servers Plan 1 | Plan 2 | Intégration de Defender for Endpoint ; ajoute l'analyse sans agent, l'accès JIT, la surveillance de l'intégrité des fichiers et plus encore |
| Règle d'automatisation Sentinel | Playbook | Règle centrale de tri des incidents et des alertes ; workflow Logic Apps qu'elle peut exécuter |

<!-- section: scope -->
## Ce que l'examen ne teste pas

Le guide d'étude exclut l'investigation des incidents et la chasse aux menaces, la gouvernance du cycle de vie des identités comme la gestion des droits d'utilisation et les révisions d'accès, les stratégies DLP et d'étiquetage de Purview, et la conception d'architecture de sécurité : d'autres examens de sécurité Microsoft les couvrent. Quand une question les mentionne, elle porte sur le contrôle que vous implémentez, pas sur l'investigation ni sur la conception.

Defender for Cloud, Entra et les services d'IA changent tous les mois. Quand un nom de plan, un rôle ou une limite compte, le cours donne la valeur telle que Microsoft Learn la documente en novembre 2026 : fiez-vous-y plutôt qu'aux anciens supports de l'AZ-500.

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre. L'identité et la gouvernance viennent en premier, car tous les contrôles suivants reposent sur les rôles, les stratégies et les identités managées.
2. Utilisez un abonnement Azure gratuit et un locataire Microsoft Entra de test. Activez un rôle PIM, écrivez une stratégie d'accès conditionnel en mode rapport uniquement, créez un coffre de clés avec le modèle RBAC, attribuez une stratégie `deny` et activez un plan Defender : la plupart des questions à liste déroulante deviennent faciles une fois que vous avez vu les paramètres.
3. Pour chaque paire du tableau ci-dessus, écrivez une phrase qui dit quand vous choisiriez chaque option.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication et relisez les sections liées à vos erreurs.
5. Réservez l'examen réel quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
