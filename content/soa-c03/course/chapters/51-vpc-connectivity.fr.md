Les questions de mise en réseau donnent une topologie de VPC (sous-réseaux, tables de routage, passerelles, groupes de sécurité) et une exigence : atteindre Internet depuis des sous-réseaux privés, atteindre S3 sans passer par Internet, relier deux VPC, prouver que les pare-feu journalisent, ou réduire une lourde facture de passerelle NAT. Ce chapitre couvre les sous-réseaux et le routage, les groupes de sécurité et les listes ACL réseau, les points de terminaison de VPC et PrivateLink, l'appairage de VPC, l'audit des services de protection réseau dans un seul compte, et le coût des architectures réseau.

<!-- section: vpc-subnets-routing | objectives: 5.1.1 -->
## Sous-réseaux, tables de routage et passerelles

Un VPC a un CIDR IPv4 principal compris entre /16 et /28, plus des blocs CIDR secondaires (5 par VPC par défaut, jusqu'à 50 sur demande) et des blocs IPv6 facultatifs. Chaque **sous-réseau** se trouve dans une seule zone de disponibilité, et AWS réserve 5 adresses dans chaque sous-réseau : l'adresse réseau, les trois suivantes (routeur du VPC, DNS, usage futur) et la dernière. Un /28 laisse donc 11 adresses utilisables, un /24 en laisse 251.

Une **table de routage** est associée à chaque sous-réseau (la table de routage principale si aucune n'est choisie). La route correspondante la plus spécifique l'emporte, et la route `local` du CIDR du VPC est toujours présente. Ce qui rend un sous-réseau public, c'est sa route, pas son nom :

```text
Destination          Target
10.20.0.0/16         local
0.0.0.0/0            nat-0a1b2c3d4e5f67890
pl-12345678          vpce-0123456789abcdef0
::/0                 eigw-0fedcba9876543210
```

| Passerelle | Rôle | Règles clés |
| --- | --- | --- |
| Passerelle Internet | Internet entrant et sortant pour les sous-réseaux publics | Une par VPC ; les instances ont aussi besoin d'une adresse IPv4 publique ou d'une adresse IP Elastic |
| Passerelle NAT zonale | Internet IPv4 en sortie uniquement pour les sous-réseaux privés | Créée dans un sous-réseau public avec une adresse IP Elastic, une par zone de disponibilité pour la résilience ; pas de groupe de sécurité ; jusqu'à 8 adresses IP ; type NAT privé pour router vers d'autres réseaux sans Internet |
| Passerelle NAT régionale | Même rôle, une seule passerelle pour toutes les zones | Pas de sous-réseau public nécessaire ; s'étend automatiquement aux zones où vous exécutez des ressources (jusqu'à 60 minutes) ; jusqu'à 32 adresses IP par zone ; pas de NAT privé |
| Passerelle Internet de sortie uniquement (egress-only internet gateway) | Internet IPv6 en sortie uniquement | Router `::/0` vers elle ; avec état, bloque les connexions initiées depuis Internet |

Chaque adresse IP d'une passerelle NAT prend en charge 55 000 connexions simultanées vers une même destination ; la métrique `ErrorPortAllocation` signale qu'une passerelle n'en a plus assez et a besoin d'adresses supplémentaires. Les quotas par défaut comprennent 5 VPC par Région, 200 sous-réseaux par VPC, 5 passerelles NAT par zone de disponibilité et 5 adresses IP Elastic par Région.

> **Piège d'examen.** Des instances de sous-réseau privé qui perdent l'accès à Internet après le « déplacement » d'une passerelle NAT routent en général `0.0.0.0/0` vers une passerelle supprimée (état de route blackhole) ou vers une passerelle NAT placée dans un sous-réseau privé. Une passerelle NAT zonale publique doit se trouver dans un sous-réseau dont la table de routage pointe vers la passerelle Internet.

<!-- section: sg-nacl | objectives: 5.1.1 -->
## Groupes de sécurité et listes ACL réseau

| | Groupe de sécurité | Liste ACL réseau |
| --- | --- | --- |
| S'applique à | Interfaces réseau (instances, équilibreurs de charge, points de terminaison) | Sous-réseaux, une liste ACL réseau par sous-réseau |
| État | Avec état : le trafic de retour est autorisé automatiquement | Sans état : le trafic de retour a besoin de sa propre règle |
| Règles | Autorisation uniquement | Autorisation et refus, évalués dans l'ordre des numéros, la première correspondance l'emporte |
| Sources | CIDR, listes de préfixes, autres groupes de sécurité | CIDR uniquement |
| Par défaut | Groupe par défaut : entrant depuis lui-même, tout le sortant ; nouveau groupe : aucun entrant, tout le sortant | La liste ACL par défaut autorise tout ; une nouvelle liste personnalisée refuse tout tant que vous n'ajoutez pas de règles |
| Quotas | 60 règles entrantes et 60 sortantes, 5 groupes par interface (jusqu'à 16) | 20 règles par sens (jusqu'à 40) |

Les listes ACL réseau étant sans état, un sous-réseau web qui autorise le 443 entrant doit aussi autoriser les **ports éphémères sortants** vers les clients, et un sous-réseau privé qui appelle Internet doit autoriser les ports éphémères entrants pour les réponses. AWS suggère la plage 1024-65535 pour couvrir tous les systèmes d'exploitation clients.

```text
Inbound
Rule  Type         Port range    Source         Action
100   HTTPS        443           0.0.0.0/0      ALLOW
110   Custom TCP   1024-65535    0.0.0.0/0      ALLOW
*     All traffic  All           0.0.0.0/0      DENY
Outbound
Rule  Type         Port range    Destination    Action
100   HTTPS        443           0.0.0.0/0      ALLOW
110   Custom TCP   1024-65535    0.0.0.0/0      ALLOW
*     All traffic  All           0.0.0.0/0      DENY
```

| Exigence | Réponse |
| --- | --- |
| Bloquer une plage d'adresses IP malveillante pour tout un sous-réseau | Règle de refus de liste ACL réseau numérotée avant les règles d'autorisation |
| N'autoriser le niveau application que depuis le niveau web, quelles que soient leurs adresses IP | Règle de groupe de sécurité qui référence le groupe de sécurité du niveau web |
| Autoriser le sortant vers S3 par un point de terminaison de passerelle | Règle sortante de groupe de sécurité vers la liste de préfixes S3 (les listes ACL réseau ne peuvent pas référencer de listes de préfixes) |

> **Piège d'examen.** Les groupes de sécurité ne savent pas refuser. « Bloquer une adresse précise » est une règle de liste ACL réseau (ou AWS WAF pour le trafic HTTP), jamais une modification de groupe de sécurité.

<!-- section: vpc-endpoints | objectives: 5.1.2 -->
## Points de terminaison de VPC et AWS PrivateLink

Les **points de terminaison de passerelle** (gateway endpoints) servent uniquement Amazon S3 et DynamoDB. Ils n'utilisent pas PrivateLink et ne coûtent rien : vous choisissez des tables de routage, et AWS y ajoute une route dont la destination est la liste de préfixes du service. Ces routes ne sont pas modifiables, le point de terminaison ne fonctionne que dans la même Région, et les ressources d'un VPC appairé ne peuvent pas l'utiliser.

Les **points de terminaison d'interface** (interface endpoints, PrivateLink) créent des interfaces réseau avec des adresses IP privées dans les sous-réseaux choisis, protégées par un groupe de sécurité, pour la plupart des services AWS, pour les services de point de terminaison d'autres comptes et pour les partenaires de Marketplace. Avec le **DNS privé** (il exige les attributs de VPC `enableDnsSupport` et `enableDnsHostnames`), le nom d'hôte par défaut du service se résout vers le point de terminaison à l'intérieur du VPC : les applications ne changent pas. Ils sont facturés à l'heure par zone de disponibilité et au Go, et ils sont joignables depuis des VPC appairés, un VPN et Direct Connect.

| Besoin | Point de terminaison |
| --- | --- |
| Des instances de sous-réseau privé lisent S3 dans la même Région, sans coût | Point de terminaison de passerelle pour S3 |
| Des serveurs sur site atteignent S3 via Direct Connect sans Internet | Point de terminaison d'interface pour S3 |
| Des instances sans Internet utilisent Systems Manager, ECR, CloudWatch Logs | Points de terminaison d'interface pour chaque service |
| Proposer notre service aux VPC d'autres comptes sans appairage | Service de point de terminaison (PrivateLink) derrière un Network Load Balancer ; les consommateurs créent des points de terminaison d'interface, nous acceptons les demandes |
| Faire passer le trafic par un parc d'appliances de pare-feu tierces | Point de terminaison Gateway Load Balancer |

Une **politique de point de terminaison** (par défaut : accès complet) limite ce qui peut être fait via le point de terminaison ; côté ressource, on peut exiger ce point de terminaison avec `aws:SourceVpce`.

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc1234def567890 \
  --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.eu-west-1.s3 \
  --route-table-ids rtb-0a1b2c3d4e5f67890 rtb-0f9e8d7c6b5a43210
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAccessOutsideEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-corp-exports", "arn:aws:s3:::example-corp-exports/*"],
      "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0123456789abcdef0" } }
    }
  ]
}
```

> **Piège d'examen.** Un point de terminaison de passerelle ne s'applique qu'aux sous-réseaux dont vous avez sélectionné les tables de routage ; les instances des autres sous-réseaux passent toujours par la passerelle NAT. Et le trafic S3 vers un compartiment d'une autre Région n'utilise jamais le point de terminaison de passerelle.

<!-- section: vpc-peering | objectives: 5.1.2 -->
## Appairage de VPC

Une **connexion d'appairage de VPC** (VPC peering) relie deux VPC, dans le même compte ou des comptes différents et dans la même Région ou des Régions différentes, avec un routage privé. Un côté demande, l'autre accepte, puis **les deux** côtés ajoutent des routes vers le CIDR de l'autre et ouvrent leurs groupes de sécurité.

| Règle | Conséquence |
| --- | --- |
| Aucun chevauchement de blocs CIDR, sur aucun des CIDR des VPC | Réadresser un VPC ou choisir une autre option de connectivité |
| Pas d'appairage transitif | A–B et A–C ne relient pas B et C ; créer B–C |
| Pas de routage de périphérie à périphérie (edge-to-edge) | B ne peut pas utiliser la passerelle Internet, la passerelle NAT, le VPN, Direct Connect ou le point de terminaison de passerelle S3 de A |
| Références de groupes de sécurité à travers l'appairage | Dans la même Région uniquement |
| Noms DNS privés du pair | Activer la prise en charge de la résolution DNS sur la connexion d'appairage |

L'appairage de VPC n'a pas de frais horaires, seulement le transfert de données. Quand des dizaines de VPC doivent communiquer, AWS Transit Gateway fournit un routage transitif en étoile, avec un coût par heure d'attachement et par Go.

> **Conseil d'examen.** Une fois la connexion d'appairage active, un « connection timed out » entre les VPC vient presque toujours d'une route manquante d'un côté ou d'un groupe de sécurité qui n'autorise pas le CIDR du pair.

<!-- section: network-protection-audit | objectives: 5.1.3 -->
## Auditer les services de protection réseau dans un seul compte

Un audit vérifie trois choses pour chaque service : il protège les bonnes ressources, ses règles font ce qui est prévu, et il produit des journaux et des métriques que quelqu'un peut examiner.

| Service | Ce qu'il faut vérifier | Où se trouvent les preuves |
| --- | --- | --- |
| AWS WAF | Pack de protection (protection pack, web ACL) associé à chaque ALB, distribution CloudFront ou étape API Gateway ; action par défaut ; groupes de règles gérés testés en Count avant Block | Journaux vers CloudWatch Logs, S3 ou Data Firehose (noms commençant par `aws-waf-logs-`, même Région et même compte que la web ACL) ; métriques `AllowedRequests`, `BlockedRequests`, `CountedRequests` dans `AWS/WAFV2` ; requêtes échantillonnées |
| AWS Shield | Shield Standard protège automatiquement chaque compte ; Shield Advanced ne protège que les ressources que vous ajoutez (CloudFront, zones hébergées Route 53, Global Accelerator, adresses IP Elastic, ALB, CLB) | Métriques `AWS/DDoSProtection` (`DDoSDetected`, `DDoSAttackBitsPerSecond`), dans us-east-1 pour CloudFront et Route 53 |
| AWS Network Firewall | Les tables de routage font passer le trafic par les points de terminaison du pare-feu ; groupes de règles sans état et avec état dans la politique de pare-feu | Journaux de flux, d'alerte et TLS, produits uniquement pour le trafic transmis au moteur avec état ; métriques CloudWatch pour les deux moteurs |
| Route 53 Resolver DNS Firewall | Groupes de règles associés à chaque VPC ; ordre des règles par priorité ; réglage fail-closed (par défaut) ou fail-open | Journaux de requêtes du Resolver avec l'action de DNS Firewall ; métriques CloudWatch |

Les actions de règle de DNS Firewall sont ALLOW, ALERT (laisser passer la requête et la journaliser) et BLOCK, qui répond NODATA, NXDOMAIN ou un CNAME OVERRIDE. Utilisez ALERT pour mesurer une nouvelle liste de blocage avant de l'appliquer. En mode fail-closed, le Resolver répond SERVFAIL quand DNS Firewall ne peut pas évaluer une requête ; fail-open privilégie la disponibilité. DNS Firewall voit les requêtes qui passent par le Resolver ; Network Firewall voit le trafic réseau et applicatif mais pas ces requêtes du Resolver.

Preuves complémentaires : CloudTrail enregistre les modifications de configuration des quatre services (une règle supprimée, une web ACL dissociée), et des règles AWS Config comme `wafv2-logging-enabled` signalent les protections sans journalisation.

> **Piège d'examen.** Une règle qui « aurait dû bloquer » du trafic mais n'apparaît que dans les journaux d'alerte ou dans `CountedRequests` est réglée sur ALERT ou Count. Passez l'action à BLOCK après validation ; n'ajoutez pas une seconde règle.

<!-- section: network-cost | objectives: 5.1.4 -->
## Optimiser les coûts réseau

Les factures réseau viennent de ressources facturées à l'heure (passerelles NAT, points de terminaison d'interface, attachements Transit Gateway, adresses IPv4 publiques) et d'octets (traitement par la passerelle NAT, transfert de données entre zones de disponibilité, entre Régions et vers Internet).

| Source de coût | Optimisation |
| --- | --- |
| Traitement par la passerelle NAT du trafic vers S3 ou DynamoDB | Points de terminaison de passerelle : ni frais horaires ni frais de traitement |
| Traitement par la passerelle NAT d'un trafic important vers d'autres API AWS (téléchargements ECR, CloudWatch Logs) | Points de terminaison d'interface, quand leur coût horaire et au Go est inférieur au traitement NAT |
| Instances d'une zone utilisant une passerelle NAT d'une autre zone | Une passerelle NAT par zone avec des routes correspondantes, ou une passerelle NAT régionale, pour éviter les frais entre zones et la dépendance à une zone |
| Niveaux bavards répartis entre zones | Garder dans la même zone les paires de composants à fort volume quand la disponibilité le permet ; le transfert entre zones est facturé dans chaque sens |
| Adresses IPv4 publiques, utilisées ou inactives | Libérer les adresses IP Elastic non associées (Public IP insights d'IPAM les liste) ; utiliser l'adressage privé derrière les équilibreurs de charge ; IPv6 avec une passerelle Internet de sortie uniquement |
| Transfert de données vers Internet pour du contenu statique ou cachable | CloudFront devant l'origine |
| Quelques liaisons entre VPC | Appairage de VPC (pas de frais horaires) plutôt que Transit Gateway |

Trouvez la cause avant de changer l'architecture : Cost Explorer groupé par type d'utilisation (types se terminant par `NatGateway-Bytes`, `NatGateway-Hours`, `DataTransfer-Regional-Bytes`), métriques de passerelle NAT comme `BytesOutToDestination`, et journaux de flux VPC interrogés pour trouver les principales destinations.

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-10-01,End=2026-11-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=USAGE_TYPE
```

> **Conseil d'examen.** « L'essentiel de la facture de passerelle NAT vient d'instances qui téléchargent des objets depuis S3 » n'a qu'une réponse : un point de terminaison de passerelle S3 sur les tables de routage des sous-réseaux privés. Il est gratuit, ne demande aucune modification de l'application et supprime les frais de traitement.

<!-- section: key-points -->
## Points clés

- Sous-réseaux : une zone de disponibilité, 5 adresses réservées ; public signifie une route vers une passerelle Internet ; la route la plus spécifique l'emporte.
- Passerelle NAT zonale dans un sous-réseau public par zone ; passerelle NAT régionale couvrant les zones sans sous-réseau public ; passerelle Internet de sortie uniquement pour IPv6.
- Groupes de sécurité : avec état, autorisation uniquement, références de groupes ; listes ACL réseau : sans état, autorisations et refus ordonnés, ports éphémères.
- Les points de terminaison de passerelle pour S3 et DynamoDB sont gratuits et passent par les tables de routage ; les points de terminaison d'interface utilisent PrivateLink, des groupes de sécurité et le DNS privé.
- Appairage : pas de chevauchement, pas de transitivité, pas de routage de périphérie à périphérie ; routes et groupes de sécurité des deux côtés.
- Auditer WAF, Shield, Network Firewall et DNS Firewall par leurs associations, actions de règle, journaux et métriques ; ALERT et Count ne font qu'observer.
- Économies réseau : points de terminaison de passerelle, routage NAT dans la même zone, libération des IPv4 publiques inactives, CloudFront, appairage pour quelques liaisons.
