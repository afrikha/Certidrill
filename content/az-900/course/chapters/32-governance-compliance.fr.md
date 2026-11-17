La gouvernance maintient un environnement dans les règles de l'organisation et de la loi à mesure qu'il grandit. L'examen nomme trois outils : Microsoft Purview pour les données, Azure Policy pour les ressources et les verrous de ressources pour la protection contre les accidents.

<!-- section: purview | objectives: 3.2.1 -->
## Microsoft Purview

**Microsoft Purview** est une famille de solutions de gouvernance des données, de gestion des risques et de conformité qui donne une vue unique et unifiée de vos données, où qu'elles se trouvent : en local, dans plusieurs clouds et dans des applications SaaS.

Ce qu'il apporte :

- La **découverte automatisée des données** : il analyse les sources de données et construit une carte du patrimoine de données.
- La **classification des données sensibles** : il reconnaît et étiquette les informations sensibles.
- La **traçabilité des données de bout en bout** : il montre d'où viennent les données et où elles vont.

Ses deux domaines de solutions :

| Domaine | But |
| --- | --- |
| **Risques et conformité** | Protéger les données sensibles dans les clouds, les applications et les appareils ; identifier les risques liés aux données et gérer la conformité réglementaire. Fonctionne avec des services Microsoft 365 comme Teams, OneDrive et Exchange |
| **Gouvernance unifiée des données** | Créer une carte à jour de tout le patrimoine de données avec classification et traçabilité, repérer où sont stockées les données sensibles, gérer l'accès aux données de façon sûre et à grande échelle. Couvre Azure, les bases SQL et Hive, les données locales et d'autres clouds comme Amazon S3 |

Purview concerne les **données** : savoir ce que vous avez, où cela se trouve et à quel point c'est sensible. Il ne contrôle pas quelles ressources Azure peuvent être créées ; c'est le rôle d'Azure Policy.

<!-- section: azure-policy | objectives: 3.2.2 -->
## Azure Policy

**Azure Policy** permet de créer, d'attribuer et de gérer des stratégies qui contrôlent ou auditent vos ressources, pour que leur configuration reste conforme aux normes de l'entreprise.

| Concept | Sens |
| --- | --- |
| **Définition de stratégie** | Une règle, par exemple : n'autoriser que certaines régions, n'autoriser que certaines tailles de machines virtuelles, exiger une étiquette, exiger HTTPS sur les comptes de stockage. Il existe de nombreuses définitions intégrées ; vous pouvez écrire les vôtres |
| **Initiative** | Un **groupe de stratégies liées**, attribuées ensemble pour suivre un objectif plus large, par exemple *Enable Monitoring in Azure Security Center* |
| **Attribution** | Une stratégie ou une initiative appliquée à une étendue : un groupe d'administration, un abonnement, un groupe de ressources ou une ressource |

Son comportement :

- Les attributions sont **héritées** : une stratégie posée sur un abonnement s'applique à ses groupes de ressources et à ses ressources. Une étendue enfant peut être exclue.
- Les nouvelles ressources qui enfreignent une stratégie peuvent être **refusées** ; les ressources **existantes** sont évaluées et signalées comme non conformes.
- Certaines stratégies peuvent **corriger** automatiquement, par exemple ajouter une étiquette manquante.
- Les stratégies s'appliquent à tout le monde, propriétaires compris : Azure Policy ne s'intéresse pas à qui est l'utilisateur.
- Il s'intègre à Azure DevOps pour vérifier la conformité avant et après les déploiements.

| Question dans un scénario | Outil |
| --- | --- |
| « Garantir que les ressources ne sont créées qu'en Europe » | Azure Policy |
| « Garantir que seule l'équipe réseau peut modifier les réseaux virtuels » | Azure RBAC |
| « Garantir que personne ne supprime par erreur la base de production » | Verrou de ressource |

<!-- section: resource-locks | objectives: 3.2.3 -->
## Verrous de ressources

Un **verrou de ressource** empêche la suppression ou la modification accidentelle de ressources, **quelles que soient les autorisations de l'utilisateur**, même un propriétaire.

| Type de verrou | Les utilisateurs autorisés peuvent | Les utilisateurs autorisés ne peuvent pas |
| --- | --- | --- |
| **Suppression** (`CanNotDelete`) | Lire et modifier la ressource | La supprimer |
| **Lecture seule** (`ReadOnly`) | Lire la ressource | La modifier ni la supprimer |

- Un verrou s'applique à un **abonnement**, à un **groupe de ressources** ou à une **ressource**, et il est **hérité** : un verrou sur un groupe de ressources s'applique à toutes les ressources qu'il contient.
- Les verrous se gèrent depuis le portail, Azure PowerShell, Azure CLI ou un modèle ARM.
- Pour supprimer ou modifier une ressource verrouillée, il faut **d'abord retirer le verrou**, puis effectuer l'opération. Deux étapes, volontairement.

> **Piège d'examen.** Azure RBAC seul ne protège pas contre l'erreur de quelqu'un qui a les droits. Un verrou, si. Et un verrou n'est pas définitif : un utilisateur qui a les droits suffisants peut le retirer, puis supprimer la ressource.

<!-- section: key-points -->
## Points clés

- Microsoft Purview : gouvernance unifiée des **données** (découverte, classification, traçabilité), risques et conformité, sur le local, le multicloud et le SaaS.
- Azure Policy : des règles sur les **ressources** ; définitions, initiatives (groupes de stratégies), attributions à une étendue, héritage, évaluation des ressources existantes, correction possible.
- Verrous de ressources : Supprimer ou Lecture seule ; sur les abonnements, groupes de ressources et ressources ; hérités ; s'appliquent quel que soit le rôle RBAC ; retirer le verrou avant de modifier la ressource.
