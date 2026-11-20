Dans un environnement multicomptes et multi-Régions, le transfert de données est souvent la ligne de facture que personne ne possède : chaque gigaoctet qui traverse une zone de disponibilité, une Région, une passerelle NAT, une passerelle de transit ou un point de terminaison porte ses propres frais, et ces frais tombent dans le compte qui l'envoie. Les questions SAP-C03 décrivent un flux de trafic entre comptes, Régions ou sites sur site et demandent la topologie qui respecte l'exigence (confidentialité, disponibilité, résidence des données, RPO) au coût réseau le plus bas. Les prix ci-dessous sont des exemples AWS pour des Régions américaines : retenez la structure et l'ordre relatif, pas les centimes.

<!-- section: content-delivery | objectives: 3.2.1 -->
## Diffusion de contenu, origines et mise en cache

Amazon CloudFront réduit les coûts de deux façons : les récupérations depuis des origines AWS (S3, ELB, EC2) ne sont pas facturées comme transfert de données sortant, et chaque succès de cache (cache hit) est une requête que l'origine ne sert jamais.

**Choix de l'origine.**

| Contenu | Conception de l'origine |
| --- | --- |
| Ressources statiques, téléchargements, segments vidéo | Compartiment S3 accessible uniquement via un contrôle d'accès à l'origine (origin access control) |
| Application dynamique dans des sous-réseaux privés | ALB ou EC2 comme origine VPC CloudFront (VPC origin), sans exposition publique |
| Application active-active dans deux Régions | Enregistrement Route 53 à routage basé sur la latence comme nom de domaine d'origine, ou choix de l'origine par requête dans Lambda@Edge |
| Origine hors d'AWS à bande passante limitée | Origine personnalisée précédée d'Origin Shield |

**Stratégie de mise en cache.** La clé de cache détermine le taux de succès. N'y incluez que les en-têtes, cookies et chaînes de requête qui changent réellement la réponse (une politique de cache) ; transmettez le reste dont l'origine a besoin par une politique de requête d'origine, qui ne fragmente pas le cache. Activez la compression, fixez des TTL longs sur des noms de fichiers versionnés plutôt que de payer des invalidations, et séparez les comportements de cache par chemin (`/static/*` TTL long, `/api/*` sans cache).

**Origin Shield** ajoute une couche de cache devant une origine, dans la Région la plus proche en latence de celle-ci (la Région de l'origine quand elle est prise en charge). Tous les caches périphériques régionaux passent par lui, donc des absences simultanées pour le même objet sont regroupées en aussi peu qu'une seule requête vers l'origine. Cela réduit la charge de l'origine et le coût de l'empaquetage à la volée, de la transformation d'images et du transfert sortant de l'origine.

- Facturé par requête qui atteint Origin Shield comme couche supplémentaire ; les requêtes dynamiques (PUT, POST, PATCH, DELETE, ou TTL inférieur à 3 600 secondes) paient toujours ; les requêtes issues du cache périphérique régional situé dans la même Région qu'Origin Shield le contournent sans frais.
- Bon choix : spectateurs répartis sur plusieurs zones géographiques, origines de streaming en direct ou de traitement d'images, origines sur site, configurations multi-CDN. Mauvais choix : contenu dynamique, peu cachable ou rarement demandé.

**Basculement d'origine.** Un groupe d'origines (origin group) a une origine principale et une secondaire. CloudFront bascule sur les codes d'état configurés (400, 403, 404, 416, 429, 500, 502, 503, 504), en cas d'échec de connexion ou de délai dépassé, et uniquement pour les requêtes GET, HEAD et OPTIONS. Par défaut, il essaie l'origine principale jusqu'à 30 secondes (3 tentatives de 10 secondes) avant de basculer ; réduisez le délai de connexion ou le nombre de tentatives pour basculer plus vite. Chaque nouvelle requête essaie toujours d'abord l'origine principale. Chaque origine d'un groupe peut avoir son propre Origin Shield.

```yaml
Origins:
  - Id: primary-eu-west-1
    DomainName: media-eu-west-1.s3.eu-west-1.amazonaws.com
    ConnectionAttempts: 2
    ConnectionTimeout: 5
    OriginShield:
      Enabled: true
      OriginShieldRegion: eu-west-1
```

> **Piège d'examen.** Le basculement d'origine ne protège pas les écritures : un POST ou un PUT vers une origine principale défaillante n'est pas réessayé sur la secondaire. Un chemin d'écriture qui doit survivre à une panne régionale exige un basculement Route 53 ou un backend actif-actif, pas un groupe d'origines.

<!-- section: private-connectivity-costs | objectives: 3.2.2 -->
## Connectivité privée et trafic conscient des zones

**Qui paie quoi.**

| Chemin | Structure de coût (exemple américain) |
| --- | --- |
| Passerelle NAT | 0,045 USD par heure et par passerelle (une passerelle NAT régionale est facturée par zone active) plus 0,045 USD par Go traité, plus le transfert de données |
| Point de terminaison de passerelle pour S3 ou DynamoDB | Aucun frais horaire ni de traitement |
| Point de terminaison d'interface (PrivateLink) | Environ 0,01 USD par heure et par zone, plus 0,01 USD par Go pour le premier Po de la Région (paliers inférieurs ensuite) |
| Trafic entre zones dans un VPC ou via un appairage de VPC | 0,01 USD par Go dans chaque sens |
| Trafic dans une même zone sur des adresses IP privées | Gratuit |
| Passerelle Internet de sortie uniquement (egress-only) pour IPv6 | Aucun frais de traitement, seulement le transfert sortant |

**Centraliser ou distribuer ?** Les questions professionnelles comparent des ressources par VPC à des ressources partagées derrière AWS Transit Gateway :

| Conception | Économise | Ajoute |
| --- | --- | --- |
| VPC de sortie centralisé avec des passerelles NAT atteintes via Transit Gateway | Les heures de passerelle NAT dans chaque VPC rayon | Le traitement Transit Gateway (0,02 USD par Go) en plus du traitement NAT pour chaque octet |
| Points de terminaison d'interface centralisés dans un VPC de services partagés, zones hébergées privées associées aux rayons | Les heures de points de terminaison multipliées par les VPC et les zones | Le traitement Transit Gateway pour le trafic des points de terminaison |
| Points de terminaison de passerelle dans chaque VPC | Tout le traitement NAT pour S3 et DynamoDB | Rien (ils ne peuvent pas être partagés entre VPC) |

Règle pratique : beaucoup de petits VPC à faible trafic favorisent la centralisation (les frais horaires fixes dominent) ; quelques VPC qui envoient des téraoctets favorisent les points de terminaison et le NAT locaux (les frais au Go dominent). Le trafic S3 et DynamoDB doit toujours passer par des points de terminaison de passerelle locaux.

**Architecture consciente des zones de disponibilité.** Gardez une requête dans la zone où elle est arrivée :

- Une passerelle NAT par zone (ou une passerelle NAT régionale), chaque table de routage privée pointant vers sa propre zone.
- L'équilibrage entre zones du Network Load Balancer est désactivé par défaut ; l'activer ajoute des frais entre zones.
- Utilisez les noms DNS zonaux des points de terminaison d'interface, et le routage conscient de la topologie dans Amazon EKS, pour que les clients atteignent une cible de leur zone.
- Des réplicas en lecture et des caches par zone pour les chemins de lecture bavards ; placez les traitements par lots dans la zone de leur magasin de données quand la disponibilité le permet.

> **Conseil d'examen.** « Réduire les frais de passerelle NAT » avec un trafic S3 ou DynamoDB important se résout par des points de terminaison de passerelle, pas par un VPC de sortie centralisé : la centralisation supprime des frais horaires mais ajoute le traitement Transit Gateway sur chaque Go.

<!-- section: multi-region-replication | objectives: 3.2.3 -->
## Réplication multi-Régions consciente des coûts

Ne répliquez que ce dont l'exigence de reprise ou de latence a besoin, vers les seules Régions qui en ont besoin, sous la forme la moins chère qui respecte encore le RPO.

**Frais de réplication Amazon S3.**

- Stockage de la réplique dans la classe de stockage de destination, requêtes PUT de réplication et, pour Cross-Region Replication, transfert de données sortant entre Régions depuis la Région source.
- S3 Replication Time Control (réplique la plupart des objets en quelques secondes, SLA de 15 minutes) ajoute des frais par Go et des métriques de réplication facturées comme des métriques personnalisées CloudWatch.
- S3 Batch Replication pour les objets existants ajoute les frais de S3 Batch Operations (exemple : 0,25 USD par tâche et 1,00 USD par million d'objets).
- Les Multi-Region Access Points ajoutent des frais de routage des données (0,0033 USD par Go) en plus du transfert.

Leviers de coût : filtrez les règles par préfixe ou balise, répliquez les copies de reprise directement dans une classe plus froide (S3 Glacier Instant Retrieval ou S3 Glacier Deep Archive, selon le RTO), ne répliquez pas les marqueurs de suppression quand la copie sert de filet de sécurité, et n'utilisez RTC que si l'énoncé fixe un objectif de délai de réplication.

```json
{
  "Role": "arn:aws:iam::111122223333:role/s3-replication-finance",
  "Rules": [
    {
      "ID": "finance-dr-copy",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": { "Prefix": "ledgers/" },
      "DeleteMarkerReplication": { "Status": "Disabled" },
      "Destination": {
        "Bucket": "arn:aws:s3:::anycompany-finance-dr-eu-central-1",
        "Account": "444455556666",
        "StorageClass": "GLACIER_IR",
        "AccessControlTranslation": { "Owner": "Destination" }
      }
    }
  ]
}
```

**Tables globales Amazon DynamoDB.** Chaque réplica facture ses propres lectures et son stockage, plus les écritures répliquées : unités de requêtes d'écriture répliquées (à la demande) ou WCU répliquées (provisionné). Le transfert de données entre Régions est facturé. La capacité réservée peut couvrir les RCU et WCU d'une table globale, mais pas les WCU répliquées. Ajouter un réplica facture une restauration par Go. Un réplica aux données volumineuses et rarement lues peut utiliser la classe de table Standard-IA pour réduire le stockage (exemple : 0,10 USD au lieu de 0,25 USD par Go-mois). Chaque Région supplémentaire multiplie la facture d'écriture : une troisième Région doit se justifier par la latence ou une exigence, pas être ajoutée par défaut.

**Amazon Aurora Global Database.** Les Régions secondaires paient leurs instances et leur stockage, les opérations d'E/S d'écriture répliquées (égales aux écritures de la Région principale) et le transfert de données. Un cluster secondaire de petite taille pour la reprise coûte moins cher qu'un cluster de taille réelle, mais allonge le délai pour absorber la charge de production après un basculement.

| Exigence | Conception consciente des coûts |
| --- | --- |
| Copie de reprise d'objets, RTO de plusieurs heures | CRR des préfixes nécessaires vers une classe Glacier dans une seule Région |
| La conformité exige un délai de réplication démontrable | CRR avec S3 RTC |
| Écritures multi-Régions pour une base d'utilisateurs mondiale | Tables globales DynamoDB dans les Régions qui servent les utilisateurs |
| Reprise relationnelle avec un RPO d'environ une seconde, basculement rare | Aurora Global Database avec un secondaire plus petit |
| Les objets existants doivent être copiés une fois vers une nouvelle Région | S3 Batch Replication |

> **Piège d'examen.** Same-Region Replication n'a pas de frais de transfert entre Régions, mais ne survit pas à une panne régionale. Quand l'énoncé exige une résilience régionale, SRR est faux même s'il est moins cher.

<!-- section: network-architecture-costs | objectives: 3.2.4 -->
## Modèles de tarification des architectures réseau

| Service | Frais horaires | Frais par Go | Qui paie |
| --- | --- | --- | --- |
| Appairage de VPC | Aucun | Pas de traitement ; tarifs normaux de transfert entre zones et entre Régions | Chaque compte pour son propre transfert de données |
| AWS Transit Gateway | 0,05 USD par heure d'attachement (USA Est (Ohio)) | 0,02 USD de traitement pour les données envoyées dans la passerelle de transit depuis un VPC, Direct Connect, un VPN ou Network Firewall ; rien pour les données arrivant d'un attachement d'appairage | Le propriétaire de l'attachement paie les heures ; le côté émetteur paie le traitement |
| AWS PrivateLink (point de terminaison d'interface) | Environ 0,01 USD par point de terminaison et par zone | Traitement par paliers à partir de 0,01 USD | Le consommateur (propriétaire du point de terminaison) ; pour PrivateLink entre Régions, le consommateur paie aussi le transfert entre Régions et le fournisseur paie des frais horaires par Région distante active |
| Amazon VPC Lattice | 0,025 USD par heure de service ; 0,10 USD par heure de ressource pour les configurations de ressources | 0,025 USD par Go pour les services (trafic entre zones inclus) ; 0,10 USD par million de requêtes au-delà de 300 000 gratuites par heure | Le consommateur paie les frais des configurations de ressources |
| AWS Cloud WAN | 0,50 USD par heure de périphérie de réseau central (core network edge) ; heures d'attachement (par exemple 0,065 USD par attachement de VPC en USA Est (Virginie du Nord)) | 0,02 USD de traitement pour les données envoyées depuis un VPC, un VPN ou Direct Connect | Facturé par périphérie, par attachement et par Go, plus le transfert entre Régions |

Exemple entre Régions avec Transit Gateway : 1 Go de Virginie du Nord vers l'Oregon via un attachement d'appairage coûte 0,02 USD de traitement plus 0,02 USD de transfert entre Régions ; la passerelle de transit réceptrice n'ajoute rien.

| Situation | Conception la moins chère qui y répond |
| --- | --- |
| Deux VPC échangent des dizaines de To par mois | Appairage de VPC (aucun frais de traitement) |
| Deux cents VPC dans de nombreux comptes ont besoin d'un routage tous-vers-tous | Transit Gateway partagée via AWS RAM ; l'appairage ne passerait pas à l'échelle de ce maillage |
| Un service SaaS consommé par des centaines de VPC aux plages CIDR qui se chevauchent | Service de point de terminaison PrivateLink derrière un NLB |
| Appels HTTP de service à service entre comptes avec autorisation IAM, sans routage à gérer | Réseau de services VPC Lattice |
| WAN mondial sur de nombreuses Régions avec des politiques de segments | Cloud WAN |

Les données de répartition fractionnée des coûts (split cost allocation data) peuvent affecter les frais de passerelle NAT, d'EC2 et d'appairage de VPC aux comptes qui ont généré le trafic (voir le chapitre 33), ce qui facilite la refacturation des comptes réseau partagés.

> **Piège d'examen.** Transit Gateway se choisit pour l'échelle et le contrôle central, pas pour le prix : pour une seule paire de VPC à fort volume, elle ajoute 0,02 USD par Go que l'appairage ne facture pas. La réponse « MOST cost-effective » pour peu de VPC avec un trafic important est l'appairage.

<!-- section: ai-ml-transfer | objectives: 3.2.5 -->
## Transfert de données des charges de travail d'IA et de ML

**L'inférence entre Régions de Bedrock (cross-Region inference)** achemine les requêtes, via un profil d'inférence, vers d'autres Régions pour gagner en débit et en résilience :

| Aspect | Profil géographique | Profil global |
| --- | --- | --- |
| Où s'exécutent les requêtes | Une Région commerciale d'une zone géographique (par exemple US, EU, APAC) | Toute Région commerciale prise en charge dans le monde |
| Prix | Tarification standard | Environ 10 % d'économie |
| Coût de routage | Aucun ; prix de la Région depuis laquelle vous appelez le profil | Aucun ; même règle |
| Exigence de SCP | Autoriser chaque Région de destination du profil | Autoriser la valeur `unspecified` de `aws:RequestedRegion` |
| À choisir pour | Règles de résidence des données | Optimisation des coûts sans restriction géographique |

Autres faits : les données restent sur le réseau AWS et sont chiffrées entre Régions ; CloudTrail journalise la requête dans la Région source, avec `additionalEventData.inferenceRegion` qui indique où elle s'est exécutée ; les requêtes peuvent être acheminées vers des Régions non activées dans le compte ; les profils d'inférence ne prennent pas en charge Provisioned Throughput.

**Gardez les données près de l'appel au modèle.**

- Placez la base de connaissances, le magasin de vecteurs et les documents sources d'une application RAG dans la Région depuis laquelle l'inférence est appelée, pour que la récupération ne traverse pas les Régions à chaque invite.
- Déposez les entrées et sorties de l'inférence par lots dans un compartiment S3 de la Région de la tâche.
- Atteignez les points de terminaison Bedrock et SageMaker AI depuis des sous-réseaux privés via des points de terminaison d'interface quand le trafic est élevé : le traitement du point de terminaison (0,01 USD par Go) coûte moins que le traitement NAT (0,045 USD par Go).
- Les entrées du cache d'invites vivent là où la requête a été traitée ; le routage entre Régions peut écrire une nouvelle entrée au lieu d'en lire une, donc mesurez le taux de succès du cache avant de passer une charge très dépendante du cache à un profil global.
- Les gros artefacts de modèles ou jeux de données d'entraînement doivent être copiés une fois dans la Région où ils sont utilisés, pas lus entre Régions par chaque tâche.

> **Conseil d'examen.** « Coût le plus bas, aucune contrainte de résidence » pour Bedrock correspond à un profil global d'inférence entre Régions. « Les données de l'UE doivent rester dans l'UE » correspond à un profil géographique EU, avec la SCP de restriction des Régions de l'organisation mise à jour pour autoriser ses Régions de destination.

<!-- section: key-points -->
## Points clés

- CloudFront : les récupérations depuis des origines AWS sont gratuites ; des clés de cache réduites et des TTL longs sur des noms versionnés augmentent le taux de succès ; Origin Shield regroupe les absences en une seule requête d'origine.
- Les groupes d'origines ne basculent que GET, HEAD et OPTIONS ; 30 secondes par défaut avant le basculement.
- Traitement NAT 0,045 USD par Go, points de terminaison d'interface 0,01 USD par Go, points de terminaison de passerelle gratuits ; entre zones 0,01 USD par Go dans chaque sens.
- La sortie ou les points de terminaison centralisés économisent des frais horaires mais ajoutent 0,02 USD par Go de traitement Transit Gateway.
- S3 CRR : stockage de destination, PUT, transfert entre Régions, RTC facultatif ; filtrez et répliquez vers des classes plus froides. Les tables globales DynamoDB multiplient les écritures répliquées par Région.
- L'appairage n'a pas de frais de traitement ; Transit Gateway facture par heure d'attachement et par Go envoyé ; PrivateLink facture le consommateur ; VPC Lattice facture par heure de service, Go et requête ; Cloud WAN par heure de périphérie, attachement et Go.
- L'inférence entre Régions de Bedrock n'a pas de frais de routage ; les profils globaux économisent environ 10 %, les profils géographiques préservent la résidence ; les SCP doivent autoriser les Régions de destination ou `unspecified`.
