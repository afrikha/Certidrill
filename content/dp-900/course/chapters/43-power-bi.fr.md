Microsoft Power BI est la suite d'outils qui transforme des données en rapports et en tableaux de bord interactifs ; c'est une charge de travail principale de Microsoft Fabric. L'examen vous demande quel outil Power BI fait quoi, comment se construit un modèle de données analytique et quel visuel convient à un type de données.

<!-- section: power-bi-tools | objectives: 4.3.1 -->
## Outils et flux de travail Power BI

| Outil | Ce que c'est | Usage |
| --- | --- | --- |
| **Power BI Desktop** | Application Windows | Se connecter aux sources de données, transformer les données avec Power Query, construire le modèle de données, créer des rapports |
| **Service Power BI** | Service cloud, utilisé dans un navigateur web | Publier, partager et collaborer dans des espaces de travail ; planifier l'actualisation des données ; créer des tableaux de bord et des applications ; modification limitée des rapports |
| **Applications mobiles Power BI** | Applications pour téléphones et tablettes | Consulter les rapports et les tableaux de bord en déplacement |
| **Power BI Report Builder** | Outil de création | Créer des **rapports paginés** : des documents à la mise en forme précise, imprimables, comme des factures |
| **Power BI Report Server** | Serveur de rapports local | Conserver les rapports en local |

Le flux de travail type comporte trois étapes :

1. Un analyste importe et modélise les données dans **Power BI Desktop** et crée un rapport.
2. Le rapport et son modèle sont publiés dans le **service Power BI**, où les actualisations sont planifiées et le contenu partagé.
3. Les utilisateurs professionnels consultent les rapports, les tableaux de bord et les applications dans un navigateur ou dans l'application mobile.

Dans Microsoft Fabric, le contenu Power BI réside dans des **espaces de travail**, à côté des autres éléments Fabric. Copilot dans Power BI peut résumer un rapport, créer des pages de rapport et écrire du DAX à partir d'une description en langage naturel.

> **Piège d'examen.** La modélisation complète des données se fait dans Power BI Desktop. Le partage, l'actualisation planifiée et les tableaux de bord relèvent du service Power BI.

<!-- section: reports-dashboards | objectives: 4.3.1 -->
## Rapports, tableaux de bord et applications

| | Rapport | Tableau de bord |
| --- | --- | --- |
| **Pages** | Une ou plusieurs pages | Une seule page |
| **Source** | Un seul modèle sémantique | Des visuels épinglés depuis un ou plusieurs rapports |
| **Filtrage et découpage** | Oui | Non |
| **Alertes de données** | Non | Oui, sur les vignettes |
| **Créé dans** | Power BI Desktop ou le service Power BI | Le service Power BI uniquement |

- Une **vignette** est un visuel **épinglé** à un tableau de bord ; la sélectionner ouvre généralement le rapport dont elle provient.
- Une **application** regroupe des rapports et des tableaux de bord associés pour les distribuer à de nombreux utilisateurs en un seul endroit.
- Un **modèle sémantique** est l'ensemble des données, avec leurs relations et leurs calculs, sur lequel les rapports sont construits ; un même modèle peut servir plusieurs rapports.

<!-- section: data-models | objectives: 4.3.2 -->
## Modèles de données dans Power BI

Un modèle analytique, appelé **modèle sémantique** dans Power BI et Microsoft Fabric, est fait de tables liées. Il définit des **mesures**, les valeurs numériques à analyser, et des **dimensions**, les entités selon lesquelles les mesures sont agrégées.

| Élément | Description | Exemple |
| --- | --- | --- |
| **Table de faits** | Une ligne par événement enregistré, avec les valeurs numériques | Ventes : quantité, chiffre d'affaires |
| **Table de dimension** | Une ligne par entité, avec une clé unique et des attributs descriptifs | Produit, Client, Temps |
| **Relation** | Lien entre la clé d'une table de dimension et la colonne correspondante de la table de faits | Ventes vers Produit |
| **Mesure** | Calcul agrégé au moment de la requête, écrit en DAX (Data Analysis Expressions) | Chiffre d'affaires total |
| **Hiérarchie** | Niveaux d'une dimension, pour explorer vers le haut ou vers le bas (drill up, drill down) les valeurs agrégées | Année, mois, jour |

- Une table de faits liée à ses tables de dimension forme un **schéma en étoile**. Quand une dimension est elle-même liée à des tables plus détaillées (Produit vers Catégorie), le schéma est **en flocon de neige**.
- La plupart des modèles comprennent une dimension de **temps**, pour agréger par jour, par mois ou par année.
- La **vue Modèle** de Power BI Desktop est l'endroit où vous créez les relations et les hiérarchies et définissez les types de données et les formats d'affichage.

| Mode de stockage | Où sont les données | À retenir |
| --- | --- | --- |
| **Import** | Copiées dans le modèle, en mémoire | Requêtes rapides ; les données ne sont pas plus récentes que la dernière actualisation |
| **DirectQuery** | Laissées dans la source ; chaque requête lui est envoyée | Pas d'actualisation planifiée ; données à jour ; pour des volumes trop gros à importer |
| **Direct Lake** | Tables Delta dans OneLake, chargées directement en mémoire | La vitesse de la mémoire sans copier les données dans le modèle ; Microsoft Fabric |

> **Conseil d'examen.** Les nombres à additionner sont dans la table de faits ; les mots qui suivent « par » (par produit, par mois, par ville) sont des dimensions.

<!-- section: visualizations | objectives: 4.3.3 -->
## Choisir une visualisation

| Vous voulez | Visuel |
| --- | --- |
| Afficher de nombreuses valeurs exactes et liées, en lignes et en colonnes | **Table** |
| Résumer des valeurs selon plusieurs dimensions, en lignes et en colonnes | **Matrice** |
| Mettre en avant un chiffre important, comme le chiffre d'affaires total | **Carte** (card) |
| Montrer la progression vers un objectif | **Indicateur de performance clé (KPI)** ou **jauge** |
| Comparer des valeurs numériques pour des catégories discrètes | **Graphique à barres** ou **histogramme** (column chart) |
| Montrer une tendance, en général dans le temps | **Graphique en courbes** |
| Comparer les parts d'un total, avec peu de catégories | **Graphique en secteurs** ou **graphique en anneau** |
| Montrer les proportions de données hiérarchiques sous forme de rectangles imbriqués | **Treemap** (graphique de compartimentage) |
| Trouver une relation ou une corrélation entre deux mesures numériques | **Nuage de points** |
| Comparer des valeurs entre des zones géographiques | **Carte géographique** (map) |
| Suivre les étapes d'un processus, comme un pipeline de ventes | **Graphique en entonnoir** |
| Expliquer comment des variations positives et négatives mènent d'une valeur initiale à un total | **Graphique en cascade** |
| Laisser les utilisateurs filtrer la page depuis le canevas du rapport | **Segment** (slicer) |
| Trouver les facteurs qui influencent une métrique | **Influenceurs clés** |

Les visuels d'une page de rapport sont liés : sélectionner une catégorie dans un visuel **filtre ou met en surbrillance** les autres. Power BI peut être étendu avec des visuels personnalisés.

> **Piège d'examen.** Une tendance dans le temps appelle un graphique en courbes, pas un graphique en secteurs ; une corrélation entre deux mesures appelle un nuage de points, pas un graphique à barres.

<!-- section: key-points -->
## Points clés

- Power BI Desktop : modéliser et créer des rapports. Service Power BI : publier, partager, actualiser, tableaux de bord, applications. Applications mobiles : consulter.
- Les rapports paginés se créent avec Power BI Report Builder.
- Rapport : plusieurs pages, un modèle sémantique, des filtres. Tableau de bord : une page de vignettes épinglées, des alertes, pas de filtrage.
- Modèle sémantique : tables de faits, tables de dimension, relations, mesures en DAX, hiérarchies ; schéma en étoile.
- Import copie les données ; DirectQuery interroge la source ; Direct Lake lit les tables Delta dans OneLake.
- Courbes : tendance. Barres ou histogramme : comparaison de catégories. Secteurs : parts d'un total. Nuage de points : corrélation. Carte géographique : géographie. Carte : un chiffre. Table et matrice : valeurs détaillées.
