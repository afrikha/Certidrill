Dans le cloud, on paie ce que l'on utilise : comprendre ce qui fait la facture, l'estimer avant le déploiement et la suivre ensuite fait donc partie des fondamentaux.

<!-- section: cost-factors | objectives: 3.1.1 -->
## Les facteurs qui influencent les coûts

| Facteur | Effet |
| --- | --- |
| **Type de ressource** | La nature de la ressource et ses réglages : niveau de performance, niveau d'accès et redondance d'un compte de stockage ; taille, licence du système d'exploitation et disques d'une machine virtuelle |
| **Consommation** | Le paiement à l'utilisation suit l'usage. Une **réservation** (engagement d'un ou trois ans) peut faire économiser jusqu'à 72 % sur des charges stables |
| **Maintenance** | Les ressources oubliées continuent de coûter : disques ou réseaux de machines virtuelles supprimées, environnements de test laissés en place |
| **Zone géographique** | La même ressource n'a pas le même prix selon la région, car l'énergie, la main-d'œuvre, les taxes et les frais diffèrent |
| **Trafic réseau** | Les données entrantes sont en général gratuites ; **les données sortantes sont facturées**, à des tarifs qui dépendent de la zone de facturation. Le trafic à l'intérieur d'une région coûte moins cher que le trafic entre régions |
| **Type d'abonnement** | Certains abonnements incluent des quotas d'utilisation : l'essai gratuit donne un crédit pour les 30 premiers jours et certains services gratuits pendant douze mois |
| **Place de marché Azure** | Les solutions tierces sont facturées selon leurs propres conditions, en plus des ressources Azure qu'elles utilisent |

Moyens de réduire les coûts : choisir la bonne taille, libérer les machines virtuelles inutilisées, supprimer les ressources inutiles, acheter des réservations pour les charges stables, réutiliser des licences avec Azure Hybrid Benefit, déplacer les données rarement lues vers des niveaux de stockage plus froids.

<!-- section: pricing-calculator | objectives: 3.1.2 -->
## La calculatrice de prix

La **calculatrice de prix** donne une **estimation du coût des ressources que vous prévoyez de déployer**. Vous ajoutez des produits (calcul, stockage, réseau), puis vous réglez leurs options : région, niveau, taille, nombre d'heures, redondance, plan de support. Vous pouvez enregistrer, exporter et partager l'estimation.

- Elle estime ; elle ne déploie rien et son utilisation n'est pas facturée.
- Elle répond à « combien coûterait cette architecture par mois ? » **avant** le déploiement.
- Pour ce qui est **déjà** déployé et dépensé, l'outil est Cost Management.

<!-- section: cost-management | objectives: 3.1.3 -->
## Les fonctionnalités de gestion des coûts

**Microsoft Cost Management** permet de vérifier rapidement les coûts des ressources Azure et d'agir dessus.

| Fonctionnalité | Usage |
| --- | --- |
| **Analyse des coûts** | Explorer et visualiser les coûts : par cycle de facturation, région, ressource, groupe de ressources ou étiquette ; montre les tendances et une prévision |
| **Budgets** | Fixer une limite de dépense pour un abonnement, un groupe de ressources, un type de service... ; des alertes se déclenchent à des seuils du budget. Des montages avancés peuvent lancer une automatisation qui suspend ou modifie des ressources |
| **Alertes de coût** | **Alertes de budget** (la dépense atteint un seuil d'un budget), **alertes de crédit** (les crédits prépayés sont en cours de consommation, pour les organisations sous contrat Entreprise), **alertes de quota de dépense de service** |
| Recommandations | Des suggestions d'Azure Advisor pour réduire les dépenses |

> **Piège d'examen.** Un budget vous avertit ; par défaut, il n'arrête pas de ressources et ne bloque pas les dépenses. Et la calculatrice de prix ne montre jamais vos coûts réels : c'est le rôle de l'analyse des coûts.

<!-- section: tags | objectives: 3.1.4 -->
## Les étiquettes

Une **étiquette** (tag) est un nom et une valeur attachés à une ressource, comme `Department = Finance` ou `Environment = Production`. Les étiquettes ajoutent une information que la structure des groupes de ressources ne peut pas porter.

| But | Exemple |
| --- | --- |
| Gestion des ressources | Retrouver les ressources d'une charge de travail, d'un environnement ou d'une entité |
| Gestion et optimisation des coûts | Regrouper les ressources pour rendre compte des coûts, les affecter à des centres de coûts, suivre des budgets |
| Gestion des opérations | Regrouper les ressources par criticité, pour formuler des contrats de niveau de service |
| Sécurité | Classer les données par niveau de sécurité, comme *public* ou *confidentiel* |
| Gouvernance et conformité réglementaire | Identifier les ressources soumises à une norme comme ISO 27001 |
| Optimisation et automatisation des charges | Étiqueter les ressources d'un déploiement, par exemple pour les arrêter automatiquement |

- Les étiquettes se gèrent avec le portail, Azure PowerShell, Azure CLI, les modèles ARM ou l'API REST.
- **Azure Policy** peut exiger des étiquettes sur les nouvelles ressources ou les ajouter automatiquement.
- Les ressources **n'héritent pas** des étiquettes de leur groupe de ressources ni de leur abonnement, sauf si une stratégie les applique.
- Une ressource peut porter plusieurs étiquettes ; n'y mettez pas de valeurs sensibles.

<!-- section: key-points -->
## Points clés

- Les coûts dépendent du type de ressource, de la consommation, de la maintenance, de la zone géographique, du trafic réseau (le sortant est facturé), du type d'abonnement et des achats sur la Place de marché.
- Calculatrice de prix = estimer avant le déploiement. Cost Management = analyser, budgéter et alerter sur les dépenses réelles.
- Les budgets alertent à des seuils ; ils ne bloquent pas les dépenses d'eux-mêmes.
- Étiquettes = métadonnées nom et valeur pour l'organisation, le suivi des coûts, les opérations, la sécurité et la conformité ; imposées avec Azure Policy ; non héritées.
