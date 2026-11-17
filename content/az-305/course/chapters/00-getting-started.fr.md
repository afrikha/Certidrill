L'AZ-305 est un examen de conception. Presque chaque question décrit un environnement, énumère des exigences et demande ce que vous devez recommander : un service, un niveau, une option de redondance ou une topologie. Vous ne configurez rien. Ce chapitre présente le format, une méthode pour lire les questions pilotées par les exigences et les familles de services que l'examen vous demande de distinguer.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | Microsoft Certified: Azure Solutions Architect Expert |
| Prérequis | La certification Azure Administrator Associate (examen AZ-104) est exigée pour obtenir la certification |
| Durée | 100 minutes d'examen (valeur donnée par Microsoft pour les examens de niveau associé et expert sans laboratoire) |
| Questions | Nombre non publié ; environ 40 à 60 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn peut être ouvert pendant l'examen, sur le même chronomètre |
| Validité | Un an, renouvelée gratuitement par une évaluation en ligne sur Microsoft Learn |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Concevoir des solutions d'identité, de gouvernance et de monitoring | 25 à 30 % |
| Concevoir des solutions de stockage de données | 20 à 25 % |
| Concevoir des solutions de continuité d'activité | 15 à 20 % |
| Concevoir des solutions d'infrastructure | 30 à 35 % |

Le score est mis à l'échelle : 700 ne signifie pas 70 % des questions. Les questions composées de plusieurs éléments (listes déroulantes, affirmations Oui/Non, glisser-déposer) rapportent un point par élément correct ; une réponse partiellement juste rapporte donc des points.

Formats de questions, du plus fréquent au plus rare : une réponse parmi quatre, zones de réponse à deux ou trois listes déroulantes, séries de trois affirmations Oui/Non, « sélectionnez deux réponses », et glisser-déposer associant des exigences à des services. Il n'y a ni laboratoire, ni commande à compléter, ni chemin de clics dans le portail. Un examen comporte aussi des sections qui ont leurs propres règles :

- **Études de cas.** La description d'une entreprise en onglets (vue d'ensemble, environnement existant, changements prévus, exigences techniques et métier), suivie de plusieurs questions. Une fois l'étude de cas quittée, vous ne pouvez plus y revenir.
- **Séries Oui/Non.** Le même scénario est répété avec une solution différente à chaque fois ; vous dites si la solution atteint l'objectif. Chaque réponse est définitive. Plusieurs solutions peuvent atteindre l'objectif, ou aucune.
- **Section principale.** Des questions indépendantes que vous pouvez marquer et revoir jusqu'à la validation.

> **Conseil d'examen.** Microsoft Learn est accessible, mais le chronomètre continue de tourner. Servez-vous-en pour vérifier un fait précis (quel niveau possède une fonctionnalité, une limite), jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question de conception

Un énoncé type donne un contexte court (abonnements, locataires, centre de données local, charges de travail), puis deux à cinq exigences, souvent sous forme de liste à puces. Chaque exigence est là pour éliminer une proposition. Procédez dans cet ordre :

1. Lisez d'abord la dernière phrase : que devez-vous recommander ?
2. Relevez les exigences, y compris celles qui se cachent dans le contexte (« l'entreprise n'a pas de VPN », « les développeurs ne doivent pas gérer d'informations d'identification »).
3. Éliminez toute proposition qui manque une exigence, même mineure.
4. Parmi les propositions restantes, la moins chère et la plus simple l'emporte.

| Mots de l'énoncé | Ce qu'ils sélectionnent |
| --- | --- |
| « réduire les coûts » | Le niveau, la référence SKU ou la redondance les moins chers qui possèdent encore toutes les fonctionnalités exigées |
| « réduire l'effort d'administration » | Le service managé ou la fonctionnalité intégrée (service de plateforme, stratégie, identité managée) plutôt que des machines virtuelles, des scripts ou du code personnalisé |
| « objectif de point de récupération (RPO) de 15 minutes » | La quantité de données que l'on peut perdre : il fixe la fréquence de réplication ou de sauvegarde |
| « objectif de délai de récupération (RTO) de 1 heure » | La durée d'interruption acceptable : il fixe le mécanisme de basculement |
| « doit rester disponible si un centre de données tombe » | Les zones de disponibilité : niveaux et références SKU redondants interzone |
| « doit rester disponible si une région tombe » | Une seconde région : géoréplication, groupes de basculement, équilibrage de charge mondial |
| « ne doit pas être exposé à internet » | Points de terminaison privés, connectivité privée, équilibreurs de charge internes |
| « sans stocker d'informations d'identification » | Les identités managées ; les secrets inévitables vont dans Azure Key Vault |
| « principe du moindre privilège » | Le rôle le plus étroit à l'étendue la plus étroite, activé juste-à-temps quand il est privilégié |
| « doit s'appliquer aux futurs abonnements » | Une attribution sur un groupe d'administration, héritée vers le bas |
| « empêcher », par opposition à « identifier » ou « signaler » | Un contrôle bloquant (Azure Policy `deny`, un verrou), par opposition à un audit |
| « réduire les modifications de l'application » | Un réhébergement sur un service compatible plutôt qu'une réarchitecture |

> **Piège d'examen.** « Réduire les coûts » ne l'emporte jamais sur une exigence fonctionnelle. Si la charge de travail a besoin d'une fonctionnalité que seul un niveau supérieur fournit, ce niveau est la réponse ; le moins cher est le distracteur placé là exprès.

Dans une série Oui/Non, jugez chaque solution pour elle-même : oubliez la solution proposée à la question précédente, et acceptez une solution qui atteint l'objectif même si vous en auriez conçu une meilleure.

<!-- section: design-principles -->
## Les principes de conception que l'examen récompense

Le guide d'étude attend des conceptions alignées sur Azure Well-Architected Framework et sur Cloud Adoption Framework. Les cinq piliers de Well-Architected Framework expliquent la plupart des arbitrages entre deux options valides :

| Pilier | Question qu'il pose | Réponse type |
| --- | --- | --- |
| Fiabilité | Que se passe-t-il quand un composant, une zone ou une région tombe ? | Redondance entre zones ou régions, sauvegardes, basculement testé |
| Sécurité | Qui peut atteindre les données, et avec quelle identité ? | Authentification Microsoft Entra, moindre privilège, réseau privé, chiffrement |
| Optimisation des coûts | Paie-t-on quelque chose d'inutile ? | Le bon niveau, la mise à l'échelle automatique, les réservations, les niveaux de stockage plus froids |
| Excellence opérationnelle | Peut-on déployer et observer sans étape manuelle ? | Infrastructure as code, stratégies, monitoring centralisé |
| Efficacité des performances | La solution suit-elle la charge ? | Mise à l'échelle horizontale, mise en cache, partitionnement |

Cloud Adoption Framework fournit les réponses à l'échelle de l'organisation : les zones d'atterrissage Azure (une hiérarchie de groupes d'administration avec des abonnements de plateforme et de charges de travail), les conventions de nommage et d'étiquetage, et la méthodologie de migration.

Quand deux options satisfont toutes les exigences, l'examen préfère, dans cet ordre : un service de plateforme à des machines virtuelles, une fonctionnalité intégrée à du code personnalisé, une identité à un secret, et une stratégie à une procédure manuelle.

<!-- section: confusing-pairs -->
## Les services faciles à confondre

Les propositions viennent de la même famille de produits. Retenez la différence en une ligne :

| Famille | Options | Ce qui les sépare |
| --- | --- | --- |
| Objectifs de récupération | RPO, RTO | Le RPO est la quantité de données que l'on peut perdre ; le RTO est le délai de remise en service |
| Portée de la résilience | Zones de disponibilité, seconde région | Les zones survivent à la panne d'un centre de données ; seule une autre région survit à une panne régionale |
| Protection | Sauvegarde Azure, Azure Site Recovery | La sauvegarde restaure les données à un point dans le temps ; Site Recovery réplique les machines pour basculer rapidement |
| Gouvernance | Azure Policy, Azure RBAC, verrous de ressources | Policy contrôle ce que les ressources peuvent être ; RBAC contrôle qui peut agir ; les verrous bloquent la suppression ou la modification pour tous |
| Informations d'identification des charges de travail | Identité managée, principal de service, Azure Key Vault | Une identité managée n'a aucun secret à gérer ; un principal de service a un secret ou un certificat ; Key Vault stocke les secrets qui restent |
| Bases de données relationnelles | Azure SQL Database, Azure SQL Managed Instance, SQL Server sur Machines virtuelles Azure | Base de données entièrement managée ; compatibilité presque complète avec une instance SQL Server ; contrôle total du système d'exploitation et de l'instance |
| Géoredondance SQL | Géoréplication active, groupes de basculement | Bases secondaires lisibles, base par base ; basculement groupé derrière des points de terminaison d'écouteur qui ne changent pas |
| Redondance du stockage | LRS, ZRS, GRS, GZRS | Un centre de données ; trois zones ; une seconde région ; des zones et une seconde région |
| Messagerie | Stockage File d'attente (Queue Storage), Service Bus, Event Grid, Event Hubs | File d'attente simple ; messagerie d'entreprise avec ordre et transactions ; notification et routage d'événements ; diffusion de télémétrie à grand volume |
| Équilibrage de charge | Azure Load Balancer, Application Gateway, Traffic Manager, Azure Front Door | Couche 4 régionale ; couche 7 régionale avec pare-feu d'applications web ; mondial, basé sur DNS ; couche 7 mondiale avec accélération et pare-feu d'applications web |
| Calcul | Azure Functions, Logic Apps, Container Apps, Azure Kubernetes Service, Azure Batch | Code piloté par les événements ; workflows à faible code ; conteneurs sans serveur ; Kubernetes complet ; travaux parallèles à grande échelle |
| Utilisateurs externes | Collaboration B2B, External ID dans un locataire externe | Des partenaires invités dans votre locataire de personnel ; les clients de vos applications dans un locataire séparé |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : les décisions d'identité, de gouvernance et de monitoring reviennent dans toutes les conceptions suivantes.
2. Pour chaque famille de services, écrivez votre propre tableau « exigence, réponse » et comparez-le à celui du chapitre.
3. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
4. Entraînez-vous aux études de cas : lisez d'abord les questions, puis cherchez dans les onglets les exigences dont chaque question dépend.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
