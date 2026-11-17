Le DP-900 vérifie que vous comprenez les concepts de base des données et que vous savez associer un besoin au bon service de données Azure. Il ne vous demande de rien construire : chaque question revient à reconnaître un type de données, une charge de travail, un rôle, une instruction SQL ou un service.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 45 minutes d'examen |
| Questions | Nombre non publié ; environ 35 à 45 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Sans documents : Microsoft Learn n'est pas accessible pendant les examens de niveau fondamentaux |
| Validité | N'expire pas |
| Prérequis | Aucun |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Décrire les concepts de base des données | 25 à 30 % |
| Identifier les points à prendre en compte pour les données relationnelles sur Azure | 20 à 25 % |
| Décrire les points à prendre en compte pour l'utilisation de données non relationnelles sur Azure | 15 à 20 % |
| Décrire une charge de travail analytique | 25 à 30 % |

Formats de questions : une réponse parmi plusieurs, plusieurs réponses (« sélectionnez deux réponses »), séries de trois affirmations Oui/Non, phrases à compléter avec une liste déroulante, et associations par glisser-déposer. Il n'y a ni étude de cas ni laboratoire. Les questions à plusieurs éléments rapportent un point par élément correct.

Le seul code est du SQL élémentaire : vous devez reconnaître ce que fait une instruction et à quelle famille elle appartient. Il n'y a ni ligne de commande ni procédure dans le portail.

<!-- section: reading-questions -->
## Lire une question

Les énoncés sont courts : une à trois phrases qui décrivent des données, un besoin ou une tâche. Entraînez-vous à transformer la phrase en mot-clé :

| Mots de la question | Pensez à |
| --- | --- |
| « schéma fixe », « lignes et colonnes », « chaque enregistrement a les mêmes champs » | Données structurées, base de données relationnelle |
| « documents JSON dont les champs varient d'un élément à l'autre » | Données semi-structurées |
| « images, vidéos, sons, documents numérisés » | Données non structurées, Stockage Blob Azure |
| « enregistre chaque vente au moment où elle a lieu », « nombreuses petites lectures et écritures » | Charge de travail transactionnelle (OLTP) |
| « données historiques », « tendances », « rapports et tableaux de bord » | Charge de travail analytique |
| « sauvegarde, restaure, accorde les accès » | Administrateur de base de données |
| « construit des pipelines », « ingère, nettoie et transforme » | Ingénieur de données |
| « explore les données », « crée des rapports et des visualisations » | Analyste de données |
| « réduire les données dupliquées dans les tables » | Normalisation |
| « nouvelle application cloud, le moins d'administration possible » | Azure SQL Database |
| « migrer SQL Server avec un minimum de modifications » | Azure SQL Managed Instance |
| « contrôle total du système d'exploitation » | SQL Server sur Machines Virtuelles Azure |
| « partage de fichiers monté par plusieurs ordinateurs » | Azure Files |
| « éléments clé/valeur, NoSQL, dans un compte de stockage » | Stockage Table Azure |

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Données semi-structurées | Données non structurées | Les données semi-structurées ont des champs, mais ils varient d'un élément à l'autre (JSON) ; les données non structurées n'ont aucun champ (image, vidéo, document) |
| Charge de travail transactionnelle | Charge de travail analytique | La première enregistre les événements métier avec des lectures et des écritures rapides ; la seconde lit de grands volumes de données historiques pour produire des rapports |
| Administrateur de base de données | Ingénieur de données | L'administrateur maintient les bases de données disponibles, sécurisées et sauvegardées ; l'ingénieur déplace et transforme les données entre les systèmes |
| Ingénieur de données | Analyste de données | L'ingénieur prépare les données ; l'analyste les explore et en tire des rapports et des visualisations |
| DDL | DML | Le DDL définit les objets (`CREATE`, `ALTER`, `DROP`) ; le DML agit sur les lignes (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) |
| `DELETE` | `DROP` | `DELETE` supprime des lignes d'une table ; `DROP` supprime la table elle-même |
| Vue | Index | Une vue est une requête enregistrée, utilisée comme une table virtuelle ; un index accélère les recherches sur une colonne |
| Azure SQL Database | Azure SQL Managed Instance | Les deux sont PaaS ; SQL Database vise les nouvelles applications cloud, Managed Instance offre une compatibilité proche de 100 % avec SQL Server pour les migrations |
| Azure SQL Managed Instance | SQL Server sur Machines Virtuelles Azure | Managed Instance est PaaS (Azure applique les correctifs et sauvegarde) ; la machine virtuelle est IaaS (vous gérez tout, système d'exploitation compris) |
| Stockage Blob Azure | Azure Files | Le Stockage Blob contient des objets lus par une API ; Azure Files fournit des partages de fichiers réseau en SMB ou NFS |
| Stockage Table Azure | Table relationnelle | Une table du Stockage Table contient des lignes clé/valeur dont les colonnes varient, sans clé étrangère, sans jointure et sans procédure stockée |
| Lac de données | Entrepôt de données | Un lac de données stocke des fichiers de tout format ; un entrepôt de données stocke les données dans des tables relationnelles optimisées pour les requêtes |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre ; chacun est court et s'appuie sur le vocabulaire des précédents.
2. Créez un compte Azure gratuit et regardez un compte de stockage et une base de données Azure SQL dans le portail : voir des conteneurs, des partages de fichiers, des tables et un éditeur de requêtes rend le vocabulaire concret.
3. Après chaque domaine, passez un examen blanc et relisez les sections liées à vos erreurs.
4. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
