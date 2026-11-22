Au niveau Specialty, les questions réseau demandent rarement ce qu'est un groupe de sécurité. Elles décrivent un trafic à autoriser, bloquer, inspecter ou dont il faut prouver l'absence, souvent entre comptes, sites sur site et un autre cloud, et demandent le contrôle placé à la bonne couche : une règle avec état sur une interface, une règle sans état sur un sous-réseau, une inspection approfondie dans un pare-feu, une liaison chiffrée, un accès par requête à une seule application, ou une analyse qui prouve qu'aucun chemin non souhaité n'existe. Ce chapitre suit cet ordre : contrôles du trafic, liaisons hybrides, accès des charges de travail depuis les environnements hybrides, segmentation, et détection des accès réseau qui ne devraient pas exister.

<!-- section: traffic-controls | objectives: 3.3.1 -->
## Contrôles qui autorisent ou empêchent le trafic

| Contrôle | Couche et portée | Comportement | Usage type |
| --- | --- | --- | --- |
| Groupe de sécurité | Interface réseau (instances, points de terminaison, équilibreurs de charge, Lambda dans un VPC, RDS) | Avec état, règles d'autorisation uniquement, toutes les règles évaluées ensemble | Accès au moindre privilège par niveau, référence à d'autres groupes de sécurité |
| Liste ACL réseau | Sous-réseau | Sans état, règles numérotées d'autorisation et de refus, numéro le plus bas d'abord, refus `*` final | Bloquer une plage d'adresses pour tout un sous-réseau, garde-fous grossiers |
| AWS Network Firewall | Points de terminaison de pare-feu dans des sous-réseaux dédiés, trafic dirigé par les tables de routage | Inspection avec état par des règles compatibles Suricata, filtrage de domaines, inspection TLS facultative | Filtrage sortant par domaine, signatures IPS, inspection centrale entre VPC |
| Route 53 Resolver DNS Firewall | Requêtes DNS qui sortent d'un VPC par le Resolver | Listes de domaines avec les actions ALLOW, BLOCK ou ALERT | Bloquer les domaines malveillants connus et l'exfiltration DNS |
| AWS WAF | Couche HTTP sur CloudFront, ALB, API Gateway, AppSync, Cognito, Verified Access | Règles sur les requêtes (gérées, basées sur le débit, personnalisées) | Exploits web, bots, inondations de couche 7 |

**Groupes de sécurité.** Un nouveau groupe de sécurité n'a aucune règle entrante et une règle sortante qui autorise tout. Les règles peuvent référencer une liste de préfixes ou un autre groupe de sécurité. Les références entrantes fonctionnent dans le même VPC, à travers une connexion d'appairage de VPC ou à travers une passerelle de transit ; les références sortantes fonctionnent seulement dans le même VPC ou à travers l'appairage. Les quotas par défaut sont de 60 règles entrantes et 60 règles sortantes par groupe et de 5 groupes par interface réseau (jusqu'à 16), et le produit des deux ne peut pas dépasser 1 000.

**Listes ACL réseau.** La liste ACL réseau par défaut autorise tout le trafic dans les deux sens ; une liste ACL réseau personnalisée refuse tout tant que vous n'ajoutez pas de règles. Comme elles sont sans état, le trafic de retour a besoin de sa propre règle, en général la plage de ports éphémères `1024-65535` en sortie pour un serveur et en entrée pour un client. Le quota par défaut est de 20 règles par sens, ajustable jusqu'à 40.

**Network Firewall.** Chaque pare-feu a un point de terminaison dans chaque zone de disponibilité choisie, dans un sous-réseau dédié qui ne contient rien d'autre, et vous l'insérez dans le chemin en modifiant les tables de routage (y compris une table de routage associée à la périphérie de la passerelle Internet pour l'inspection entrante). Il existe deux types de politiques : les politiques **Next Generation**, recommandées pour les nouveaux pare-feu, utilisent un moteur de pare-feu (refus par défaut) pour le contrôle d'accès et un moteur IPS (passage par défaut) pour la détection des menaces, sans groupes de règles sans état ; les politiques **Classic**, toujours entièrement prises en charge, combinent un moteur sans état et un moteur avec état. Un pare-feu utilise l'un ou l'autre type. Les règles avec état peuvent autoriser ou bloquer des domaines d'après le SNI TLS ou l'en-tête HTTP Host ; l'inspection TLS déchiffre le trafic avec des certificats d'AWS Certificate Manager quand la charge utile elle-même doit être inspectée.

Ordre de dépannage pour « le trafic n'arrive pas » : tables de routage (un chemin symétrique à travers le pare-feu), listes ACL réseau des deux sous-réseaux dans les deux sens, groupes de sécurité aux deux extrémités, règles du pare-feu et journaux d'alerte. Les journaux de flux VPC montrent des enregistrements `REJECT` pour le trafic refusé par les groupes de sécurité ou les listes ACL réseau.

> **Piège d'examen.** Supprimer une règle de groupe de sécurité ne coupe pas les connexions suivies existantes : elles continuent jusqu'à leur expiration. Pour arrêter immédiatement le trafic d'un hôte compromis, ajoutez des règles de refus dans la liste ACL réseau du sous-réseau (les règles sans état s'appliquent à chaque paquet). Passer l'instance dans un groupe de sécurité d'isolement vide ne suffit pas à fermer les sessions suivies.

> **Conseil d'examen.** « Refuser une plage d'adresses IP » n'est jamais une réponse de groupe de sécurité, car les groupes de sécurité n'ont pas de règle de refus. Utilisez une liste ACL réseau pour un sous-réseau, AWS WAF pour les requêtes HTTP, ou Network Firewall pour les chemins inspectés.

<!-- section: hybrid-connectivity | objectives: 3.3.2 -->
## Connectivité sécurisée pour les réseaux hybrides et multicloud

| Exigence | Conception |
| --- | --- |
| Liaison chiffrée sur Internet, rapide à mettre en place | AWS Site-to-Site VPN : IPsec, deux tunnels par connexion terminés dans des zones de disponibilité différentes, vers une passerelle réseau privé virtuel ou une passerelle de transit |
| Bande passante et latence constantes, chemin privé | AWS Direct Connect (connexion dédiée ou hébergée) avec des interfaces virtuelles privées ou de transit |
| Direct Connect plus chiffrement IPsec, sans adresses IP publiques | Site-to-Site VPN à adresses IP privées sur une interface virtuelle de transit, terminé sur une passerelle de transit |
| Direct Connect chiffré en couche 2, au débit de la ligne | MACsec sur une connexion dédiée |
| Un autre fournisseur de cloud | Site-to-Site VPN entre la passerelle de transit et la passerelle VPN de l'autre cloud, ou Direct Connect par une colocation ou un partenaire, chiffré avec IPsec |

**Direct Connect n'est pas chiffré par défaut.** Deux façons de le chiffrer :

- **MACsec** (IEEE 802.1AE) chiffre la liaison Ethernet entre votre routeur et l'équipement AWS. Il est disponible sur les connexions dédiées de 10, 100 et 400 Gbit/s dans certains emplacements, sur les LAG de connexions compatibles MACsec de même bande passante et via les interconnexions de partenaires, mais **pas sur les connexions hébergées**. Vous générez une paire CKN/CAK (mode CAK statique uniquement) ; Direct Connect la stocke dans AWS Secrets Manager, et un trousseau contient jusqu'à trois paires pour la rotation. Le mode de chiffrement `should_encrypt` (par défaut) revient au trafic en clair si la négociation échoue ; `must_encrypt` abandonne le trafic à la place. MACsec protège le tronçon vers AWS, pas le chemin de bout en bout.
- **VPN à adresses IP privées** : des tunnels IPsec sur une interface virtuelle de transit, avec des adresses de tunnel privées (RFC 1918 ou RFC 6598) des deux côtés. Il faut une passerelle de transit avec un CIDR privé pour la connexion, une passerelle Direct Connect associée à celle-ci (le CIDR dans les préfixes autorisés) et une passerelle client. Il évite l'ancienne conception d'un VPN sur une interface virtuelle publique, qui expose des points de terminaison publics et nécessite des adresses IP publiques.

> **Piège d'examen.** « Chiffrer le trafic de la connexion Direct Connect hébergée existante de 1 Gbit/s » ne peut pas être MACsec. La réponse est un VPN IPsec sur Direct Connect (VPN à adresses IP privées avec une passerelle de transit).

> **Conseil d'examen.** Des régulateurs qui exigent un chiffrement « sans traverser l'Internet public et sans adresses IP publiques » désignent le VPN à adresses IP privées sur Direct Connect, pas un Site-to-Site VPN standard.

<!-- section: hybrid-workload-access | objectives: 3.3.3 -->
## Accès des charges de travail entre les environnements hybrides et AWS

Une liaison VPN ou Direct Connect relie des réseaux entiers ; l'examen vous demande de limiter l'accès à ce dont chaque charge de travail a besoin.

**AWS Verified Access** donne aux utilisateurs l'accès à des applications précises dans AWS sans VPN, en évaluant **chaque requête** par rapport à l'identité et à l'état de l'appareil :

- **Instance** : évalue les requêtes. Elle a **un seul fournisseur d'approbation d'identité utilisateur** (IAM Identity Center ou un fournisseur OIDC) et peut avoir **plusieurs fournisseurs d'approbation d'appareil** (CrowdStrike, Jamf, JumpCloud).
- Les **groupes** rassemblent les points de terminaison qui ont les mêmes exigences de sécurité ; la **politique de groupe** s'applique à tous, et une **politique de point de terminaison** peut ajouter des conditions pour une application. Les politiques sont écrites en Cedar sur les données d'approbation (revendications comme l'e-mail, le groupe, la version du système d'exploitation de l'appareil, le score de risque).
- **Points de terminaison** : équilibreur de charge, interface réseau, CIDR réseau, ou Amazon RDS (instance, cluster ou proxy).
- Les applications HTTP(S) sont atteintes depuis un navigateur ; les applications non HTTP (SSH, RDP, clients de base de données sur TCP) par le **Connectivity Client** (Windows et macOS) et un point de terminaison TCP.
- Les requêtes sont **refusées par défaut** tant qu'aucune politique ne les autorise, chaque tentative est journalisée (CloudWatch Logs, S3 ou Data Firehose), et AWS WAF peut protéger les points de terminaison HTTP.

```text
permit(principal, action, resource)
when {
  context.idc.groups has "8f3e1a2b-4c5d-4e6f-9a0b-1c2d3e4f5a6b" &&
  context.idc.user.email.verified == true &&
  context.jamf.risk == "LOW"
};
```

Autres contrôles pour les charges de travail hybrides :

| Besoin | Contrôle |
| --- | --- |
| Les serveurs sur site appellent les API AWS sans Internet | Points de terminaison de VPC d'interface atteints par Direct Connect ou VPN, avec des points de terminaison entrants Route 53 Resolver pour le DNS |
| Les administrateurs atteignent EC2 sans ports entrants ni bastions | Systems Manager Session Manager (TLS 1.2, autorisation IAM, journaux de session) |
| Des charges de travail sur site ont besoin d'informations d'identification AWS | IAM Roles Anywhere avec des certificats X.509 (voir le chapitre 42) |
| Seul le réseau de l'entreprise peut atteindre une ressource | Groupes de sécurité côté AWS limités aux CIDR sur site ou à des listes de préfixes, plus `aws:SourceVpce` ou `aws:SourceIp` dans les politiques basées sur les ressources |
| Inspecter le trafic entre le centre de données et les VPC | Network Firewall ou une appliance derrière un Gateway Load Balancer dans un VPC d'inspection attaché à la passerelle de transit |

> **Piège d'examen.** Verified Access autorise l'accès à des applications ; il ne relie pas des réseaux et ne transporte pas le trafic de serveur à serveur. Une réplication entre un centre de données et un VPC nécessite toujours un VPN ou Direct Connect, restreint par les groupes de sécurité et le routage.

<!-- section: segmentation | objectives: 3.3.4 -->
## Segmentation du réseau

Le trafic **nord-sud** (north/south) franchit la limite de votre réseau (Internet, partenaires, sur site) ; le trafic **est-ouest** (east/west) circule entre les VPC, sous-réseaux ou charges de travail à l'intérieur.

| Sens | Contrôles |
| --- | --- |
| Entrant depuis Internet | Seulement des équilibreurs de charge ou CloudFront dans des sous-réseaux publics ; AWS WAF et Shield Advanced sur le point d'entrée ; Network Firewall avec une table de routage de passerelle Internet pour l'inspection des paquets |
| Sortant vers Internet | Passerelle NAT dans un VPC de sortie central, Network Firewall avec des listes de domaines autorisés, DNS Firewall ; aucune route Internet directe depuis les sous-réseaux des charges de travail |
| Entre VPC | Tables de routage de passerelle de transit séparées par environnement (la production ne peut pas router vers le développement), routes blackhole, VPC d'inspection avec Network Firewall et le **mode appliance** sur son attachement pour des flux symétriques, ou pare-feu attaché à la passerelle de transit ; segments AWS Cloud WAN pour les réseaux mondiaux |
| Entre niveaux d'un VPC | Groupes de sécurité qui se référencent (web vers application vers base de données), listes ACL réseau comme couche grossière |
| Entre pods | Politiques réseau Kubernetes (VPC CNI avec la politique réseau activée) et groupes de sécurité pour les pods |

Les **sous-réseaux isolés** (isolated subnets) ont une table de routage avec seulement la route `local` (et les listes de préfixes des points de terminaison de passerelle) : pas de passerelle Internet, pas de passerelle NAT. Les charges de travail atteignent les services AWS par des points de terminaison de VPC. Pour faire de « pas d'accès Internet » un contrôle à l'échelle du compte plutôt qu'une convention de routage, activez **VPC Block Public Access** dans chaque Région :

- Le mode **bidirectionnel** bloque tout le trafic à travers les passerelles Internet et les passerelles Internet de sortie uniquement.
- Le mode **entrant uniquement** bloque le trafic Internet entrant mais conserve les connexions sortantes par les passerelles NAT et les passerelles Internet de sortie uniquement.
- Les **exclusions** permettent à un VPC ou sous-réseau précis de garder un accès bidirectionnel ou en sortie uniquement.

AWS Firewall Manager applique les mêmes politiques de groupes de sécurité, Network Firewall, DNS Firewall, WAF et Shield Advanced à tous les comptes d'une organisation, y compris les comptes créés ensuite.

> **Piège d'examen.** Une passerelle de transit avec une seule table de routage qui propage tous les attachements donne une connectivité est-ouest complète. La segmentation exige des tables de routage séparées (associations et propagations par environnement) ; les groupes de sécurité seuls n'empêchent pas le routage entre la production et le développement.

<!-- section: unnecessary-access | objectives: 3.3.5 -->
## Identification des accès réseau inutiles

| Outil | Répond à | Remarques |
| --- | --- | --- |
| Network Access Analyzer | Quels chemins violent mon intention (par exemple, tout ce qui est accessible depuis une passerelle Internet sauf le niveau web) ? | Network Access Scopes avec `MatchPaths` et `ExcludePaths` ; critères sur les ID, types et balises de ressources, CIDR, ports, protocoles ; facturé par interface réseau analysée |
| Résultats d'accessibilité réseau (network reachability) d'Amazon Inspector | Quels ports de mes instances EC2 sont accessibles depuis la périphérie du VPC ? | EC2 uniquement ; chemins depuis les passerelles Internet (y compris derrière un ALB ou un Classic Load Balancer), l'appairage de VPC, un VPN par une passerelle réseau privé virtuel ; nouvelle analyse toutes les 12 heures |
| Règles AWS Config et contrôles Security Hub CSPM | Quels groupes de sécurité autorisent `0.0.0.0/0` vers SSH, RDP ou des ports à haut risque ? | Règles gérées comme `restricted-ssh`, `vpc-sg-open-only-to-authorized-ports` ; correction automatique avec Systems Manager Automation |
| Politiques de groupes de sécurité Firewall Manager | Quelles règles sont trop permissives (audit du contenu) ou quels groupes sont inutilisés ou redondants (audit de l'utilisation) ? | À l'échelle de l'organisation, avec correction automatique facultative |
| Journaux de flux VPC | Quelles règles autorisées ne voient passer aucun trafic, et qui sonde quoi ? | Preuves avant de supprimer une règle |
| Verified Access | Comment supprimer l'accessibilité étendue que le VPN donne aux utilisateurs ? | Accès par application au lieu d'un accès réseau |

Network Access Analyzer prouve les exigences de segmentation (« la production et le développement sont isolés », « tout chemin vers Internet passe par le pare-feu »), et ses résultats sont les chemins qui correspondent à une entrée `MatchPaths` et à aucune entrée `ExcludePaths` :

```bash
aws ec2 create-network-insights-access-scope \
  --match-paths '[{"Source":{"ResourceStatement":{"ResourceTypes":["AWS::EC2::InternetGateway"]}}}]' \
  --exclude-paths '[{"Destination":{"ResourceStatement":{"Resources":["sg-0web1234567890abc"]}}}]'

aws ec2 start-network-insights-access-scope-analysis \
  --network-insights-access-scope-id nis-0123456789abcdef0
```

> **Piège d'examen.** Reachability Analyzer teste une source et une destination (« pourquoi A n'atteint-il pas B ? »). Network Access Analyzer recherche tous les chemins qui enfreignent une politique (« montrer tout ce qui est accessible depuis Internet »). Les questions qui demandent de prouver l'absence de chemins non souhaités dans un VPC désignent Network Access Analyzer.

> **Conseil d'examen.** Les résultats d'accessibilité réseau d'Inspector sont la réponse quand l'exigence est une détection continue des ports EC2 ouverts sur Internet, avec les résultats de vulnérabilité des mêmes instances.

<!-- section: key-points -->
## Points clés

- Groupes de sécurité : avec état, autorisation uniquement, références à travers l'appairage et (en entrée) les passerelles de transit ; listes ACL réseau : sans état, ordonnées, capables de refuser, ports éphémères nécessaires.
- Supprimer une règle de groupe de sécurité conserve les connexions suivies ; un refus dans la liste ACL réseau coupe le trafic immédiatement.
- Network Firewall : politiques Next Generation recommandées pour les nouveaux pare-feu, Classic toujours prises en charge ; filtrage de domaines par SNI ou Host ; inspection TLS avec des certificats ACM ; mode appliance pour l'inspection centrale.
- Direct Connect n'est pas chiffré par défaut : MACsec sur les connexions dédiées de 10/100/400 Gbit/s (pas hébergées), ou VPN à adresses IP privées sur une interface virtuelle de transit.
- Verified Access : un fournisseur d'approbation d'identité, plusieurs fournisseurs d'approbation d'appareil, politiques Cedar de groupe et de point de terminaison, refus par défaut, Connectivity Client pour TCP.
- Segmentation : tables de routage de passerelle de transit séparées, VPC d'inspection, sous-réseaux isolés avec points de terminaison, VPC Block Public Access, Firewall Manager dans toute l'organisation.
- Accès inutiles : Network Access Analyzer pour l'analyse des chemins par intention, Inspector pour les ports EC2 accessibles depuis la périphérie, audits Config et Firewall Manager pour les règles permissives.
