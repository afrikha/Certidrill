L'AZ-120 vérifie que vous savez planifier, construire et exploiter des paysages SAP sur Azure : dimensionner et migrer des systèmes SAP, concevoir le calcul, le réseau et le stockage sous-jacents, les rendre hautement disponibles et récupérables, et les garder rapides, économiques et supervisés. Il suppose que vous connaissez déjà SAP (HANA, NetWeaver, Business Suite) et Azure au niveau administrateur ; les questions portent sur ce qu'Azure pour SAP change. Ce cours suit le guide d'étude officiel objectif par objectif ; chaque section indique les objectifs qu'elle prépare.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Examen et certification | AZ-120, Planning and Administering Azure for SAP Workloads ; Microsoft Certified: Azure for SAP Workloads Specialty |
| Prérequis | Aucun officiellement ; Microsoft recommande fortement la certification Azure Administrator Associate |
| Durée | 100 minutes d'examen |
| Questions | Nombre non publié ; environ 45 à 58 en pratique ; l'examen « peut comporter des composants interactifs » |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft documente l'accès à Microsoft Learn pendant les examens de niveau associé et expert ; il ne le précise pas pour les examens de spécialité. Préparez-vous comme pour un examen sans documents |
| Langues | Anglais, japonais, chinois (simplifié), français, allemand, espagnol, portugais (Brésil) ; 30 minutes supplémentaires peuvent être demandées si votre langue n'est pas proposée |
| Validité | Un an, renouvelée gratuitement par une évaluation en ligne sur Microsoft Learn |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Migrer des charges de travail SAP vers Azure | 25 à 30 % |
| Concevoir et implémenter une infrastructure pour prendre en charge les charges de travail SAP sur Azure | 25 à 30 % |
| Concevoir et implémenter la haute disponibilité et la récupération d'urgence (HADR) | 20 à 25 % |
| Assurer la maintenance des charges de travail SAP sur Azure | 20 à 25 % |

Le score est mis à l'échelle : 700 ne veut pas dire 70 % des questions. Les questions composées de plusieurs éléments (listes déroulantes, affirmations Oui/Non, glisser-déposer, étapes à ordonner) rapportent un point par élément correct.

Un examen se compose de sections :

- **Étude de cas.** Un paysage SAP à migrer ou à reconcevoir, décrit en onglets (présentation, environnement existant, exigences : SAPS et mémoire, RPO et RTO, réseau, système d'exploitation), suivi de plusieurs questions. Une fois l'étude de cas quittée, vous ne pouvez plus y revenir.
- **Série Oui/Non.** Le même scénario est répété avec une solution différente à chaque fois ; vous dites si la solution atteint l'objectif. Chaque réponse est définitive. Plusieurs solutions peuvent convenir, ou aucune.
- **Section principale.** Des questions indépendantes que vous pouvez marquer et revoir : une réponse parmi quatre (le format le plus fréquent), des listes déroulantes à deux ou trois sélections (un choix de conception et un paramètre), des affirmations Oui/Non, « sélectionnez deux réponses », des glisser-déposer (composant vers couche, outil vers tâche) et quelques procédures à ordonner (mise en place d'un cluster, déploiement automatisé).

Il y a peu de code : au plus une commande `az` ou PowerShell, un fragment Bicep ou une ligne Pacemaker à compléter.

L'examen est surveillé et se réserve auprès de Pearson VUE. Microsoft recommande de s'inscrire avec un compte Microsoft personnel plutôt qu'un compte professionnel, pour que votre historique de certification vous suive si vous changez d'employeur. Après un premier échec, vous pouvez repasser l'examen 24 heures plus tard ; les délais des tentatives suivantes varient. L'Exam Sandbox montre les formats de questions dans l'interface réelle de l'examen avant le jour J.

<!-- section: reading-questions -->
## Lire une question

L'AZ-120 est d'abord un examen de conception, ensuite de configuration. Un énoncé type compte trois à six phrases : une entreprise comme Contoso exécute SAP ERP en local, un tableau des systèmes avec leur base de données, leur OS, leur mémoire et leurs SAPS, puis les contraintes qui décident de la réponse, et « Vous devez recommander... », « Que devez-vous inclure dans la conception ? » ou « Quel stockage devez-vous utiliser ? ».

Procédez dans cet ordre :

1. Lisez la dernière phrase : quelle couche est demandée (taille de machine virtuelle, stockage, réseau, cluster, sauvegarde, supervision) ?
2. Notez la **base de données** (HANA, SQL Server, Oracle, Db2, ASE), le **système d'exploitation** (SLES, RHEL, Windows, Oracle Linux) et s'il s'agit de **production** : ils décident de ce qui est certifié et pris en charge.
3. Relevez les chiffres : SAPS, mémoire, IOPS, RPO, RTO, latence.
4. Éliminez toute option non prise en charge pour SAP, même si elle fonctionnerait techniquement ; puis choisissez l'option prise en charge la moins chère qui respecte tous les chiffres.

| Mots de l'énoncé | Pensez à |
| --- | --- |
| « certifié pour SAP HANA en production » | Une machine virtuelle du répertoire matériel SAP HANA |
| « SAPS de chaque taille de machine virtuelle » | La note SAP 1928533 |
| « machine virtuelle de série M, SSD Premium, volume de journal HANA » | L'Accélérateur d'écriture sur /hana/log |
| « latence entre serveurs d'applications et base de données » | Même réseau virtuel, pas de NVA entre les deux, Accelerated Networking ; groupe de placement de proximité seulement si elle reste trop élevée |
| « HANA hautement disponible dans une région » | HANA System Replication (synchrone) avec un cluster Pacemaker réparti sur des zones |
| « clôture » (fencing) sous Linux | Agent de clôture Azure (Azure fence agent) ou SBD |
| « reprise d'activité de la base de données dans une autre région » | Réplication native asynchrone (HSR, Always On, Data Guard), pas Site Recovery |
| « reprise d'activité des serveurs d'applications » | Azure Site Recovery |
| « déploiement guidé de S/4HANA », « démarrer et arrêter des systèmes SAP depuis Azure » | Le Centre Azure pour les solutions SAP |
| « open source, Terraform et Ansible, déploiements reproductibles » | SAP Deployment Automation Framework |
| « superviser les métriques HANA, NetWeaver et Pacemaker dans Azure » | Azure Monitor pour solutions SAP |
| « S/4HANA exploité par SAP dans l'abonnement Azure de SAP » | RISE with SAP : peering de réseaux virtuels, aucun accès aux machines virtuelles de SAP |

> **Piège d'examen.** « Pris en charge » l'emporte sur « fonctionne ». Une NVA entre application et base de données, Azure Site Recovery pour une machine virtuelle HANA, ou une taille absente de la note SAP 1928533 peuvent tous fonctionner, et sont tous de mauvaises réponses.

<!-- section: confusing-pairs -->
## Les options faciles à confondre

Les choix de réponse viennent de la même famille de produits. Retenez la différence en une ligne :

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Stockage bloc pour HANA | SSD Premium, SSD Premium v2, Disque Ultra | Le SSD Premium exige l'Accélérateur d'écriture pour /hana/log sur la série M ; le SSD Premium v2 et le Disque Ultra atteignent la latence sans lui et ne fonctionnent pas avec les groupes à haute disponibilité |
| Stockage de fichiers partagé | Azure NetApp Files, Azure Files | Azure NetApp Files peut porter les données et le journal HANA en NFS 4.1 ; Azure Files SSD sert /sapmnt et les répertoires de transport, jamais des fichiers de SGBD |
| Placement des machines virtuelles | Groupe à haute disponibilité, zone de disponibilité, groupe de placement de proximité | Domaines d'erreur et de mise à jour dans un centre de données ; centres de données distincts dans une région ; proximité physique pour la latence, jamais pour la résilience |
| Clôture Linux | Agent de clôture Azure, SBD | L'agent de clôture appelle l'API Azure avec une identité managée ; SBD utilise des périphériques bloc partagés (serveurs cibles iSCSI ou disque partagé Azure) |
| Protection de la base de données | HANA System Replication, Azure Site Recovery, Sauvegarde Azure, instantanés | HSR réplique la base pour la haute disponibilité ou la reprise ; Site Recovery réplique des machines virtuelles (couche application uniquement) ; Sauvegarde Azure conserve des points de restauration ; les instantanés sont des copies rapides au niveau du stockage |
| Déploiement | SAP Deployment Automation Framework, Centre Azure pour les solutions SAP, Bicep | Un framework open source que vous exécutez et personnalisez ; un service Azure managé avec déploiement guidé et gestion ; de l'infrastructure as code générale |
| Supervision | Azure Monitor pour solutions SAP, VM Insights, Network Watcher | Métriques applicatives SAP et HANA ; performances et dépendances des machines virtuelles ; diagnostics et flux réseau |
| Engagements de coût | Réservations, plans d'économies, réservations de capacité | Une remise pour une taille et une région ; une remise pour une dépense horaire sur toutes tailles et régions ; une capacité garantie au prix du paiement à l'utilisation |
| Outils de migration | SWPM, SUM DMO, DMO with System Move | Copie de système homogène ou hétérogène ; mise à niveau plus migration vers HANA ; DMO avec le déplacement du local vers Azure |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Commencez par le domaine de la migration : dimensionnement, scénarios pris en charge et notes SAP reviennent dans toutes les conceptions suivantes.
2. Apprenez les quatre listes dont dépendent la plupart des questions : les machines virtuelles certifiées SAP, la matrice de stockage par volume, ce qui est pris en charge ou non, et quelle réplication protège quelle couche.
3. Si vous le pouvez, déployez une petite disposition de type SAP dans un abonnement de bac à sable : deux machines virtuelles Linux dans deux zones, un équilibreur de charge interne Standard et un partage Azure NetApp Files ou Azure Files. Voir les paramètres rend les questions à listes déroulantes faciles.
4. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
5. Entraînez-vous sur des études de cas : lisez d'abord les questions, puis cherchez dans les onglets les chiffres et contraintes dont chaque question dépend.
6. Réservez l'examen réel quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
