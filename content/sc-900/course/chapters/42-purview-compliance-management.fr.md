Microsoft Purview est la famille de solutions qui gouverne, protège et gère les données d'une organisation. Ce chapitre couvre son portail et le Gestionnaire de conformité, l'outil qui transforme une réglementation en liste d'actions et en score. L'examen attend que vous sachiez ce que le score de conformité mesure, et ce qu'il ne mesure pas.

<!-- section: purview-portal | objectives: 4.2.1 -->
## Le portail Microsoft Purview

Le **portail Microsoft Purview** (`https://purview.microsoft.com`) est le point d'entrée unifié des solutions Microsoft Purview. Une seule interface permet de découvrir les solutions, de rechercher, de gérer les paramètres et de gérer les rôles et les autorisations.

| Famille | Solutions vues dans ce cours |
| --- | --- |
| **Sécurité des données** | Protection des informations (classification, étiquettes de confidentialité), protection contre la perte de données, gestion des risques internes |
| **Gouvernance des données** | Data Map et Unified Catalog, pour découvrir et gouverner les données de tout le patrimoine de données |
| **Risque et conformité** | Gestionnaire de conformité, eDiscovery, Audit, conformité des communications, gestion du cycle de vie des données, gestion des enregistrements |

Ce que montre le portail :

- Une **page d'accueil** avec des **cartes de solution** : uniquement les solutions auxquelles vos autorisations et votre abonnement donnent accès. **Afficher toutes les solutions** liste les autres.
- Un résumé de la **posture de conformité**, tiré du Gestionnaire de conformité.
- Une **recherche** globale et des **Paramètres** centralisés, dont les rôles et les étendues.

Le portail remplace le portail de conformité Microsoft Purview, mis hors service, et le portail de gouvernance classique.

> **Piège d'examen.** Les étiquettes de confidentialité, la DLP, la rétention, eDiscovery, l'audit et le Gestionnaire de conformité sont dans le **portail Microsoft Purview**. Les incidents, les alertes et le repérage sont dans le **portail Microsoft Defender**. Les utilisateurs, les groupes et l'accès conditionnel sont dans le **Centre d'administration Microsoft Entra**.

<!-- section: compliance-manager | objectives: 4.2.2 -->
## Gestionnaire de conformité

Le **Gestionnaire de conformité Microsoft Purview** (Compliance Manager) vous aide à évaluer et à gérer automatiquement la conformité dans tout votre environnement multicloud. Il accompagne tout le parcours de conformité : inventorier les risques liés à la protection des données, gérer la complexité de l'implémentation des contrôles, rester à jour des réglementations et des certifications, et rendre compte aux auditeurs.

Il traduit les réglementations en langage clair et fournit des évaluations prédéfinies, des conseils pas à pas et un score.

| Élément | Définition |
| --- | --- |
| **Contrôle** | Une exigence d'une réglementation, d'une norme ou d'une stratégie. Il définit comment évaluer et gérer la configuration des systèmes, les processus de l'organisation et les personnes chargées de satisfaire l'exigence |
| **Évaluation** | Un regroupement de contrôles issus d'une réglementation, d'une norme ou d'une stratégie précise, par exemple ISO 27001. Elle a son propre score d'évaluation |
| **Réglementations** | La liste des réglementations et des certifications pour lesquelles le Gestionnaire de conformité fournit des modèles servant à créer des évaluations : plus de 360, et des modèles personnalisés sont possibles |
| **Action d'amélioration** | Une recommandation qui vous aide à satisfaire un contrôle. Elle peut être attribuée à un utilisateur, et elle conserve l'état d'implémentation, les notes et les preuves |

Les contrôles sont de trois types, qui reflètent le modèle de responsabilité partagée :

| Type de contrôle | Qui l'implémente |
| --- | --- |
| **Contrôles gérés par Microsoft** | Microsoft, pour ses services cloud |
| **Vos contrôles** (gérés par le client) | Votre organisation |
| **Contrôles partagés** | Les deux : votre organisation et Microsoft partagent la responsabilité |

Le Gestionnaire de conformité collecte en continu les signaux de votre environnement Microsoft 365 et met à jour automatiquement l'état des actions techniques.

<!-- section: compliance-score | objectives: 4.2.3 -->
## Utilisation et avantages du score de conformité

Le **score de conformité** mesure votre avancement dans la réalisation des actions d'amélioration recommandées. Le Gestionnaire de conformité attribue des points pour chaque action réalisée et les combine en un score global, affiché sur son tableau de bord.

- Les points d'une action dépendent du **risque** qu'elle traite : plus le risque est grand, plus il y a de points.
- Le score additionne **vos points** (les actions réalisées par votre organisation) et les **points gérés par Microsoft** (les actions que Microsoft a réalisées en tant que fournisseur de cloud).
- Une nouvelle organisation démarre avec un **score initial** fondé sur la **base de référence de protection des données Microsoft 365**, un ensemble de contrôles qui couvre les principales réglementations et normes de protection des données et de gouvernance générale des données.

| Type d'action | Obligatoire | Discrétionnaire |
| --- | --- | --- |
| **Préventive** : traite un risque précis, par exemple le chiffrement au repos | 27 points | 9 points |
| **Détective** : surveille pour repérer des irrégularités ou des violations, par exemple l'audit des accès | 3 points | 1 point |
| **Corrective** : limite les dégâts d'un incident, par exemple la réponse aux incidents | 3 points | 1 point |

Une action obligatoire ne peut pas être contournée (une stratégie de mot de passe appliquée de façon centralisée) ; une action discrétionnaire dépend du respect d'une règle par les utilisateurs (verrouiller un ordinateur laissé sans surveillance).

À quoi sert le score :

- **Comprendre** la posture de conformité d'un coup d'œil.
- **Hiérarchiser** : réaliser d'abord les actions qui réduisent le plus le risque et rapportent le plus de points.
- **Suivre** l'avancement dans le temps.
- **Rendre compte** de l'état à la direction, aux auditeurs et aux autres parties prenantes.

> **Piège d'examen.** Le score de conformité n'est **pas** une mesure absolue de la conformité et ne garantit rien : un score élevé signifie que beaucoup d'actions recommandées sont réalisées, pas que l'organisation est certifiée conforme.

> **Piège d'examen.** **Score de conformité** (Gestionnaire de conformité, portail Purview) : avancement par rapport aux réglementations et aux normes. **Degré de sécurisation Microsoft** (Microsoft Secure Score, portail Defender) : posture de sécurité. Une question sur la « réduction des risques liés à la protection des données et aux normes réglementaires » porte sur le score de conformité.

<!-- section: key-points -->
## Points clés

- Le portail Microsoft Purview est le point d'entrée unique des solutions de sécurité des données, de gouvernance des données et de risque et conformité.
- Le Gestionnaire de conformité évalue et gère la conformité dans un environnement multicloud, avec des évaluations, des contrôles, des modèles de réglementation et des actions d'amélioration.
- Trois types de contrôles : gérés par Microsoft, les vôtres, partagés.
- Le score de conformité mesure l'avancement des actions d'amélioration ; les points dépendent du risque ; il combine vos points et les points gérés par Microsoft.
- Le score initial vient de la base de référence de protection des données Microsoft 365.
- Le score aide à comprendre, hiérarchiser, suivre et rendre compte ; ce n'est pas une garantie de conformité.
- Le score de conformité est dans Purview ; le Degré de sécurisation Microsoft est dans Defender.
