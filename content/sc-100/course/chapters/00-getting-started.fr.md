La SC-100 est l'examen de l'architecte en cybersécurité. Elle ne demande jamais comment configurer un produit : elle décrit une organisation, le plus souvent hybride et multicloud, énumère des exigences métier et de conformité, puis demande ce que vous devez recommander, quel framework guide la décision et quelle capacité de sécurité Microsoft convient. Ce chapitre présente le format, une méthode pour lire les questions de conception, la carte des frameworks Microsoft sur lesquels repose le premier domaine, et les paires de produits que l'examen vous demande de distinguer.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | Microsoft Certified: Cybersecurity Architect Expert |
| Prérequis | Au moins une de ces certifications : Identity and Access Administrator Associate (SC-300), Security Operations Analyst Associate (SC-200), Cloud and AI Security Engineer Associate (SC-500) |
| Durée | 100 minutes d'examen, 120 minutes sur place (les valeurs de Microsoft pour les examens associate et expert sans laboratoire) |
| Questions | Nombre non publié ; environ 40 à 60 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn peut être ouvert pendant l'examen ; le chronomètre continue de tourner |
| Langues | Anglais, japonais, chinois (simplifié et traditionnel), coréen, allemand, français, espagnol, portugais (Brésil), italien. Dans une autre langue, vous pouvez demander 30 minutes supplémentaires |
| Validité | Un an, renouvelée gratuitement par une évaluation en ligne sur Microsoft Learn |
| Entraînement | Le bac à sable d'examen (aka.ms/examdemo) montre l'interface |

Le guide d'étude suivi par ce cours est la version du 21 octobre 2026. Ses quatre domaines :

| Domaine | Poids |
| --- | --- |
| Concevoir des solutions qui s'alignent sur les bonnes pratiques et priorités en matière de sécurité | 20 à 25 % |
| Concevoir des capacités en matière d'opérations de sécurité, d'identité et de conformité | 25 à 30 % |
| Concevoir des solutions de sécurité pour l'infrastructure | 25 à 30 % |
| Concevoir des solutions de sécurité pour les applications et les données | 20 à 25 % |

Le guide contient désormais des sujets d'IA dans chaque domaine : solutions d'IA alignées sur le Microsoft cloud security benchmark, stratégie d'adoption sécurisée de l'IA, identités d'agent avec Microsoft Entra Agent ID, sécurité des services Azure AI, données utilisées par les charges de travail d'IA et contrôles de Microsoft 365 Copilot. Security Exposure Management apparaît aussi dans la gestion de la posture.

Formats de questions, du plus au moins fréquent : une réponse parmi quatre, « sélectionnez deux réponses », séries d'affirmations Oui/Non, listes déroulantes qui complètent « pour répondre à l'exigence X, recommandez Y », et glisser-déposer qui associe des exigences à des solutions. Les questions à ordonner et les zones réactives sont rares, et il n'y a ni laboratoire, ni commande, ni code. Les questions à plusieurs éléments rapportent un point par élément correct. Deux sections ont leurs propres règles :

- **Étude de cas.** Une entreprise décrite en onglets (vue d'ensemble, environnement existant, exigences, contraintes) suivie de quatre à six questions. Une fois sortie, vous ne pouvez plus y revenir. Si vous prenez une pause pendant une étude de cas, vous ne pouvez plus revenir aux questions vues avant la pause.
- **Série problème-solution.** Le même objectif revient avec une solution différente à chaque fois ; vous dites si la solution atteint l'objectif. Chaque réponse est définitive, et vous ne pouvez pas prendre de pause au milieu de la série.

> **Conseil d'examen.** Microsoft Learn sert à vérifier un fait précis : les scénarios du framework d'adoption de la Confiance Zéro, les domaines d'un benchmark, la couverture d'AWS ou de GCP par un produit. Microsoft indique que chercher chaque question ne tient pas dans le temps imparti, et que c'est voulu.

<!-- section: reading-questions -->
## Lire une question de conception

Un énoncé type compte quatre à huit phrases : une organisation (Contoso, Fabrikam, Litware...) avec des services de domaine Active Directory (AD DS) locaux, des abonnements Azure, des comptes AWS ou des projets GCP et Microsoft 365, un problème actuel, puis des exigences. Il se termine par « Que devez-vous recommander ? », « Que devez-vous inclure dans la recommandation ? » ou « Quelles sont les deux solutions qui répondent aux exigences ? ». Une contrainte départage en général deux réponses valables. Procédez dans cet ordre :

1. Lisez d'abord la dernière phrase : vous demande-t-on un produit, un framework, une priorité ou un processus ?
2. Relevez chaque exigence, y compris celles cachées dans le contexte (« l'équipe de sécurité n'a aucune expérience d'Azure », « l'entreprise utilise un SIEM tiers »).
3. Éliminez chaque option qui manque une exigence.
4. Appliquez la contrainte décisive à ce qui reste.

| Mots de l'énoncé | Ce qu'ils désignent |
| --- | --- |
| « réduire l'effort d'administration » | La capacité intégrée et managée, avec une intégration native, plutôt qu'un script, un connecteur personnalisé ou un outil tiers |
| « réduire les coûts » | La capacité déjà incluse dans les licences existantes ou le niveau gratuit, si elle répond à chaque exigence |
| « Confiance Zéro » | Vérifier explicitement, moindre privilège, supposer une violation : accès conditionnel avec signaux d'appareil, accès juste-à-temps, segmentation |
| « privilège minimum » | Le rôle le plus étroit à l'étendue la plus étroite, éligible dans Privileged Identity Management plutôt que permanent |
| « ressources vitales pour l'entreprise », « joyaux de la couronne » | Les identifier et les classer d'abord, puis les protéger en premier (gestion des ressources critiques dans Security Exposure Management) |
| « récupérer sans payer la rançon » | Sauvegardes immuables ou hors ligne, restaurations testées, documentation de récupération protégée |
| « AWS », « GCP », « multicloud » | Les capacités Microsoft qui couvrent nativement les autres clouds (connecteurs de Defender for Cloud, Azure Arc pour les serveurs) |
| « en premier », « prioriser » | L'ordre publié par Microsoft : pour les rançongiciels, la récupération, puis l'accès privilégié, puis les points d'entrée |
| « empêcher », par opposition à « détecter » ou « signaler » | Un contrôle bloquant, par opposition à une alerte ou une évaluation |

> **Piège d'examen.** Un produit techniquement correct peut rester la mauvaise réponse. Si la question demande quel framework ou quelle priorité, une réponse qui nomme un produit est un distracteur, et inversement.

Dans une série Oui/Non, jugez chaque solution au regard de l'objectif énoncé uniquement. Acceptez une solution qui atteint l'objectif même si vous auriez conçu mieux.

<!-- section: frameworks -->
## Les frameworks à situer

Le premier domaine porte sur les frameworks, et leurs noms apparaissent comme options de réponse dans tous les domaines. Sachez à quoi chacun sert :

| Framework | Ce que c'est | Question type |
| --- | --- | --- |
| Framework d'adoption de la Confiance Zéro | Des recommandations organisées en cinq scénarios métier, avec les phases de cycle de vie Define strategy, Plan, Ready, Adopt, Govern et Manage | Comment planifier et prioriser un programme Confiance Zéro avec les responsables métier |
| Microsoft Cybersecurity Reference Architectures (MCRA) | Des diagrammes des capacités de sécurité Microsoft et de leur intégration entre elles et avec des outils tiers | Une architecture de sécurité cible, ou quelle capacité couvre une fonction |
| Microsoft cloud security benchmark (MCSB) | Un ensemble de contrôles de sécurité, organisés en domaines et mappés à des définitions Azure Policy, évalués par Defender for Cloud | Quel contrôle ou quelle base de référence une conception doit respecter |
| Cloud Adoption Framework (CAF) | Des méthodologies pour l'ensemble du patrimoine cloud (Strategy, Plan, Ready, Adopt, Govern, Manage), avec une méthodologie Secure qui les traverse, et les zones d'atterrissage Azure | Gouvernance à l'échelle de l'organisation, zones d'atterrissage, DevSecOps, adoption de l'IA |
| Azure Well-Architected Framework (WAF) | Cinq piliers pour une charge de travail, avec une liste de contrôle de revue de conception de la sécurité | Revoir ou concevoir une charge de travail |
| Plan de protection contre les rançongiciels | Trois étapes par ordre de priorité : préparer la récupération, limiter l'étendue des dégâts, rendre l'accès difficile | Que faire en premier contre les rançongiciels |

> **Conseil d'examen.** Le CAF travaille à l'échelle de l'organisation et de son patrimoine ; le WAF à l'échelle d'une charge de travail. Les MCRA montrent des capacités ; le MCSB énumère des contrôles.

<!-- section: confusing-pairs -->
## Les produits faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Gestion de la posture de Defender for Cloud (CSPM) | Protection des charges de travail de Defender for Cloud | Évalue les configurations et recommande des corrections ; détecte les attaques contre les serveurs, conteneurs, bases de données, le stockage et les services d'IA, et alerte |
| Degré de sécurisation de Defender for Cloud (secure score) | Degré de sécurisation Microsoft (Microsoft Secure Score) | Posture des ressources Azure, AWS et GCP ; posture de Microsoft 365, des identités, des appareils et des applications dans le portail Defender |
| Privileged Identity Management (PIM) | Gestion des droits d'utilisation / révisions d'accès | Activation juste-à-temps des rôles privilégiés ; packages d'accès avec demande, approbation et expiration ; recertification périodique des accès existants |
| Microsoft Sentinel | Microsoft Defender XDR | SIEM et SOAR pour toute source de données ; détection et réponse corrélées sur les produits Microsoft Defender |
| Microsoft Entra Internet Access | Microsoft Entra Private Access | Passerelle web sécurisée pour le trafic internet et SaaS ; accès aux applications privées sans VPN |
| Azure Policy | Conformité réglementaire de Defender for Cloud / Microsoft Purview Compliance Manager | Impose ou audite la configuration des ressources ; évalue Azure, AWS et GCP par rapport à des normes ; évalue la conformité de Microsoft 365 avec des actions d'amélioration |
| Microsoft Defender for IoT | Microsoft Defender External Attack Surface Management (EASM) | Découvre et surveille les appareils OT et IoT dans vos réseaux ; découvre vos ressources exposées sur internet depuis l'extérieur |
| Identité de charge de travail | Identité d'agent | Identité d'une application ou d'un service (principal de service, identité managée) ; identité d'un agent d'IA dans Microsoft Entra Agent ID |
| Security Exposure Management | Defender for Cloud | Exposition unifiée sur les points de terminaison, les identités, le cloud et la surface externe, avec chemins d'attaque et points de contention ; posture et protection des charges de travail cloud |
| Sauvegarde Azure | Azure Site Recovery | Restaure des données à un point dans le temps ; réplique des machines pour basculer rapidement |
| Azure Web Application Firewall | Azure Well-Architected Framework | Un service de protection de couche 7 ; un framework de conception. Les deux s'abrègent WAF |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : les frameworks du premier domaine donnent le vocabulaire de toutes les recommandations suivantes.
2. Pour chaque framework, écrivez en une phrase à quoi il sert et à quelle question il répond, puis comparez avec le tableau ci-dessus.
3. Pour chaque paire de produits, écrivez l'exigence qui vous ferait choisir chaque option.
4. Entraînez-vous sur les études de cas : lisez d'abord les questions, puis cherchez dans les onglets l'exigence dont dépend chaque question.
5. Après chaque domaine, passez un examen blanc, lisez chaque explication et relisez les sections liées à vos erreurs.
6. Réservez l'examen réel quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
