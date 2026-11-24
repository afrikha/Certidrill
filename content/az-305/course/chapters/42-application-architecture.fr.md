Une question d'architecture d'application décrit comment les composants doivent se parler (commandes, notifications, télémétrie, appels d'API), ce qui doit être partagé entre les instances (données en cache, paramètres) et comment l'application arrive en production. Dans chaque famille, plusieurs services Azure se ressemblent : ce sont les exigences qui désignent le bon.

<!-- section: messaging | objectives: 4.2.1 -->
## Recommander une architecture de messagerie

Un **message** transporte des données que l'expéditeur s'attend à voir traitées par un destinataire : une commande à exécuter, un paiement à enregistrer. Une file d'attente entre deux composants les découple : l'expéditeur n'attend pas, le destinataire travaille à son rythme (nivellement de charge) et plusieurs destinataires se partagent le travail (consommateurs concurrents). Une **rubrique** (topic) remet une copie de chaque message à chaque abonnement, avec des filtres (publication-abonnement).

| Exigence | Files d'attente de stockage | Service Bus |
| --- | --- | --- |
| File d'attente de plus de 80 Go | Oui, jusqu'à la capacité du compte de stockage | Non : de 1 à 5 Go en Basic et Standard (80 Go avec le partitionnement), 80 Go en Premium |
| Taille des messages | 64 Ko | 256 Ko en Standard, jusqu'à 100 Mo en Premium |
| Ordre premier entré, premier sorti garanti | Non | Oui, avec les sessions |
| Détection des doublons, transactions, file d'attente de lettres mortes automatique | Non | Oui |
| Publication-abonnement vers plusieurs consommateurs | Non | Oui, avec les rubriques et les abonnements |
| Remise | Au moins une fois | Au moins une fois (peek-lock) ou au plus une fois (receive and delete) |
| Réception sans interrogation répétée | Non | Oui, interrogation longue sur AMQP |

Les files d'attente de stockage sont la réponse simple et bon marché pour un arriéré de petits messages sans besoin d'ordre. Service Bus est le répartiteur d'entreprise, et son niveau fait partie de la réponse :

| Niveau | Ajoute |
| --- | --- |
| Basic | Files d'attente uniquement |
| Standard | Rubriques et abonnements, sessions, transactions, détection des doublons ; capacité partagée, facturée à l'opération |
| Premium | Unités de messagerie dédiées aux performances prévisibles, messages jusqu'à 100 Mo, points de terminaison privés et règles de réseau virtuel, clés gérées par le client, Geo-Disaster Recovery et Geo-Replication |

Tous les niveaux sont redondants interzones là où les zones existent. Pour une panne régionale, Premium propose Geo-Disaster Recovery, qui ne réplique que les métadonnées de l'espace de noms (entités, configuration), et Geo-Replication, qui réplique aussi les messages.

> **Piège d'examen.** « Les messages doivent être traités dans l'ordre d'envoi » ou « chaque commande doit être traitée exactement une fois » exige les sessions ou la détection des doublons de Service Bus, en Standard au minimum. « Accéder à l'espace de noms par un point de terminaison privé » exige Premium.

<!-- section: events | objectives: 4.2.2 -->
## Recommander une architecture basée sur les événements

Un **événement** est une notification légère indiquant que quelque chose s'est produit ; l'éditeur n'attend rien des consommateurs. Les événements sont soit discrets (un objet blob a été créé), soit une série continue (télémétrie).

| Service | Rôle | Exigence typique |
| --- | --- | --- |
| Event Grid | Routage d'événements discrets vers des gestionnaires | Réagir à un changement dans une ressource Azure ou une application ; serverless, paiement à l'événement |
| Event Hubs | Ingestion de flux d'événements | Télémétrie, parcours de navigation, journaux : des millions d'événements par seconde, relus par plusieurs lecteurs |
| Service Bus | Messagerie transactionnelle | Commandes, transactions financières, workflows |

**Event Grid** pousse les événements vers des gestionnaires : Azure Functions, Logic Apps, webhooks, files d'attente et rubriques Service Bus, Event Hubs, files d'attente de stockage. Les sources sont les rubriques système (événements de services Azure comme le Stockage ou Resource Manager), les rubriques personnalisées (vos applications) et les rubriques partenaires. La remise est au moins une fois et sans ordre ; Event Grid réessaie avec un backoff exponentiel pendant 24 heures au plus, puis abandonne l'événement sauf si un conteneur d'objets blob de lettres mortes est configuré. Les espaces de noms Event Grid ajoutent la remise par extraction (pull), où les consommateurs lisent à leur rythme, et un répartiteur MQTT pour les appareils.

**Event Hubs** stocke les événements dans des partitions pendant une période de rétention ; chaque groupe de consommateurs lit le flux indépendamment et peut le rejouer. Son point de terminaison Kafka accepte les clients Kafka existants moyennant un simple changement de configuration.

| Niveau | Rétention maximale | Remarques |
| --- | --- | --- |
| Basic | 1 jour | Un seul groupe de consommateurs ; ni Kafka, ni Capture |
| Standard | 7 jours | Point de terminaison Kafka, Capture vers le Stockage Blob ou Data Lake Storage (facturée séparément), points de terminaison privés, Geo-Disaster Recovery |
| Premium | 90 jours | Capture incluse, Geo-Replication, unités de traitement isolées |
| Dedicated | 90 jours | Cluster monolocataire pour les volumes les plus élevés |

Les services se combinent : Event Hubs ingère la télémétrie pour l'analytique pendant qu'Event Grid déclenche une fonction à l'arrivée d'un fichier, et Service Bus transporte les commandes qui en résultent.

> **Piège d'examen.** Event Grid ne stocke pas un flux pour le rejouer plus tard, et Event Hubs ne route pas des événements individuels vers des gestionnaires avec des filtres. « Réagir à la création d'un objet blob » désigne Event Grid ; « ingérer la télémétrie d'appareils pour Stream Analytics » désigne Event Hubs.

> **Conseil d'examen.** « Producteurs Kafka existants, sans réécrire l'application » désigne Event Hubs en Standard ou supérieur. « Conserver automatiquement les événements bruts dans un lac de données » désigne Event Hubs Capture.

<!-- section: api-integration | objectives: 4.2.3 -->
## Recommander une solution d'intégration des API

**Azure API Management** place une passerelle devant les API principales, où qu'elles s'exécutent. La passerelle est une façade : les services principaux peuvent changer sans affecter les consommateurs. Ses composants :

- **Passerelle d'API** : vérifie les clés d'abonnement, les jetons (JWT) et les certificats, applique les limites de débit et les quotas, transforme les requêtes et les réponses, met les réponses en cache, émet des journaux et des métriques.
- **Stratégies** : instructions exécutées sur la requête ou la réponse, à l'étendue globale, du produit, de l'API ou de l'opération.
- **Produits et abonnements** : regroupent des API pour les consommateurs, qui obtiennent une clé d'abonnement, avec ou sans approbation.
- **Portail des développeurs** : documentation générée où les consommateurs découvrent et testent les API et s'y abonnent.
- **Espaces de travail** : permettent à plusieurs équipes de gérer leurs propres API sur une instance partagée.

Le niveau découle des exigences de réseau et de géographie :

| Exigence | Niveau |
| --- | --- |
| Trafic sporadique, paiement à l'appel, aucune capacité fixe | Consumption |
| Évaluation et test de toutes les fonctionnalités, sans SLA | Developer |
| Atteindre des services principaux dans un réseau virtuel ; la passerelle reste publique | Standard v2 |
| Passerelle injectée dans un réseau virtuel, isolée en entrée et en sortie | Premium ou Premium v2 |
| Une instance avec des passerelles dans plusieurs régions | Premium |
| Passerelle auto-hébergée à côté d'API locales ou d'un autre cloud | Premium (Developer pour le test) |
| Zones de disponibilité | Premium ou Premium v2 |

Les niveaux v2 se déploient en quelques minutes et ont tous un SLA, mais ils n'offrent ni le déploiement multirégion ni la passerelle auto-hébergée. La **passerelle auto-hébergée** est un conteneur qui s'exécute près des API et reste géré depuis l'instance Azure : c'est la réponse à « un seul plan de gestion pour des API hébergées localement et dans plusieurs clouds ».

Pour exposer un système ancien dépourvu d'API, placez API Management devant un workflow Logic Apps ou une fonction ; l'importation automatisée d'une application logique en tant qu'API prend en charge les ressources Logic App (Consumption), pas les espaces de travail. Pour l'intégration avec des partenaires, Logic Apps fournit les connecteurs et API Management le point de terminaison sécurisé et documenté.

> **Piège d'examen.** Une passerelle d'application ou Front Door protège et équilibre le trafic HTTP ; aucun des deux ne publie de portail des développeurs, n'émet de clés d'abonnement ni n'applique de quotas par consommateur. Ces exigences désignent API Management.

<!-- section: caching | objectives: 4.2.4 -->
## Recommander une solution de mise en cache

Un cache répond à trois exigences : réduire la charge et la latence d'un magasin de données, partager un état entre des instances sans état, et servir du contenu statique près des utilisateurs.

| Exigence | Recommander |
| --- | --- |
| Mettre en cache en mémoire des résultats de requêtes ou des objets (modèle cache-aside) | Azure Managed Redis |
| Partager les sessions utilisateur entre des instances web | Azure Managed Redis comme magasin de sessions |
| Servir des images, des scripts et des téléchargements depuis des emplacements de périphérie | Mise en cache d'Azure Front Door |
| Éviter d'appeler un service principal pour des requêtes d'API identiques | Stratégie de mise en cache des réponses d'API Management, cache intégré ou cache Redis externe |

Avec le modèle **cache-aside**, l'application lit d'abord le cache, charge depuis la base de données en cas d'absence et écrit le résultat dans le cache avec une expiration ; elle invalide l'entrée quand la donnée change.

**Azure Managed Redis** est le service Redis actuel, fondé sur Redis Enterprise :

| Niveau | Profil |
| --- | --- |
| Memory Optimized | Le plus de mémoire par vCPU : grands jeux de données à débit modéré |
| Balanced | Charges de travail standard |
| Compute Optimized | Le plus de vCPU par Go : débit le plus élevé |
| Flash Optimized | Garde les données les moins utilisées sur un stockage NVMe : très grands jeux de données à moindre coût |

Activez la haute disponibilité en production : l'instance a alors au moins deux nœuds, répartis entre les zones là où la région en a. La géoréplication active relie des instances de plusieurs régions qui acceptent toutes les écritures ; des types de données répliqués sans conflit (CRDT) fusionnent les écritures avec une cohérence éventuelle et sans SLA sur le délai de synchronisation. Elle n'est pas disponible en Flash Optimized ni dans les références SKU Balanced B0 et B1. La persistance des données écrit des instantanés sur disque pour une récupération plus rapide ; ce n'est pas une sauvegarde. Authentifiez-vous avec Microsoft Entra ID et connectez-vous par un point de terminaison privé.

Azure Cache pour Redis est en cours de mise hors service : les niveaux Enterprise le 31 mars 2027, les niveaux Basic, Standard et Premium le 30 septembre 2028. Les nouvelles conceptions utilisent Azure Managed Redis.

Front Door ne met en cache que les réponses aux requêtes GET, par emplacement de périphérie : utilisez-le pour les ressources statiques et désactivez la mise en cache sur les routes qui renvoient des données propres à un utilisateur.

> **Piège d'examen.** Un cache n'est pas le système de référence : les données dans Redis peuvent être perdues lors d'un basculement ou d'une éviction. Une exigence de stockage durable et interrogeable désigne une base de données, avec le cache devant.

<!-- section: app-configuration | objectives: 4.2.5 -->
## Recommander une solution de gestion de la configuration des applications

| Besoin | Service |
| --- | --- |
| Paramètres et indicateurs de fonctionnalités partagés par plusieurs applications et environnements, modifiés sans redéploiement | Azure App Configuration |
| Secrets, clés et certificats | Azure Key Vault |
| Paramètres d'une seule application web, injectés comme variables d'environnement, éventuellement propres à un emplacement de déploiement | Paramètres d'application App Service |

**Azure App Configuration** stocke des paires clé-valeur de façon centralisée. Les étiquettes portent une valeur différente par environnement ou par version ; les indicateurs de fonctionnalités activent une fonctionnalité pour certains utilisateurs sans déploiement ; les applications actualisent leurs paramètres dynamiquement ; une relecture à un instant donné montre les valeurs à une date antérieure (historique des révisions conservé 7 jours en Free et Developer, 30 jours en Standard et Premium). App Configuration et Key Vault s'utilisent ensemble : une paire clé-valeur contient une **référence Key Vault**, et l'application résout le secret depuis le coffre avec son identité managée. L'accès au magasin lui-même utilise aussi Microsoft Entra ID et les identités managées, sans chaîne de connexion dans le code.

| Niveau | SLA | Remarques |
| --- | --- | --- |
| Free | Aucun | 10 Mo, 1 000 requêtes par jour |
| Developer | Aucun | Ajoute les points de terminaison privés |
| Standard | 99,9 %, 99,95 % avec la géoréplication | Ajoute la géoréplication, la suppression réversible (toujours active, impossible à désactiver), les clés gérées par le client |
| Premium | 99,9 %, 99,99 % avec la géoréplication | Aucun quota de requêtes |

> **Piège d'examen.** Ne stockez pas une chaîne de connexion ou un mot de passe dans App Configuration au motif qu'il chiffre les données : la conception recommandée garde le secret dans Key Vault et une référence dans App Configuration.

<!-- section: automated-deployment | objectives: 4.2.6 -->
## Recommander une solution de déploiement automatisé

Le déploiement automatisé comporte trois couches.

**Infrastructure en tant que code.** Les fichiers Bicep et les modèles ARM déclarent l'état cible ; un déploiement est idempotent et reproductible dans chaque environnement. Terraform est le choix des équipes qui gèrent plusieurs clouds avec un seul outil.

| Exigence | Recommander |
| --- | --- |
| Partager des modèles approuvés dans l'organisation, versionnés et protégés par Azure RBAC | Specs de modèle |
| Gérer un ensemble de ressources comme une seule unité, supprimer ce qui est retiré du modèle, bloquer les modifications et suppressions faites en dehors | Piles de déploiement avec paramètres de refus |
| Remplacer Azure Blueprints, mis hors service le 31 janvier 2027 | Piles de déploiement et specs de modèle |

**Pipelines.** Les workflows GitHub Actions ou Azure Pipelines génèrent, testent et déploient à chaque commit, avec des environnements, des approbations et une restauration automatisée. Ils se connectent à Azure par fédération des identités de charge de travail, sans secret stocké.

**Stratégie de mise en production.** L'objectif est un déploiement sans interruption et un retour arrière rapide :

| Plateforme | Mécanisme |
| --- | --- |
| App Service | Emplacements de déploiement (niveau Standard et supérieurs) : déployer dans un emplacement de préproduction, le préchauffer, l'échanger avec la production sans perdre de requêtes ; échanger à nouveau pour revenir en arrière ; router un pourcentage du trafic vers un emplacement pour tester en production |
| Container Apps | Révisions : en mode révisions multiples, fractionner le trafic entre les révisions pour des mises en production bleu-vert ou canari |
| AKS | Mises à jour progressives des déploiements Kubernetes |
| Groupes de machines virtuelles identiques | Nouvelle version d'image d'Azure Compute Gallery, appliquée par mises à niveau propagées |

Les paramètres marqués comme paramètres d'emplacement restent avec leur emplacement pendant un échange : l'emplacement de préproduction garde sa connexion à la base de données de test.

> **Conseil d'examen.** « Déployer une nouvelle version sans interruption et revenir en arrière immédiatement » pour une application web désigne un échange d'emplacements de déploiement. « Empêcher les administrateurs de supprimer les ressources déployées par le modèle » désigne une pile de déploiement avec paramètres de refus, pas un verrou de ressource posé à la main.

<!-- section: key-points -->
## Points clés

- Message : données à traiter, avec un contrat (files d'attente de stockage, Service Bus). Événement : notification (Event Grid pour les événements discrets, Event Hubs pour les flux).
- Files d'attente de stockage : simples, plus de 80 Go. Service Bus : ordre avec les sessions, détection des doublons, transactions, rubriques ; Premium pour les points de terminaison privés, les grands messages et les fonctionnalités géographiques.
- Event Grid pousse vers des gestionnaires, réessaie pendant 24 heures, envoie les lettres mortes dans un conteneur d'objets blob. Event Hubs conserve un flux rejouable : 7 jours en Standard, 90 en Premium ; point de terminaison Kafka ; Capture.
- API Management : stratégies, produits, abonnements, portail des développeurs. Premium pour le multirégion et la passerelle auto-hébergée ; Standard v2 pour atteindre des services principaux privés ; Consumption pour un trafic sporadique.
- Azure Managed Redis pour la mise en cache des données et des sessions, avec la haute disponibilité activée ; Front Door pour le contenu statique ; Azure Cache pour Redis est en cours de mise hors service.
- App Configuration pour les paramètres et les indicateurs de fonctionnalités, Key Vault pour les secrets, reliés par les références Key Vault et les identités managées.
- Bicep et specs de modèle pour l'infrastructure, piles de déploiement pour la gérer et la protéger, pipelines pour livrer, emplacements ou révisions pour mettre en production sans interruption.
