Les questions de dépannage réseau donnent un symptôme (délai d'attente dépassé, 502, page périmée, tunnel en panne, utilisateurs lents) et un élément de preuve (une table de routage, une ligne de journal, une métrique). Suivez le paquet saut par saut, nommez le composant qui le bloque ou le ralentit, et choisissez la correction la plus simple ou le bon outil. Un délai dépassé signifie en général qu'un élément a rejeté le trafic sans rien dire ; une erreur HTTP signifie que le trafic est arrivé et que quelque chose a répondu.

<!-- section: vpc-path | objectives: 5.3.1 -->
## Dépanner les configurations de VPC

Vérifiez le chemin dans cet ordre, dans les deux sens :

| Saut | À vérifier | Défaut typique |
| --- | --- | --- |
| Table de routage du sous-réseau source | Une route vers la destination (`local`, passerelle Internet, passerelle NAT, appairage, passerelle de transit, passerelle réseau privé virtuel, point de terminaison) | Route manquante vers le CIDR du pair ; instance privée routée vers une passerelle Internet |
| Groupe de sécurité (avec état) | Règle entrante sur le port de destination depuis la source (CIDR, liste de préfixes ou groupe de sécurité) ; le trafic de retour est automatique | Règle sur le mauvais port ou le mauvais groupe de sécurité source |
| Liste ACL réseau (sans état, règles évaluées par numéro, la première correspondance l'emporte) | Règles entrantes et sortantes dans les deux sous-réseaux, y compris les **ports éphémères 1024-65535** pour les réponses | ACL réseau personnalisée qui autorise le port 443 en entrée mais pas les ports éphémères en sortie |
| Accès public | Sous-réseau public, IPv4 publique ou adresse IP Elastic, passerelle Internet attachée | Instance dans un sous-réseau « public » sans IP publique |

Défauts propres à chaque composant :

- **Passerelle NAT** : dans un sous-réseau public dont la table de routage envoie `0.0.0.0/0` vers la passerelle Internet ; les sous-réseaux privés routent `0.0.0.0/0` vers elle. Les connexions inactives expirent après 350 secondes (RST) : activez le keepalive TCP. `ErrorPortAllocation` supérieur à zéro signale un épuisement des ports (55 000 connexions simultanées par adresse IPv4 vers une même destination) : ajoutez des adresses IPv4 secondaires ou d'autres passerelles NAT.
- **Appairage de VPC** : routes des deux côtés, règles autorisant le CIDR du pair, pas de CIDR qui se chevauchent, pas de routage transitif ni de bout en bout (edge-to-edge).
- **Passerelle de transit** : la table de routage du sous-réseau doit pointer vers l'ID `tgw-` ; l'attachement doit être **associé** à une table de routage de la passerelle de transit qui contient une route vers la destination (propagée ou statique), et l'attachement de destination doit avoir une route de retour. Une route blackhole rejette le trafic correspondant. Donnez à l'attachement un sous-réseau dans chaque zone de disponibilité qui envoie du trafic ; activez le **mode appliance** pour les appliances avec état d'un VPC d'inspection.

Outils de diagnostic :

| Outil | Répond à |
| --- | --- |
| VPC Reachability Analyzer | Existe-t-il un chemin de cette source vers cette destination ? Il analyse uniquement la configuration, n'envoie aucun paquet et nomme le composant bloquant (table de routage, groupe de sécurité, ACL réseau, équilibreur de charge) |
| Network Access Analyzer | Quels chemins non voulus existent (par exemple tous les chemins depuis internet vers un sous-réseau de base de données) ? |
| Journaux de flux VPC | Les paquets ont-ils réellement atteint l'ENI, et ont-ils été acceptés ou rejetés ? |

```bash
aws ec2 create-network-insights-path \
  --source i-0123456789abcdef0 \
  --destination i-0fedcba9876543210 \
  --protocol tcp --destination-port 5432

aws ec2 start-network-insights-analysis \
  --network-insights-path-id nip-0a1b2c3d4e5f67890
```

> **Piège d'examen.** Un groupe de sécurité ne peut pas refuser : il ne fait qu'autoriser. Pour bloquer une plage d'IP malveillante, ajoutez une règle DENY avec un numéro plus petit dans la liste ACL réseau (ou utilisez AWS WAF pour le trafic HTTP).

<!-- section: vpc-flow-logs | objectives: 5.3.2 -->
## Collecter et lire les journaux de flux VPC

Les journaux de flux capturent les métadonnées du trafic IP (pas le contenu) d'un VPC, d'un sous-réseau ou d'une interface réseau, publiées vers **CloudWatch Logs**, **Amazon S3** ou **Amazon Data Firehose** (les passerelles de transit ont leurs propres journaux de flux). L'intervalle d'agrégation maximal est de 10 minutes ou 1 minute. La configuration et le format d'un journal de flux ne sont pas modifiables : supprimez-le et recréez-le.

Champs du format par défaut, dans l'ordre : `version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status`. Le protocole 6 est TCP, 17 UDP, 1 ICMP.

```text
2 111122223333 eni-0a1b2c3d4e5f60001 198.51.100.24 10.20.1.15 51544 443 6 12 3120 1763560200 1763560260 ACCEPT OK
2 111122223333 eni-0a1b2c3d4e5f60001 10.20.1.15 198.51.100.24 443 51544 6 10 8420 1763560200 1763560260 REJECT OK
2 111122223333 eni-0a1b2c3d4e5f60002 203.0.113.77 10.20.2.40 40112 22 6 3 180 1763560200 1763560260 REJECT OK
```

Lecture :

- ACCEPT en entrée puis REJECT en sortie pour la réponse (lignes 1 et 2) : le groupe de sécurité avec état a autorisé la requête et la **liste ACL réseau** a bloqué la réponse sur le port éphémère.
- Un seul REJECT en entrée (ligne 3) : le groupe de sécurité ou l'ACL réseau a refusé la requête.
- `NODATA` : aucun trafic pendant l'intervalle ; `SKIPDATA` : enregistrements ignorés (capacité).
- Derrière une passerelle NAT ou un équilibreur de charge, les champs personnalisés `pkt-srcaddr` et `pkt-dstaddr` donnent les adresses d'origine ; `tcp-flags` et `flow-direction` séparent requêtes et réponses.

Non capturés : le trafic vers le serveur DNS Amazon, les métadonnées d'instance (`169.254.169.254`), Amazon Time Sync (`169.254.169.123`), DHCP, ARP, l'activation de licence Windows, l'adresse réservée du routeur du VPC, et le trafic entre une ENI de point de terminaison et une ENI de NLB.

Interrogez les journaux de flux dans CloudWatch Logs Insights (ou dans S3 avec Athena) :

```text
fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter action = "REJECT" and dstPort = 443
| stats count(*) as rejects by srcAddr
| sort rejects desc
| limit 20
```

> **Conseil d'examen.** Les journaux de flux disent si le trafic a été accepté ou rejeté, pas pourquoi : un REJECT n'indique pas si c'est le groupe de sécurité ou l'ACL réseau qui a décidé. Combinez-le avec la règle d'état ci-dessus, ou lancez Reachability Analyzer pour nommer le composant.

<!-- section: service-logs | objectives: 5.3.2 -->
## Journaux des équilibreurs de charge, d'AWS WAF, de CloudFront et des conteneurs

| Source | Activation et destination | Ce qu'ils montrent |
| --- | --- | --- |
| Journaux d'accès ALB | Désactivés par défaut ; compartiment S3 dans la même Région, dont la politique de compartiment autorise Elastic Load Balancing à écrire ; un fichier par nœud toutes les 5 minutes | IP du client et de la cible, les trois temps de traitement, `elb_status_code`, `target_status_code`, `error_reason` |
| Journaux d'accès NLB | S3, uniquement pour les écouteurs TLS | Détails des connexions TLS |
| Journaux AWS WAF | CloudWatch Logs, S3 ou Firehose ; le nom du groupe de journaux, du compartiment ou du flux doit commencer par `aws-waf-logs-` ; une destination par liste ACL web | `action`, `terminatingRuleId`, règles et étiquettes correspondantes, `httpRequest` (IP client, pays, URI, en-têtes) ; des filtres conservent ou écartent des enregistrements, la rédaction masque des champs |
| Journaux standard CloudFront | v2 : CloudWatch Logs, S3 ou Firehose (flux dans us-east-1) ; ancienne version : S3 | Une ligne par requête : `sc-status`, `x-edge-result-type`, `x-edge-detailed-result-type`, `time-taken`, URI et chaîne de requête |
| Journaux en temps réel CloudFront | Kinesis Data Streams, taux d'échantillonnage de 1 à 100 %, livrés en quelques secondes | Champs choisis, dont la latence du premier octet de l'origine |
| Conteneurs ECS | Pilote de journalisation `awslogs` vers CloudWatch Logs (le rôle d'exécution de tâche a besoin de `logs:CreateLogStream` et `logs:PutLogEvents`), ou FireLens avec Fluent Bit | `stdout` et `stderr` des conteneurs |
| Conteneurs EKS | Module complémentaire Amazon CloudWatch Observability EKS (agent CloudWatch, Fluent Bit) | `/aws/containerinsights/<cluster>/application` et d'autres groupes de journaux |

Interpréter les enregistrements ALB :

| Indice | Signification |
| --- | --- |
| `elb_status_code` 502, `target_status_code` `-` | La cible a réinitialisé ou fermé la connexion, ou renvoyé une réponse mal formée ; vérifiez un keep-alive plus court que le délai d'inactivité de l'ALB |
| 503, pas de statut de cible | Aucune cible enregistrée ou saine dans le groupe cible |
| 504, `target_processing_time` -1 | La cible n'a pas répondu avant le délai d'inactivité, ou le délai de connexion de 10 secondes a expiré (groupe de sécurité, ports éphémères de l'ACL réseau) |
| `elb_status_code` égal à `target_status_code` (par exemple 500) | L'application a produit l'erreur, pas l'équilibreur de charge |

Les métriques séparent les deux côtés : `HTTPCode_ELB_5XX_Count` d'un côté, `HTTPCode_Target_5XX_Count` de l'autre.

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/orders-api",
      "awslogs-region": "eu-west-1",
      "awslogs-stream-prefix": "orders",
      "awslogs-create-group": "true"
    }
  }
}
```

> **Piège d'examen.** Des utilisateurs légitimes reçoivent un HTTP 403 après l'attachement d'AWS WAF : lisez dans les journaux WAF le `terminatingRuleId`, puis passez cette seule règle gérée en Count (ou ajoutez une instruction de réduction de portée) au lieu de retirer tout le groupe de règles. Ni les journaux de flux ni les journaux d'accès ALB ne montrent quelle règle WAF a correspondu.

<!-- section: cloudfront-caching | objectives: 5.3.3 -->
## Identifier et corriger les problèmes de mise en cache CloudFront

La **clé de cache** décide si deux requêtes partagent un objet en cache. Elle est définie par la **politique de cache** (TTL, plus les en-têtes, cookies et chaînes de requête inclus dans la clé). La **politique de requête d'origine** ajoute des valeurs envoyées à l'origine sans fragmenter le cache. Des politiques gérées comme `CachingOptimized` et `CachingDisabled` couvrent les cas courants.

Règles de TTL (politique de cache ou paramètres hérités) :

| L'origine envoie | CloudFront met en cache pendant |
| --- | --- |
| Ni `Cache-Control` ni `Expires` | Le TTL par défaut (86 400 secondes dans la configuration héritée par défaut), ou le TTL minimal s'il est plus élevé |
| `max-age` ou `s-maxage` (`s-maxage` l'emporte pour CloudFront) | Cette valeur, bornée entre TTL minimal et TTL maximal |
| `no-cache`, `no-store` ou `private` | Pas de mise en cache si le TTL minimal vaut 0, sinon le TTL minimal (les trois TTL à 0 désactivent le cache) |

Symptômes et corrections :

| Symptôme | Cause | Correction |
| --- | --- | --- |
| Faible taux d'accès au cache, origine surchargée | La clé de cache inclut tous les en-têtes, cookies ou chaînes de requête, `User-Agent`, ou des paramètres dans un ordre ou une casse variables | Ne mettre dans la clé que les valeurs qui changent la réponse (`CloudFront-Is-Mobile-Viewer` au lieu de `User-Agent`) ; comportements séparés pour le statique et le dynamique ; Origin Shield |
| L'ancienne version est servie après un déploiement | Objet en cache jusqu'à l'expiration de son TTL | Créer une invalidation ou, mieux, utiliser des noms de fichiers versionnés (`app.3f9c.js`) |
| Des pages dynamiques ou propres à un utilisateur sont mises en cache | L'origine n'envoie pas de `Cache-Control` et le TTL par défaut s'applique, ou un TTL minimal supérieur à 0 passe outre `no-store` | Renvoyer `Cache-Control: private, no-store` avec un TTL minimal de 0, ou utiliser un comportement avec `CachingDisabled` |
| Une page d'erreur persiste après le rétablissement de l'origine | Les erreurs sont mises en cache pendant le TTL minimal de mise en cache des erreurs (10 secondes par défaut), ou le TTL d'une réponse d'erreur personnalisée | Réduire le TTL minimal de mise en cache des erreurs |
| HTTP 502 ou 504 sur des échecs d'accès au cache | 502 : échec TLS avec l'origine (certificat qui ne correspond pas au domaine de l'origine, expiré ou chaîne incomplète). 504 : origine injoignable ou plus lente que le délai de réponse (30 secondes par défaut) | Corriger le certificat ; autoriser la liste de préfixes CloudFront ; accélérer l'origine avant d'augmenter le délai |

Invalidations : les chemins sont sensibles à la casse ; `*` n'est un caractère générique qu'en dernière position ; un chemin avec caractère générique compte pour **un seul chemin** ; les 1 000 premiers chemins par mois sont gratuits par compte.

```bash
aws cloudfront create-invalidation \
  --distribution-id E2EXAMPLE7QK9L \
  --paths "/index.html" "/assets/*"
```

Indices : l'en-tête de réponse `X-Cache` (`Hit from cloudfront`, `Miss from cloudfront`, `RefreshHit from cloudfront`) et `Age` ; `x-edge-result-type` dans les journaux (`Hit`, `RefreshHit`, `Miss`, `Error`) et `x-edge-detailed-result-type` pour l'erreur exacte (`OriginDnsError`, `OriginConnectError`). **CacheHitRate** et **OriginLatency** sont des métriques supplémentaires payantes, activées par distribution et publiées dans us-east-1.

> **Piège d'examen.** Transmettre un en-tête « à l'origine » via une politique de requête d'origine ne l'ajoute pas à la clé de cache. Si les réponses varient selon cet en-tête, les utilisateurs reçoivent les variantes des autres tant que l'en-tête n'est pas ajouté à la politique de cache.

<!-- section: hybrid-private | objectives: 5.3.4 -->
## Problèmes de connectivité hybride et privée

**AWS Site-to-Site VPN** (deux tunnels par connexion) :

| Symptôme | À vérifier |
| --- | --- |
| Tunnel DOWN | Paramètres IKE de phase 1 ou 2 (chiffrement, intégrité, groupe DH, durée de vie), clé prépartagée, UDP 500 et 4500 ouverts, NAT-T quand la passerelle client est derrière un NAT ; délais de détection des pairs morts (DPD) |
| Tunnel UP mais aucun trafic | Table de routage du VPC : activer la **propagation des routes** depuis la passerelle réseau privé virtuel ou ajouter des routes statiques ; propagation dans la table de routage de la passerelle de transit pour un attachement VPN ; groupes de sécurité et ACL réseau qui autorisent le CIDR du site |
| Session BGP non établie | TCP 179 joignable sur la passerelle client, ASN, adresses internes du tunnel (`169.254.x.x/30`) |
| Un seul tunnel transporte le trafic, basculement lent | Configurer les deux tunnels sur l'équipement ; préférer BGP, dont la détection d'activité bascule le trafic vers le second tunnel |

Activez les **journaux Site-to-Site VPN** vers CloudWatch Logs : les journaux d'activité des tunnels montrent l'état des phases IKE, le DPD et des messages comme une non-concordance de clé prépartagée ; les journaux BGP montrent l'état de la session et les routes. `TunnelState` vaut 1 (UP), 0 (DOWN) ou une fraction quand seuls certains tunnels sont UP.

Sélection des routes : le préfixe le plus spécifique l'emporte, la route `local` du VPC l'emporte toujours, une route statique l'emporte sur une route propagée de même CIDR, et pour des préfixes identiques une passerelle réseau privé virtuel préfère les routes BGP de Direct Connect, puis les routes statiques VPN, puis les routes BGP VPN (AS PATH le plus court, puis MED le plus bas).

**AWS Direct Connect** : vérifiez `ConnectionState` (1 UP, 0 DOWN), les niveaux de lumière (`ConnectionLightLevelTx`, `ConnectionLightLevelRx`) et `ConnectionErrorCount` pour le lien physique, puis BGP sur l'interface virtuelle. Annoncer plus de **100 préfixes** par session BGP sur une interface virtuelle privée ou de transit (limite par défaut) fait passer la session à DOWN : agrégez les routes.

**AWS Client VPN** : un client n'atteint un réseau qu'avec une **règle d'autorisation** pour son CIDR et une **route** dans la table de routage du point de terminaison via un sous-réseau associé ; l'accès à internet exige une règle d'autorisation pour `0.0.0.0/0` et une route par défaut dans le sous-réseau associé (passerelle Internet ou NAT). Le CIDR client (entre `/22` et `/12`) ne doit pas chevaucher le CIDR du VPC et ne peut pas être modifié après la création.

**Connectivité privée** :

| Symptôme | Cause |
| --- | --- |
| L'appel SDK part toujours vers le point de terminaison public | Point de terminaison d'interface sans DNS privé, ou VPC sans `enableDnsSupport` et `enableDnsHostnames` |
| Délai dépassé vers un point de terminaison d'interface | Le groupe de sécurité du point de terminaison n'autorise pas TCP 443 depuis les clients |
| `AccessDenied` à travers un point de terminaison | Politique de point de terminaison (celle par défaut autorise tout) ou politique de compartiment avec `aws:SourceVpce` qui désigne un autre point de terminaison |
| Les clients sur site ou appairés ne peuvent pas utiliser le point de terminaison de passerelle S3 | Les points de terminaison de passerelle ne s'étendent pas hors du VPC : utilisez un point de terminaison d'interface S3 |
| Consommateur PrivateLink bloqué en `pendingAcceptance` | Le fournisseur doit accepter la connexion |

> **Piège d'examen.** Des blocs CIDR qui se chevauchent entre le site et un VPC ne se corrigent ni par des routes ni par des groupes de sécurité. PrivateLink fonctionne malgré le chevauchement, car le consommateur se connecte à une IP de point de terminaison dans son propre VPC.

<!-- section: network-monitoring | objectives: 5.3.5 -->
## Services de surveillance réseau de CloudWatch

| Service | Surveille | Fonctionnement | Résultat |
| --- | --- | --- | --- |
| Network Flow Monitor | Flux TCP entre instances EC2 ou charges de travail EKS, et vers S3, DynamoDB ou une autre Région | Agents sur les instances ; moniteurs sur les flux choisis ; principaux contributeurs | Perte de paquets et latence, et un **indicateur de santé du réseau** (network health indicator) qui dit si AWS est à l'origine de la dégradation |
| Internet Monitor | Performances et disponibilité entre les utilisateurs d'internet et une application | Sans agent : données de connectivité d'AWS ; ajoutez des VPC, des NLB, des distributions CloudFront ou des annuaires WorkSpaces à un moniteur | Scores par **city-network** (emplacement et ASN), événements de santé vers EventBridge, mesures dans CloudWatch Logs et, en option, S3 |
| Network Synthetic Monitor | Chemins hybrides d'un sous-réseau de VPC vers des adresses IP sur site | Sondes gérées ICMP ou TCP, agrégation de 30 ou 60 secondes ; rien à installer sur site | Temps aller-retour, perte de paquets, indicateur de santé du réseau (100 ou 0) sur les chemins Direct Connect |

Choisissez selon l'endroit du problème : dans AWS (Network Flow Monitor), entre les utilisateurs d'internet et AWS (Internet Monitor), entre AWS et le centre de données (Network Synthetic Monitor).

Créez aussi des alarmes sur les métriques des services : `TunnelState`, `ConnectionState`, `ErrorPortAllocation` et `PacketsDropCount` de la passerelle NAT, `UnHealthyHostCount` de l'ELB. Les sondes TCP changent de port source dans la plage 1024-65535 : le pare-feu sur site doit autoriser toute cette plage vers le port de destination.

```bash
aws networkmonitor create-monitor \
  --monitor-name dc-paris-links \
  --aggregation-period 30 \
  --probes sourceArn=arn:aws:ec2:eu-west-3:111122223333:subnet/subnet-0a1b2c3d4e5f60789,destination=172.16.20.10,protocol=TCP,destinationPort=443,packetSize=56
```

> **Conseil d'examen.** « Des utilisateurs de certaines villes et de certains FAI signalent des lenteurs » désigne Internet Monitor ; « latence vers le centre de données via Direct Connect sans installer d'agent » désigne Network Synthetic Monitor ; « perte de paquets entre microservices dans deux zones de disponibilité » désigne Network Flow Monitor. Utilisez l'indicateur de santé du réseau pour décider entre ouvrir un dossier auprès du support AWS et corriger votre propre configuration.

<!-- section: key-points -->
## Points clés

- Chemin : table de routage, groupe de sécurité (avec état, autorisation uniquement), ACL réseau (sans état, ports éphémères), IP publique. Reachability Analyzer nomme le composant bloquant sans envoyer de paquets.
- Passerelle NAT : expiration des connexions inactives à 350 secondes, `ErrorPortAllocation` = épuisement des ports. Passerelle de transit : route du VPC, association, propagation, route de retour.
- Journaux de flux : ACCEPT puis REJECT sur la réponse = ACL réseau ; configuration non modifiable ; pas de trafic DNS ni de métadonnées.
- ALB : 502 réinitialisation par la cible, 503 aucune cible, 504 délai dépassé. Journaux WAF : préfixe `aws-waf-logs-`, `terminatingRuleId`.
- CloudFront : politique de cache = clé de cache et TTL ; noms versionnés plutôt qu'invalidations ; caractère générique = un chemin ; 1 000 chemins gratuits par mois.
- VPN : IKE, clé prépartagée, UDP 500/4500, propagation des routes, `TunnelState`. Direct Connect : `ConnectionState`, limite de 100 préfixes. Client VPN : règle d'autorisation et route.
- Network Flow Monitor (dans AWS), Internet Monitor (utilisateurs), Network Synthetic Monitor (hybride).
