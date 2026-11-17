Une charge de travail de données est soit transactionnelle (elle enregistre ce que fait l'entreprise, au moment où cela se produit), soit analytique (elle lit ce qui a été enregistré pour comprendre l'activité). L'examen donne une courte description et demande de laquelle il s'agit, ou quelle propriété désigne un terme comme ACID ou OLTP.

<!-- section: transactional-workloads | objectives: 1.3.1 -->
## Les charges de travail transactionnelles

Une **transaction** est une petite unité de travail distincte : un paiement, un virement, une commande, la réservation d'une place. Un **système transactionnel** enregistre ces événements ; le travail qu'il effectue s'appelle le **traitement transactionnel en ligne (OLTP)**.

- Le volume est souvent élevé (parfois des millions de transactions par jour) et chaque opération doit être rapide.
- La base de données est optimisée pour **les lectures comme pour les écritures**.
- Les opérations sont de type **CRUD** : créer, récupérer, mettre à jour et supprimer des enregistrements.
- Les systèmes OLTP soutiennent les **applications métier (LOB)** qui font fonctionner l'organisation : point de vente, banque, réservation, saisie de commandes.
- Les opérations sont appliquées de **façon transactionnelle**, ce qui protège l'intégrité des données. Cette garantie se résume par les quatre propriétés **ACID**.

Exemple : un virement de 200 du compte A (solde 1 000) vers le compte B (solde 500).

| Propriété | Signification | Dans l'exemple |
| --- | --- | --- |
| **Atomicité** | Une transaction est une unité unique qui réussit entièrement ou échoue entièrement | Le débit de A et le crédit de B ont lieu tous les deux, ou aucun des deux |
| **Cohérence** | Une transaction fait passer la base de données d'un état valide à un autre état valide | Après le virement, A contient 800 et B contient 700 : aucun argent n'est apparu ni n'a disparu |
| **Isolation** | Les transactions simultanées n'interfèrent pas les unes avec les autres | Celui qui lit les soldes pendant le virement voit les deux anciennes valeurs ou les deux nouvelles, jamais un mélange |
| **Durabilité** | Une fois validée, une transaction reste validée | Les nouveaux soldes survivent à un arrêt et à un redémarrage du système de base de données |

> **Piège d'examen.** L'atomicité, c'est « tout ou rien » ; la durabilité, c'est « les modifications validées ne sont jamais perdues ». Une affirmation sur une coupure de courant après la validation teste la durabilité, pas l'atomicité.

<!-- section: analytical-workloads | objectives: 1.3.2 -->
## Les charges de travail analytiques

Le traitement analytique utilise des systèmes **en lecture seule ou principalement en lecture**, qui contiennent de grands volumes de **données historiques** ou de métriques métier. L'analyse s'appuie sur un instantané des données à un moment donné, ou sur une série d'instantanés. Son but est de répondre à des questions comme « comment les ventes ont-elles évolué par région sur trois ans ? ».

Une solution analytique type fonctionne en quatre étapes :

1. **Ingérer.** Les données des systèmes opérationnels sont extraites, transformées et chargées (ETL), ou extraites, chargées puis transformées (ELT), dans un lac de données.
2. **Structurer.** Les données sont chargées dans un schéma de tables, dans un data lakehouse ou dans un entrepôt de données.
3. **Agréger.** Les données peuvent être agrégées dans un **modèle sémantique** (historiquement un modèle OLAP, ou *cube*) : des **mesures** numériques sont calculées selon des **dimensions**, par exemple le chiffre d'affaires par date, client et produit.
4. **Consommer.** Le lac, l'entrepôt et le modèle sont interrogés pour produire des rapports, des visualisations et des tableaux de bord.

| Magasin | Ce que c'est |
| --- | --- |
| **Lac de données** | Stockage à base de fichiers pour collecter et analyser de très grands volumes de données |
| **Entrepôt de données** | Schéma relationnel et moteur SQL, optimisés pour les opérations de lecture |
| **Data lakehouse** | Combine le stockage souple et scalable d'un lac avec la sémantique de requête relationnelle d'un entrepôt |
| **Modèle sémantique** | Données préagrégées qui permettent de monter et de descendre dans les niveaux (région, ville, adresse) avec des requêtes de synthèse rapides |

Chaque public utilise une couche différente :

| Qui | Travaille avec | Pour faire quoi |
| --- | --- | --- |
| Scientifiques des données | Les fichiers de données du lac de données | Explorer et modéliser les données |
| Analystes de données | Les tables de l'entrepôt de données | Produire des rapports et des visualisations |
| Utilisateurs professionnels | Les données agrégées d'un modèle sémantique | Consommer des rapports et des tableaux de bord |

Les schémas analytiques peuvent **dénormaliser** les données issues des systèmes OLTP : on accepte une certaine duplication pour que les requêtes s'exécutent plus vite.

<!-- section: comparing-workloads | objectives: 1.3.1, 1.3.2 -->
## Distinguer les deux charges de travail

| Aspect | Transactionnelle (OLTP) | Analytique |
| --- | --- | --- |
| But | Enregistrer les événements métier au moment où ils se produisent | Comprendre l'activité à partir des données enregistrées |
| Opérations | Nombreuses petites lectures et écritures (CRUD) | Surtout des lectures, souvent sur un très grand nombre de lignes |
| Données | Actuelles, détaillées, une ligne par événement | Historiques, souvent agrégées, instantanés |
| Garantie | Transactions ACID | Requêtes rapides sur de grands volumes |
| Conception | Optimisée pour les lectures et les écritures | Optimisée pour les lectures ; peut être dénormalisée |
| Utilisateurs | Les applications métier et leurs utilisateurs | Scientifiques des données, analystes de données, utilisateurs professionnels |

| Scénario dans la question | Charge de travail |
| --- | --- |
| Une application de point de vente enregistre chaque achat | Transactionnelle |
| Une banque déplace de l'argent entre deux comptes | Transactionnelle |
| Un site web met à jour le niveau de stock quand une commande est passée | Transactionnelle |
| Un tableau de bord affiche le chiffre d'affaires mensuel par gamme de produits sur cinq ans | Analytique |
| Un analyste recherche des tendances saisonnières dans les ventes | Analytique |
| Un traitement nocturne copie les commandes du jour dans un entrepôt de données | Analytique (étape d'ingestion) |

> **Piège d'examen.** OLTP et OLAP ne diffèrent que d'une lettre. OL**T**P est le traitement transactionnel ; OL**A**P est analytique. Un système analytique n'enregistre pas les transactions : il reçoit une copie des données produites par les systèmes transactionnels.

> **Conseil d'examen.** « Lecture et écriture », « intégrité », « ACID », « application métier » désignent le transactionnel. « Historique », « agréger », « tendances », « rapports », « lecture seule » désignent l'analytique.

<!-- section: key-points -->
## Points clés

- Transaction : une petite unité de travail distincte. OLTP : volume élevé, rapide, optimisé pour les lectures et les écritures, opérations CRUD.
- ACID : atomicité (tout ou rien), cohérence (d'un état valide à un état valide), isolation (pas d'interférence), durabilité (ce qui est validé le reste).
- Analytique : lecture seule ou principalement en lecture, données historiques, instantanés, rapports et tableaux de bord.
- Étapes analytiques : ingérer (ETL ou ELT), structurer (lakehouse ou entrepôt), agréger (modèle sémantique), consommer.
- Les scientifiques des données utilisent le lac, les analystes de données l'entrepôt, les utilisateurs professionnels le modèle sémantique.
