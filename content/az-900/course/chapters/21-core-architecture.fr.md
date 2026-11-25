Azure a un côté physique (centres de données, zones, régions) et un côté gestion (ressources, groupes de ressources, abonnements, groupes d'administration). Ce chapitre couvre les deux, car les questions les mélangent.

<!-- section: datacenters-regions | objectives: 2.1.1, 2.1.3 -->
## Centres de données, régions, paires de régions et régions souveraines

Un **centre de données** est un bâtiment rempli de serveurs, avec sa propre alimentation, son refroidissement et son réseau. Vous ne choisissez jamais directement un centre de données : ils sont regroupés en régions.

Une **région** est une zone géographique qui contient un ou plusieurs centres de données, proches les uns des autres et reliés par un réseau à faible latence. Quand vous créez une ressource, vous choisissez en général sa région. Ce choix compte pour la latence (près des utilisateurs), pour la résidence des données (exigences légales), pour le prix et pour les services disponibles : tous les services n'existent pas dans toutes les régions. Quelques services sont **mondiaux** et n'ont pas de région, comme Microsoft Entra ID, Azure DNS et Azure Traffic Manager.

De nombreuses régions sont **jumelées** avec une autre région de la même zone géographique, distante d'au moins 300 miles (environ 480 km) quand c'est possible, par exemple Europe Ouest avec Europe Nord.

- Si une panne étendue touche plusieurs régions, une région de chaque paire est rétablie en priorité.
- Les mises à jour planifiées d'Azure sont déployées dans une seule région d'une paire à la fois.
- Les données restent dans la même zone géographique (sauf Brésil Sud), pour des raisons fiscales et légales.
- Le stockage géoredondant réplique les données vers la région jumelée.
- La plupart des paires fonctionnent dans les deux sens ; quelques-unes sont à sens unique. De nombreuses régions, surtout les plus récentes, n'ont pas de paire et s'appuient sur les zones de disponibilité.
- Une paire ne rend pas les ressources résilientes à elle seule : elle n'apporte ni haute disponibilité, ni récupération d'urgence, ni basculement automatiques. Vous les planifiez et les configurez vous-même ; le basculement géré par Microsoft du stockage géoredondant n'a lieu que dans des situations catastrophiques.

Les **régions souveraines** sont des instances d'Azure isolées de l'instance principale, pour des raisons de conformité ou légales :

| Région souveraine | Particularité |
| --- | --- |
| Azure Government (US DoD Central, US Gov Virginia, US Gov Arizona...) | Isolée physiquement et logiquement ; exploitée par du personnel américain habilité ; pour les agences gouvernementales américaines et leurs partenaires |
| Azure en Chine (China East, China North...) | Exploitée par 21Vianet, et non par Microsoft, dans le cadre d'un partenariat |

<!-- section: availability-zones | objectives: 2.1.2 -->
## Zones de disponibilité

Les **zones de disponibilité** sont des centres de données physiquement séparés au sein d'une même région, chacun avec une alimentation, un refroidissement et un réseau indépendants, reliés par de la fibre privée à haut débit. Une région qui prend en charge les zones en compte **au moins trois**. Si une zone tombe, les autres continuent de fonctionner.

| Catégorie de service | Comportement |
| --- | --- |
| Services **zonaux** | Vous épinglez la ressource à une zone de votre choix : machines virtuelles, disques managés, adresses IP |
| Services **redondants interzone** | La plateforme réplique automatiquement entre les zones : stockage redondant interzone, SQL Database |
| Services **non régionaux** | Toujours disponibles depuis les zones géographiques Azure ; résistent aux pannes de zone et de région |

Les zones protègent contre la perte d'un **centre de données** ; les paires de régions protègent contre la perte d'une **région**. Toutes les régions n'ont pas de zones de disponibilité.

<!-- section: resources-resource-groups | objectives: 2.1.4 -->
## Ressources et groupes de ressources

Une **ressource** est tout ce que vous créez dans Azure : une machine virtuelle, un réseau virtuel, une base de données, un compte de stockage.

Un **groupe de ressources** est un conteneur logique de ressources. Règles :

- Chaque ressource est dans **un seul** groupe de ressources à la fois. Certaines ressources peuvent être déplacées vers un autre groupe ; tous les types de ressources ne prennent pas en charge le déplacement.
- Un groupe de ressources **ne peut pas être renommé** après sa création.
- Les groupes de ressources **ne peuvent pas être imbriqués**.
- Une action appliquée à un groupe de ressources s'applique à tout ce qu'il contient : **supprimer le groupe supprime toutes ses ressources** ; donner accès au groupe donne accès à toutes ses ressources.
- Un groupe de ressources a un emplacement (où sont stockées ses métadonnées), mais il peut contenir des ressources de **régions différentes**.

Regroupez les ressources qui partagent le même cycle de vie ou les mêmes règles d'accès : par exemple toutes les ressources d'un environnement de test, retirées en une seule opération.

<!-- section: subscriptions | objectives: 2.1.5 -->
## Abonnements

Un **abonnement** est une unité de gestion, de facturation et de mise à l'échelle. Il relie un compte (une identité dans Microsoft Entra ID) aux ressources qu'il peut créer.

| Limite | Sens |
| --- | --- |
| **Limite de facturation** | Chaque abonnement a sa propre facture et son propre rapport de facturation |
| **Limite de contrôle d'accès** | Les stratégies d'accès s'appliquent par abonnement : des équipes différentes peuvent donc avoir des règles différentes |

Raisons de créer plusieurs abonnements : séparer les **environnements** (développement, test, production), refléter la **structure de l'organisation** (par exemple limiter une équipe aux ressources les moins chères), isoler la **facturation** (les coûts de production à part de ceux du développement), et contourner les limites par abonnement.

Un compte peut avoir de nombreux abonnements ; un abonnement approuve un seul locataire Microsoft Entra.

<!-- section: management-groups-hierarchy | objectives: 2.1.6, 2.1.7 -->
## Groupes d'administration et hiérarchie

Les **groupes d'administration** sont des conteneurs situés au-dessus des abonnements. Les conditions de gouvernance (Azure Policy, Azure RBAC) appliquées à un groupe d'administration sont **héritées** par tous les abonnements, groupes de ressources et ressources situés en dessous.

- Les groupes d'administration peuvent être imbriqués, jusqu'à **six niveaux** de profondeur (les niveaux racine et abonnement ne sont pas comptés).
- Un annuaire prend en charge jusqu'à 10 000 groupes d'administration.
- Chaque groupe d'administration et chaque abonnement n'a qu'**un seul parent**.
- Un unique groupe d'administration racine se trouve au sommet de chaque annuaire.

Les quatre niveaux, du plus large au plus étroit :

```text
Management groups
└── Subscriptions
    └── Resource groups
        └── Resources
```

Exemples : une stratégie qui limite les emplacements des machines virtuelles à une région, attribuée à un groupe d'administration « Production », s'applique à tous les abonnements qu'il contient. Un rôle donné à un utilisateur sur un groupe d'administration donne accès à tous les abonnements situés en dessous, sans attribution abonnement par abonnement.

> **Piège d'examen.** Un groupe de ressources ne peut pas contenir d'autres groupes de ressources, et une ressource ne peut pas être dans deux groupes de ressources. Les groupes d'administration, au contraire, peuvent être imbriqués.

<!-- section: key-points -->
## Points clés

- Région = des centres de données dans une même zone. Paire de régions = reprise et mises à jour séquentielles au sein d'une zone géographique. Régions souveraines = instances isolées (gouvernement américain, Chine exploitée par 21Vianet).
- Zones de disponibilité = au moins trois centres de données séparés dans une région ; services zonaux, redondants interzone et non régionaux.
- Groupe de ressources : un seul par ressource, non imbricable, non renommable, sa suppression supprime son contenu, peut contenir des ressources de plusieurs régions.
- Abonnement : limite de facturation et limite de contrôle d'accès.
- Groupes d'administration : conteneurs d'abonnements imbricables, six niveaux, héritage des stratégies et des rôles.
- Hiérarchie : groupes d'administration > abonnements > groupes de ressources > ressources.
