Le DP-300 est l'examen de la certification Microsoft Certified: Azure Database Administrator Associate. Il s'adresse à l'administrateur qui déploie, sécurise, supervise, automatise et protège des bases de données SQL Server sur Azure : Azure SQL Database, Azure SQL Managed Instance, SQL Server sur les machines virtuelles Azure, et SQL Server hors d'Azure connecté via Azure Arc. Les questions sont opérationnelles : une instruction T-SQL, une commande `az` ou un paramètre du portail à choisir ou à compléter, et une contrainte (temps d'arrêt, coût, privilège minimum) qui départage plusieurs fonctionnalités réelles.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 100 minutes d'examen |
| Questions | Nombre non publié ; prévoyez environ 45 à 58 questions, dont une étude de cas et une série « la solution atteint-elle l'objectif ? » |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant les examens de niveau associé, sur le même chronomètre |
| Composants interactifs | Annoncés comme possibles par Microsoft (« you may have interactive components ») |
| Compétences mesurées | Guide d'étude daté du 27 octobre 2026 |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les cinq domaines :

| Domaine | Poids |
| --- | --- |
| Planifier et implémenter des ressources de plateforme de données | 15 à 20 % |
| Implémenter un environnement sécurisé | 20 à 25 % |
| Surveiller, configurer et optimiser les ressources de base de données | 20 à 25 % |
| Configurer et gérer l'automatisation des tâches | 15 à 20 % |
| Planifier et mettre en œuvre un environnement de haute disponibilité et de reprise après sinistre (HA/DR) | 20 à 25 % |

Formats attendus : une réponse parmi quatre ou cinq, plusieurs réponses (« chaque réponse correcte présente une partie de la solution »), fragments T-SQL ou de commandes avec des listes déroulantes, affirmations Oui/Non, glisser-déposer de fonctionnalités sur des exigences, et mise en ordre d'étapes. Dans une série « la solution atteint-elle l'objectif ? », le même scénario revient avec une solution différente à chaque fois, et vous ne pouvez pas revenir à une question précédente de la série. Les questions à plusieurs éléments rapportent en général un point par élément correct. La plupart des questions portent sur des fonctionnalités en disponibilité générale ; une fonctionnalité en préversion très utilisée peut apparaître.

Si l'examen n'existe pas dans votre langue, vous pouvez demander 30 minutes supplémentaires. Un examen échoué peut être repassé après 24 heures.

> **Conseil d'examen.** Microsoft Learn est ouvert pendant l'examen, mais chercher coûte des minutes. Servez-vous-en pour confirmer une valeur (une limite de rétention, un nom de paramètre), jamais pour apprendre un sujet.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases : « Vous avez une instance managée Azure SQL nommée MI1 qui héberge... Vous devez... La solution doit réduire le temps d'arrêt. » Identifiez d'abord l'**offre** (SQL Database, Managed Instance ou machine virtuelle : beaucoup de fonctionnalités n'existent que sur l'une d'elles), puis la **contrainte**.

| Mots de la question | Pensez à |
| --- | --- |
| « réduire le temps d'arrêt », « en ligne » | Une méthode en ligne : lien Managed Instance, Log Replay Service en mode continu, réplication transactionnelle, groupe de disponibilité |
| « réduire l'effort d'administration » | La fonctionnalité de la plateforme (PaaS, réglage automatique, groupe de basculement, sauvegarde intégrée) plutôt qu'un script ou une machine virtuelle |
| « réduire les coûts » | Le plus petit niveau qui satisfait toutes les exigences : serverless pour un usage intermittent, pool élastique pour beaucoup de petites bases, Azure Hybrid Benefit pour des licences existantes |
| « nécessite un accès au système d'exploitation », « fonctionnalité non prise en charge » | SQL Server sur les machines virtuelles Azure |
| « compatibilité proche de 100 % », « fonctionnalités au niveau de l'instance », « lift and shift » | Azure SQL Managed Instance |
| « principe des privilèges minimum » | Un utilisateur au niveau de la base et le rôle fixe ou personnalisé le plus restreint, pas `db_owner` ni l'administrateur du serveur |
| « RPO », « RTO », « si une région tombe » | Géoréplication, groupes de basculement, géorestauration : comparez durée de reprise et perte de données |
| « serveurs hors d'Azure », « en local », « autres clouds » | SQL Server activé par Azure Arc |

Lisez le code en entier. Dans une question à liste déroulante, les mots-clés autour du trou (`FROM EXTERNAL PROVIDER`, `WITH (ONLINE = ON)`, `TO URL`) excluent souvent la moitié des options.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Modèle DTU | Modèle vCore | Le DTU regroupe calcul, mémoire et E/S en tailles fixes ; le vCore laisse choisir vCores, matériel et stockage, et lui seul offre serverless, Hyperscale et Azure Hybrid Benefit |
| Base de données unique | Pool élastique | Un pool partage des ressources entre bases d'un même serveur dont les pics ne se chevauchent pas |
| Business Critical | Hyperscale | Business Critical : SSD local, OLTP en mémoire, un réplica lisible gratuit, jusqu'à 4 To ; Hyperscale : jusqu'à 128 To, mise à l'échelle rapide, réplicas nommés |
| Azure SQL Managed Instance | SQL Server sur les machines virtuelles Azure | Managed Instance est un PaaS presque entièrement compatible ; la machine virtuelle donne la parité complète et l'accès au système, mais vous appliquez les correctifs et sauvegardez |
| Partitionnement de table | Sharding | Le partitionnement découpe une table dans une seule base ; le sharding répartit les données sur plusieurs bases |
| Compression ROW / PAGE | Compression columnstore | ROW et PAGE compressent des données rowstore ; columnstore compresse par colonnes et convient à l'analytique |
| Log Replay Service | Lien Managed Instance | LRS restaure des fichiers de sauvegarde depuis le Stockage Blob, base hors ligne jusqu'au basculement ; le lien réplique en continu par un groupe de disponibilité distribué avec une cible lisible |
| SQL Server Agent | Travaux élastiques | SQL Server Agent fonctionne sur Managed Instance et les machines virtuelles ; Azure SQL Database utilise les travaux élastiques |
| Groupe de basculement | Géoréplication active | Un groupe de basculement bascule plusieurs bases avec des points de terminaison d'écouteur stables ; la géoréplication est par base, jusqu'à quatre secondaires, sans écouteur |
| Masquage dynamique des données | Always Encrypted | Le masquage cache des valeurs dans les résultats ; Always Encrypted chiffre côté client, le moteur ne voit jamais le texte en clair |
| Restauration à un point dans le temps | Rétention à long terme | La PITR couvre 1 à 35 jours ; la LTR conserve des sauvegardes complètes jusqu'à 10 ans |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : les choix de déploiement viennent d'abord, car chaque réponse ultérieure dépend de l'offre.
2. Pratiquez dans un abonnement : créez une base serverless, une petite instance managée si votre budget le permet (le déploiement prend du temps) et une machine virtuelle SQL Server à partir d'une image de la galerie. Exécutez le T-SQL de chaque chapitre.
3. Apprenez le code que vous aurez à compléter : `CREATE USER ... FROM EXTERNAL PROVIDER`, `ALTER DATABASE`, `BACKUP ... TO URL`, `CREATE PARTITION FUNCTION`, `ALTER INDEX ... REBUILD WITH (DATA_COMPRESSION = PAGE)`, les principales DMV et vues du Magasin des requêtes.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
