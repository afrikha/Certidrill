AWS fournit à chaque client des outils gratuits pour estimer, suivre, analyser et répartir les dépenses. Les questions d'examen décrivent un besoin (« estimer avant de déployer », « alerter quand la prévision dépasse 1 000 USD », « voir les coûts du dernier trimestre par service », « refacturer à chaque service de l'entreprise ses ressources », « une seule facture pour tous les comptes ») et demandent l'outil ou la fonctionnalité qui y répond.

<!-- section: billing-support | objectives: 4.2.1 -->
## Assistance et informations sur la facturation

- La **console AWS Billing and Cost Management** affiche les factures (frais par service et par Région, factures, paiements), les moyens de paiement, les crédits et les outils de gestion des coûts.
- Le **support compte et facturation** est inclus pour tous les clients, dans tous les plans Support, Basic compris : ouvrez une demande de facturation dans l'**AWS Support Center** pour une question sur un frais, une facture ou un paiement.
- **AWS Cost Anomaly Detection** utilise l'apprentissage automatique pour détecter les dépenses inhabituelles et envoyer des alertes.
- L'accès aux données de facturation est contrôlé par des politiques IAM ; l'utilisateur root peut activer l'accès IAM à la console de facturation.

> **Conseil d'examen.** Une question de facturation n'exige jamais de plan Support payant. « Obtenir de l'aide sans frais sur un frais inattendu » relève du support compte et facturation via le Support Center.

<!-- section: pricing-information | objectives: 4.2.2 -->
## Informations sur la tarification des services AWS

| Source | Usage |
| --- | --- |
| **Pages de tarification** de chaque service sur aws.amazon.com | Prix publics par Région, dimensions de tarification, détails de l'offre gratuite |
| **AWS Pricing Calculator** | Estimer le coût d'une architecture prévue (voir plus bas) |
| **AWS Price List API** | Interroger les prix AWS par programme, ou télécharger les listes de prix en masse |
| **AWS Free Tier** | Essayer des services sans frais : crédits pour les nouveaux clients (100 USD, et jusqu'à 100 USD de plus en réalisant des activités), un plan de compte gratuit pendant six mois au plus, et des allocations mensuelles Always Free sur plus de 30 services |

La plupart des services facturent à la seconde, à l'heure, au Go ou à la requête ; les prix **diffèrent selon les Régions**.

<!-- section: organizations | objectives: 4.2.3, 4.2.7 -->
## AWS Organizations et la facturation consolidée

**AWS Organizations** regroupe plusieurs comptes AWS sous un **compte de gestion**. Les **comptes membres** peuvent être rangés dans des **unités d'organisation (UO)**, et des **politiques de contrôle des services (SCP)** fixent les autorisations maximales disponibles dans les comptes d'une UO.

La **facturation consolidée** est une fonctionnalité d'Organizations, sans coût supplémentaire :

| Avantage | Ce que cela signifie |
| --- | --- |
| **Une seule facture** | Le compte de gestion reçoit et paie une seule facture pour tous les comptes membres |
| **Suivi facile** | Les frais restent affichés par compte, ce qui permet de répartir les coûts de chaque compte |
| **Utilisation combinée** | L'utilisation de tous les comptes est additionnée pour les **paliers de tarification par volume** (par exemple le stockage S3 ou le transfert de données) : l'organisation atteint plus vite les paliers moins chers |
| **Remises partagées** | Les remises des instances réservées et des Savings Plans s'appliquent entre les comptes (chapitre 41) |

> **Piège d'examen.** La facturation consolidée combine la **facturation**, pas les autorisations : les utilisateurs d'un compte membre n'obtiennent pas d'accès aux autres comptes. Contrôler ce que les comptes peuvent faire est le rôle des SCP.

<!-- section: cost-allocation-tags | objectives: 4.2.4, 4.2.8 -->
## Balises de répartition des coûts

Une **balise** (tag) est une étiquette clé-valeur sur une ressource (par exemple `CostCenter = 1234`). Une **balise de répartition des coûts** (cost allocation tag) est une balise activée pour la facturation, afin de regrouper et filtrer les coûts selon ses valeurs.

| Type | Créée par | Préfixe dans les rapports |
| --- | --- | --- |
| Balises de répartition des coûts **générées par AWS** | AWS, par exemple `aws:createdBy` (qui a créé la ressource) | `aws:` |
| Balises de répartition des coûts **définies par l'utilisateur** | Vous, sur vos ressources | `user:` |

- Les deux types doivent être **activés** dans la console Billing and Cost Management avant d'apparaître dans les outils de facturation ; dans une organisation, c'est le **compte de gestion** qui les active.
- Une balise activée peut mettre **jusqu'à 24 heures** à apparaître.
- Les balises activées apparaissent comme **filtres et regroupements dans AWS Cost Explorer et AWS Budgets**, et comme **colonnes dans l'AWS Cost and Usage Report**, ce qui permet de voir les coûts de chaque service ou projet.
- Les **politiques de balises** (tag policies) d'AWS Organizations normalisent les clés et valeurs de balises entre les comptes.

<!-- section: budgets-cost-explorer | objectives: 4.2.5 -->
## AWS Budgets et AWS Cost Explorer

| Outil | Objectif | Principales fonctions |
| --- | --- | --- |
| **AWS Cost Explorer** | **Analyser** les dépenses passées et **prévoir** les dépenses futures | Graphiques et rapports de coûts et d'utilisation par service, compte, Région ou balise ; jusqu'à 13 mois d'historique plus le mois en cours ; prévision sur les 18 prochains mois ; recommandations, rapports d'utilisation et de couverture des instances réservées et des Savings Plans ; recommandations de dimensionnement |
| **AWS Budgets** | **Alerter** quand les dépenses franchissent un seuil que vous fixez | Budgets de coût, d'utilisation, d'instances réservées et de Savings Plans ; alertes sur les valeurs **réelles ou prévues** par e-mail ou Amazon SNS ; **actions de budget** qui appliquent une politique IAM ou une SCP, ou arrêtent des instances EC2 ou RDS |

> **Piège d'examen.** Cost Explorer affiche et prévoit, mais n'alerte pas. « Prévenir l'équipe financière quand les coûts mensuels prévus dépassent 500 USD » relève d'AWS Budgets.

<!-- section: pricing-calculator | objectives: 4.2.6 -->
## AWS Pricing Calculator

**AWS Pricing Calculator** estime le coût mensuel des services AWS **avant** de les utiliser :

- Il est gratuit, accessible sur le web, et ne nécessite **aucun compte AWS** (calculator.aws).
- Ajoutez des services, choisissez une Région et saisissez la configuration (type d'instance, stockage, transfert de données, requêtes) ; le calculateur affiche le coût mensuel et le coût initial, ainsi que le calcul derrière chaque prix.
- Organisez les services en **groupes** (par application, centre de coûts ou Région), enregistrez un **lien** pour partager l'estimation, ou **exportez-la** en CSV ou PDF.
- Les prix proviennent de l'AWS Price List API ; les taxes et l'utilisation de l'offre gratuite ne sont pas incluses.

| Besoin | Outil |
| --- | --- |
| Estimer le coût d'une architecture pas encore déployée | AWS Pricing Calculator |
| Voir ce qui a été dépensé le mois dernier et prévoir le mois prochain | AWS Cost Explorer |
| Être alerté quand les dépenses dépassent un seuil | AWS Budgets |
| Obtenir les lignes de facturation les plus détaillées pour l'analyse | AWS Cost and Usage Report |

<!-- section: cost-usage-report | objectives: 4.2.8 -->
## AWS Cost and Usage Report

L'**AWS Cost and Usage Report (CUR)** fournit les données de facturation les plus détaillées : des lignes par heure, par jour ou par mois, par ressource, avec les balises de répartition des coûts activées en colonnes. Il est livré sous forme de fichiers dans un **compartiment Amazon S3** (via AWS Data Exports) et analysé avec Amazon Athena, Amazon Redshift ou Amazon Quick.

> **Conseil d'examen.** « Le plus granulaire », « à l'heure, par ressource », « charger les données de facturation dans un entrepôt de données » désignent le Cost and Usage Report, pas Cost Explorer.

<!-- section: key-points -->
## Points clés

- Le support compte et facturation est gratuit dans tous les plans, via le Support Center.
- Pages de tarification et Price List API : les prix. Pricing Calculator : les estimations avant déploiement.
- Organizations : compte de gestion, comptes membres, UO, SCP. Facturation consolidée : une facture, paliers de volume combinés, remises RI et Savings Plans partagées, sans coût supplémentaire.
- Balises de répartition des coûts : générées par AWS (`aws:`) ou définies par l'utilisateur (`user:`), activées par le compte de gestion, visibles dans Cost Explorer, Budgets et le CUR.
- Cost Explorer analyse et prévoit ; Budgets alerte et peut agir ; le CUR donne les données les plus détaillées dans S3.
