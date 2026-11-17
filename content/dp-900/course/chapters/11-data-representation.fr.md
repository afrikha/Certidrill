Les données sont une collection de faits (nombres, descriptions, observations) qui servent à enregistrer des informations. L'examen vous donne un exemple de données et attend que vous le classiez comme données structurées, semi-structurées ou non structurées, en sachant ce que chaque catégorie implique.

<!-- section: structured-data | objectives: 1.1.1 -->
## Les données structurées

Les données décrivent des **entités**, c'est-à-dire ce qu'une organisation veut suivre (clients, produits, commandes), au moyen de leurs **attributs** (le nom, l'adresse, le numéro de téléphone d'un client).

Les **données structurées** respectent un **schéma fixe** : tous les enregistrements ont les mêmes champs. Le schéma est le plus souvent **tabulaire** : chaque **ligne** est une instance de l'entité et chaque **colonne** est un attribut.

| CustomerID | FirstName | LastName | City |
| --- | --- | --- | --- |
| 1 | Ana | Ruiz | Lisbon |
| 2 | Kenji | Sato | Osaka |
| 3 | Lea | Martin | Lyon |

- Toutes les lignes ont les mêmes colonnes, et chaque colonne contient un seul genre de valeur (texte, nombre, date).
- Les données structurées sont en général stockées dans une **base de données relationnelle**, où plusieurs tables se référencent par des valeurs de clé.
- Comme la forme est connue à l'avance, les données sont faciles à filtrer, trier et agréger en SQL.

Exemples types : les comptes et les transactions d'une banque, un inventaire, les commandes d'une boutique en ligne, une feuille de calcul dont toutes les lignes ont les mêmes colonnes.

<!-- section: semi-structured-data | objectives: 1.1.2 -->
## Les données semi-structurées

Les **données semi-structurées** ont une certaine structure, mais cette structure peut **varier d'une instance de l'entité à l'autre**. Un client a deux numéros de téléphone et une adresse e-mail, un autre n'a qu'une adresse e-mail, un troisième a un champ supplémentaire que les autres n'ont pas.

Le format le plus courant est **JavaScript Object Notation (JSON)** :

```json
[
  {
    "id": 1,
    "name": "Ana Ruiz",
    "contacts": [
      { "type": "email", "value": "ana@contoso.com" },
      { "type": "mobile", "value": "555-0101" }
    ]
  },
  {
    "id": 2,
    "name": "Kenji Sato",
    "company": "Fabrikam",
    "contacts": [
      { "type": "email", "value": "kenji@fabrikam.com" }
    ]
  }
]
```

- Chaque élément porte les **noms de ses champs** avec leurs valeurs : deux éléments de la même collection n'ont donc pas besoin d'avoir les mêmes champs.
- Un champ peut contenir un autre objet (imbrication) ou une liste de valeurs, ce qu'une ligne de table ne peut pas faire.
- JSON n'est qu'une façon de représenter des données semi-structurées ; la catégorie se définit par la structure souple, pas par le format.
- Les données semi-structurées sont en général conservées dans des fichiers ou dans une base de données non relationnelle qui stocke des documents.

> **Piège d'examen.** Semi-structuré ne veut pas dire non structuré. Un document JSON a des champs nommés : il a une structure, mais elle n'est pas fixe. Si la question précise que les champs diffèrent d'un élément à l'autre, la réponse est « semi-structurées ».

<!-- section: unstructured-data | objectives: 1.1.3 -->
## Les données non structurées

Les **données non structurées** n'ont **aucune structure spécifique** : il n'y a pas de champs qu'un programme pourrait lire sans interpréter le contenu.

- Exemples : documents, images, enregistrements audio et vidéo, fichiers binaires.
- Elles sont stockées sous forme de fichiers ; dans Azure, les grandes quantités de données non structurées vont dans le **Stockage Blob Azure**.
- Pour les filtrer ou les agréger, il faut d'abord analyser le contenu (par exemple extraire le texte d'une facture numérisée).

Microsoft Learn mentionne aussi les **données vectorielles**, ou *incorporations* (embeddings) : une représentation numérique d'un contenu tel qu'un texte ou une image, que les applications d'IA utilisent pour trouver des contenus de sens proche.

> **Piège d'examen.** Un document texte, un contrat PDF ou la pièce jointe d'un e-mail contient des mots lisibles, et pourtant ce sont des données non structurées : rien ne découpe le contenu en champs identiques pour tous les éléments.

<!-- section: classifying-data | objectives: 1.1.1, 1.1.2, 1.1.3 -->
## Classer un exemple

| Catégorie | Schéma | Forme type | Magasin type |
| --- | --- | --- | --- |
| Structurées | Fixe : les mêmes champs pour tous les enregistrements | Tables de lignes et de colonnes | Base de données relationnelle |
| Semi-structurées | Souple : les champs peuvent varier d'un élément à l'autre | Documents JSON | Fichiers, base de données de documents |
| Non structurées | Aucun | Documents, images, audio, vidéo, fichiers binaires | Stockage de fichiers ou d'objets blob |

| Exemple dans la question | Catégorie |
| --- | --- |
| Une table de transactions bancaires avec les colonnes date, compte et montant | Structurées |
| Une liste de produits où chaque produit a les mêmes cinq attributs | Structurées |
| Un catalogue de produits JSON où chaque produit a son propre jeu d'attributs | Semi-structurées |
| Des profils de clients dont les coordonnées diffèrent d'un client à l'autre | Semi-structurées |
| Des photos de produits et des vidéos promotionnelles | Non structurées |
| Des enregistrements d'appels à un centre de support | Non structurées |
| Des contrats numérisés stockés en fichiers PDF | Non structurées |

> **Conseil d'examen.** Posez-vous une seule question : tous les éléments ont-ils les mêmes champs ? Oui : structurées. Des champs existent mais varient : semi-structurées. Aucun champ : non structurées.

<!-- section: key-points -->
## Points clés

- Les entités sont décrites par des attributs ; une ligne est une instance d'une entité, une colonne est un attribut.
- Structurées : schéma fixe, tabulaire, mêmes champs pour tous les enregistrements, en général dans une base de données relationnelle.
- Semi-structurées : une structure qui varie d'un élément à l'autre ; JSON est le format courant.
- Non structurées : aucune structure spécifique ; documents, images, audio, vidéo, fichiers binaires.
- JSON n'est pas non structuré, et un document texte n'est pas structuré.
