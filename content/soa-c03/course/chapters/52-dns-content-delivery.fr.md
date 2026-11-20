Un opérateur ne conçoit pas l'architecture DNS mondiale ; à l'examen, on vous demande de faire résoudre les noms là où il faut, d'orienter les utilisateurs avec le bon enregistrement Route 53, de prouver ce qui a été interrogé grâce aux journaux, et de configurer les services périphériques placés devant une application. La plupart des questions reposent sur un paramètre absent ou mal placé : un attribut de VPC, une association de règle, une vérification de l'état, un certificat dans la mauvaise Région ou un comportement de cache.

<!-- section: vpc-dns-resolver | objectives: 5.2.1 -->
## DNS dans un VPC et Route 53 Resolver

Chaque VPC dispose d'un résolveur récursif intégré, que la documentation Route 53 appelle désormais **Route 53 VPC Resolver** (le guide d'examen dit Route 53 Resolver). Les instances l'atteignent à l'adresse de base du VPC plus deux (`10.0.0.2` dans `10.0.0.0/16`) ou à `169.254.169.253`. Il répond pour les zones hébergées privées associées et les noms propres au VPC (noms d'hôte DNS EC2), transfère les domaines qui correspondent à une règle Resolver, et résout récursivement sur internet tous les autres noms publics.

Deux attributs de VPC le contrôlent :

| Attribut | Effet | Nécessaire pour |
| --- | --- | --- |
| `enableDnsSupport` | Le résolveur fourni par Amazon répond dans le VPC | Tout ce qui suit ; sans lui, rien ne se résout via VPC+2 |
| `enableDnsHostnames` | Les instances dotées d'une IP publique reçoivent un nom d'hôte DNS public | Zones hébergées privées et DNS privé des points de terminaison d'interface (les deux attributs doivent valoir `true`) |

```bash
aws ec2 modify-vpc-attribute --vpc-id vpc-0a1b2c3d4e5f60789 --enable-dns-support "{\"Value\":true}"
aws ec2 modify-vpc-attribute --vpc-id vpc-0a1b2c3d4e5f60789 --enable-dns-hostnames "{\"Value\":true}"
```

Les **zones hébergées privées** contiennent des enregistrements visibles uniquement des VPC qui leur sont associés. Faits utilisés à l'examen :

- DNS à horizon partagé (split-view) : une zone hébergée publique et une zone privée peuvent porter le même nom (`example.com`) ; le VPC voit les enregistrements privés, internet voit les publics.
- Quand des zones se chevauchent, la plus spécifique l'emporte (`accounting.example.com` plutôt que `example.com`). Si la zone privée correspondante n'a pas d'enregistrement pour le nom et le type demandés, le résolveur renvoie NXDOMAIN ; il ne se rabat pas sur la zone publique.
- L'association d'un VPC appartenant à un autre compte est impossible dans la console : le propriétaire de la zone exécute `create-vpc-association-authorization`, le propriétaire du VPC exécute `associate-vpc-with-hosted-zone`, puis le propriétaire de la zone peut supprimer l'autorisation (l'association demeure).

Le **DNS hybride** utilise les points de terminaison Resolver, des interfaces réseau Elastic placées dans vos sous-réseaux :

| Besoin | Composant | Configuration |
| --- | --- | --- |
| Des serveurs sur site résolvent les enregistrements d'une zone hébergée privée | Point de terminaison entrant | Les serveurs DNS sur site transfèrent la zone (redirecteur conditionnel) vers les adresses IP du point de terminaison, via VPN ou Direct Connect |
| Les charges de travail du VPC résolvent des noms sur site (`corp.example.internal`) | Point de terminaison sortant et règle de transfert (forwarding rule) | Type de règle `FORWARD`, nom de domaine, IP cibles des serveurs DNS sur site, puis association de la règle à chaque VPC |
| Même transfert dans de nombreux comptes | Partager la règle avec AWS RAM | Les comptes destinataires associent la règle partagée à leurs VPC ; ils ne peuvent ni la modifier ni la supprimer |
| Mêmes paramètres DNS sur de nombreux VPC | Route 53 Profiles | Un profil regroupe zones hébergées privées, règles Resolver, groupes de règles DNS Firewall, points de terminaison d'interface et configurations de journalisation des requêtes ; partagez-le avec AWS RAM |

Exigences des points de terminaison : au moins deux adresses IP (AWS recommande deux zones de disponibilité) et un groupe de sécurité qui autorise **TCP et UDP sur le port 53** (plus 443 si vous activez DNS over HTTPS sur un point de terminaison entrant). La règle `Recursive` par défaut (Internet Resolver) ne peut pas être supprimée ; des règles système sont créées automatiquement pour les noms du VPC et les recherches inversées.

```bash
aws route53resolver create-resolver-rule \
  --creator-request-id corp-fwd-01 \
  --name corp-forward \
  --rule-type FORWARD \
  --domain-name corp.example.internal \
  --target-ips "Ip=192.168.10.53,Port=53" "Ip=192.168.11.53,Port=53" \
  --resolver-endpoint-id rslvr-out-0a1b2c3d4e5f6789a

aws route53resolver associate-resolver-rule \
  --resolver-rule-id rslvr-rr-0a1b2c3d4e5f6789a \
  --vpc-id vpc-0a1b2c3d4e5f60789
```

> **Piège d'examen.** Quand une règle de transfert et une zone hébergée privée couvrent le même domaine, **la règle l'emporte** : les requêtes partent vers le site au lieu de la zone privée. Une règle qui existe mais n'est pas associée au VPC n'a aucun effet.

**Route 53 Resolver DNS Firewall** filtre les requêtes DNS sortantes des VPC. Un groupe de règles, associé à des VPC, contient des règles composées d'une liste de domaines (la vôtre ou une liste gérée par AWS comme `AWSManagedDomainsMalwareDomainList` et `AWSManagedDomainsBotnetCommandandControl`) et d'une action : **ALLOW**, **ALERT** (laisser passer et journaliser) ou **BLOCK** avec une réponse NODATA, NXDOMAIN ou OVERRIDE (un `CNAME` personnalisé). Testez une nouvelle règle de blocage d'abord avec ALERT. Le mode de défaillance est **fermé par défaut** : si DNS Firewall ne répond pas, le résolveur renvoie SERVFAIL ; activez l'ouverture en cas d'échec (fail open) pour privilégier la disponibilité.

<!-- section: routing-policies | objectives: 5.2.2 -->
## Enregistrements, politiques de routage et vérifications de l'état

Le choix de l'enregistrement précède celui de la politique de routage :

| | Enregistrement d'alias | Enregistrement CNAME |
| --- | --- | --- |
| Apex de zone (`example.com`) | Autorisé | Interdit |
| Cibles | Ressources AWS : ELB, CloudFront, site web S3, API Gateway, autre enregistrement de la même zone... | N'importe quel nom DNS |
| Facturation des requêtes | Aucune pour les requêtes d'alias vers des ressources AWS | Facturées |
| TTL | Non modifiable quand la cible est une ressource AWS | Vous le définissez |

Politiques de routage :

| Politique | Comportement | Exigence type |
| --- | --- | --- |
| Simple | Un enregistrement, une ou plusieurs valeurs, pas de vérification de l'état sur l'enregistrement | Ressource unique |
| Pondérée (weighted) | Réponses proportionnelles ; pondération de 0 à 255 par enregistrement | Canari, migration progressive, test A/B |
| Latence | Réponse depuis la Région de plus faible latence pour le résolveur | Application multi-Région, Région la plus rapide |
| Basculement (failover) | Principal tant qu'il est sain, sinon secondaire | Actif-passif, page de maintenance |
| Géolocalisation | Par continent, pays ou État américain ; la plus petite zone l'emporte | Contenu ou conformité par pays |
| Géoproximité | Par distance, ajustée par un biais de -99 à 99 | Déplacer progressivement le trafic entre emplacements |
| Basée sur l'IP | Par blocs CIDR clients regroupés dans une collection CIDR | Router une plage connue de FAI ou de bureau |
| Réponse à valeurs multiples | Jusqu'à huit enregistrements sains choisis au hasard | Répartition simple côté client avec vérifications de l'état |

Dans une zone hébergée privée, vous pouvez utiliser les politiques simple, basculement, réponse à valeurs multiples, pondérée, latence, géolocalisation et géoproximité, mais pas le routage basé sur l'IP.

Sans enregistrement d'emplacement **par défaut**, la géolocalisation renvoie « pas de réponse » pour les emplacements non couverts et pour les adresses IP que Route 53 ne sait pas localiser : ajoutez toujours un enregistrement par défaut.

Les vérifications de l'état pilotent toutes les politiques sauf la politique simple :

| Type | Vérifie | Usage |
| --- | --- | --- |
| Point de terminaison | HTTP, HTTPS ou TCP vers une IP ou un domaine, toutes les 30 secondes (ou 10 en intervalle rapide), recherche de chaîne facultative dans les 5 120 premiers octets | Points de terminaison publics ; les vérificateurs Route 53 doivent l'atteindre (autorisez leurs plages IP) |
| Calculée | État de vérifications enfants (par exemple sain si 2 sur 3) | Santé d'un service composite |
| Alarme CloudWatch | État du flux de données d'une alarme | Ressources privées, ou santé fondée sur n'importe quelle métrique |

Les vérificateurs Route 53 s'exécutent hors de votre VPC. Pour basculer une ressource privée, la réponse classique est une vérification de l'état fondée sur une alarme CloudWatch (par exemple sur `StatusCheckFailed`) ; Route 53 propose aussi des vérifications de points de terminaison privés, exécutées depuis une source de vérification que vous créez dans le VPC. Pour un enregistrement d'alias vers un ELB, définissez **Evaluate target health** à `true` au lieu de créer une vérification de l'état.

```json
{
  "Comment": "Primary record of an active-passive pair",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "shop.example.com",
        "Type": "A",
        "SetIdentifier": "shop-primary",
        "Failover": "PRIMARY",
        "AliasTarget": {
          "HostedZoneId": "ZEXAMPLEELBZONE",
          "DNSName": "dualstack.shop-alb-1234567890.eu-west-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

> **Piège d'examen.** Avec des pondérations 0 et 100, l'enregistrement à 0 ne reçoit jamais de trafic tant que l'autre est sain ; et un enregistrement pondéré ou de basculement sans vérification de l'état continue de répondre avec un point de terminaison hors service. « Basculer automatiquement » exige toujours une vérification de l'état ou Evaluate target health.

<!-- section: zone-configuration-logging | objectives: 5.2.2 -->
## Configuration de la zone hébergée et journalisation des requêtes

Points de configuration qui cassent la résolution :

- **Délégation** : un domaine enregistré ailleurs (ou une zone hébergée recréée, qui reçoit quatre nouveaux serveurs de noms) ne se résout que lorsque les enregistrements NS du bureau d'enregistrement listent les serveurs de noms de la zone hébergée. Pour un sous-domaine, créez dans la zone parente des enregistrements NS qui pointent vers les serveurs de noms de la zone enfant.
- **TTL** : réduisez le TTL d'un enregistrement avant un changement planifié, pour que les résolveurs abandonnent vite l'ancienne réponse.
- La **signature DNSSEC** utilise une clé de signature de clé (KSK) adossée à une clé KMS gérée par le client, asymétrique, de spécification `ECC_NIST_P256`, dans **us-east-1** ; après activation de la signature, ajoutez l'enregistrement DS dans la zone parente (ou chez le bureau d'enregistrement). La validation DNSSEC côté résolveur est un paramètre distinct du VPC.

Deux journaux de requêtes différents :

| | Journalisation des requêtes DNS publiques | Journalisation des requêtes Resolver |
| --- | --- | --- |
| Journalise | Les requêtes que les résolveurs publics envoient à Route 53 pour une zone hébergée publique | Les requêtes émises depuis vos VPC (et via les points de terminaison entrants ou sortants), y compris les actions DNS Firewall |
| Destination | CloudWatch Logs uniquement, groupe de journaux dans **us-east-1** | CloudWatch Logs, Amazon S3 ou Amazon Data Firehose |
| Effet du cache | Les requêtes servies depuis le cache d'un résolveur n'atteignent jamais Route 53 | Les réponses servies depuis le cache du VPC Resolver ne sont pas journalisées |
| Champs | ID de zone hébergée, nom, type, code de réponse, protocole, emplacement périphérique, IP du résolveur, sous-réseau client EDNS | ID du VPC, IP source, ID d'instance, nom, type, code de réponse, réponse, action du pare-feu |
| Configuration | Sur la zone hébergée, avec une politique de ressource qui permet à Route 53 d'écrire dans le groupe de journaux | Une configuration de journalisation des requêtes associée à des VPC ; partageable avec AWS RAM |

Utilisez un filtre de métriques CloudWatch Logs ou Logs Insights sur ces journaux pour compter les réponses NXDOMAIN, trouver quelle instance interroge un domaine suspect ou confirmer qu'une règle de transfert est utilisée.

> **Conseil d'examen.** « Quelle instance EC2 a résolu un domaine malveillant » relève de la journalisation des requêtes Resolver (elle enregistre l'instance source), ni de la journalisation des requêtes publiques ni des journaux de flux VPC, qui n'enregistrent pas le trafic vers le serveur DNS fourni par Amazon.

<!-- section: cloudfront-configuration | objectives: 5.2.3 -->
## Configurer les distributions CloudFront

Une distribution combine des origines et une liste ordonnée de comportements de cache (modèles de chemin, le dernier étant `*`). Paramètres de l'opérateur :

| Paramètre | Ce qu'il faut configurer |
| --- | --- |
| Origines | Compartiment S3 avec **contrôle d'accès à l'origine (OAC)** et politique de compartiment pour le principal de service CloudFront ; origines personnalisées (ALB, serveur HTTP) avec une politique de protocole d'origine HTTP only, HTTPS only ou Match viewer ; **origines VPC** (VPC origins) pour un ALB interne, un NLB ou une instance EC2 dans un sous-réseau privé |
| Délais d'origine | Délai de connexion de 10 secondes (1 à 10), 3 tentatives de connexion, délai de réponse de 30 secondes par défaut |
| Basculement d'origine | Groupe d'origines : origine principale et secondaire, codes d'état de basculement ; s'applique à `GET`, `HEAD` et `OPTIONS` |
| Comportement de cache | Modèle de chemin, politique de protocole utilisateur (Redirect HTTP to HTTPS, HTTPS only), méthodes autorisées, politique de cache, politique de requête d'origine, associations de fonctions |
| Autre nom de domaine | Certificat qui couvre le nom dans son SAN, émis par ACM dans **us-east-1** ; puis un enregistrement d'alias vers la distribution |
| Contrôle d'accès | URL signées (un fichier) ou cookies signés (plusieurs fichiers), restrictions géographiques (liste d'autorisation ou de blocage de pays), liste ACL web AWS WAF |
| Coût et couverture | Catégorie de prix (tous les emplacements périphériques, ou un sous-ensemble de régions moins chères) |
| Journaux | Journalisation standard, journaux en temps réel (voir le chapitre de dépannage) |

Pour réserver une origine personnalisée à CloudFront, n'autorisez dans son groupe de sécurité que la liste de préfixes gérée par AWS `com.amazonaws.global.cloudfront.origin-facing`, ou exigez un en-tête personnalisé secret que CloudFront ajoute et que l'ALB vérifie dans une règle d'écouteur.

```bash
aws acm request-certificate \
  --region us-east-1 \
  --domain-name www.example.com \
  --subject-alternative-names static.example.com \
  --validation-method DNS
```

> **Piège d'examen.** Un certificat ACM demandé dans la Région de l'ALB ne peut pas être attaché à la distribution : CloudFront ne propose que les certificats de us-east-1. Si CloudFront se connecte à l'ALB en HTTPS, l'ALB a toujours besoin de son propre certificat dans sa propre Région.

<!-- section: global-accelerator | objectives: 5.2.3 -->
## Configurer AWS Global Accelerator

Un **accélérateur standard** fournit deux adresses IPv4 anycast statiques (quatre en double pile) qui font entrer le trafic sur le réseau AWS par l'emplacement périphérique le plus proche, puis atteignent les points de terminaison par la dorsale AWS. Hiérarchie de configuration :

```text
Accelerator (static IPs, DNS name a1234abcd.awsglobalaccelerator.com)
  Listener (TCP or UDP, port ranges, client affinity NONE or SOURCE_IP)
    Endpoint group per Region (traffic dial 0-100 %, health check settings)
      Endpoints: ALB, NLB, EC2 instance, Elastic IP address (weight 0-255)
```

| Besoin | Paramètre |
| --- | --- |
| Vider une Région pour maintenance, ou bleu/vert entre Régions | Cadran de trafic (traffic dial) du groupe de points de terminaison (0 % n'envoie rien) |
| Déplacer le trafic entre points de terminaison d'une Région | Pondérations des points de terminaison |
| Garder un utilisateur sur le même point de terminaison | Affinité client `SOURCE_IP` |
| Les applications doivent voir l'IP de l'utilisateur | Conservation de l'adresse IP client (ALB, instances EC2, NLB avec groupes de sécurité ; pas les points de terminaison adresse IP Elastic) |
| Associer des utilisateurs à des instances EC2 et des ports précis (sessions de jeu) | Accélérateur de routage personnalisé (custom routing) |

Santé : pour les points de terminaison ALB et NLB, Global Accelerator utilise les vérifications de l'état propres à l'équilibreur de charge (un ALB est sain si chaque groupe cible a une cible saine) ; les paramètres de vérification du groupe de points de terminaison ne s'appliquent qu'aux points de terminaison instance EC2 et adresse IP Elastic, et les vérifications proviennent des plages des vérificateurs Route 53, que les groupes de sécurité doivent autoriser. Si aucun point de terminaison n'est sain, le trafic est envoyé à tous les points de terminaison.

> **Conseil d'examen.** CloudFront distribue du contenu HTTP mis en cache et passe par le DNS ; Global Accelerator distribue des services TCP et UDP via des IP fixes, avec un basculement en quelques secondes et sans délai lié au cache DNS. « Autoriser deux adresses IP » ou « trafic de jeu en UDP » désigne Global Accelerator.

<!-- section: key-points -->
## Points clés

- VPC Resolver à VPC+2 ou `169.254.169.253` ; les zones hébergées privées exigent `enableDnsSupport` et `enableDnsHostnames`.
- Point de terminaison entrant : le site résout les noms AWS. Point de terminaison sortant et règle `FORWARD` associée : le VPC résout les noms sur site. Port 53 TCP et UDP, deux IP minimum. Les règles l'emportent sur les zones privées ; partagez les règles avec AWS RAM.
- DNS Firewall : ALLOW, ALERT, BLOCK (NODATA, NXDOMAIN, OVERRIDE) ; fermé en cas d'échec par défaut.
- Alias à l'apex et pour les cibles AWS ; la politique de routage découle de l'exigence ; les vérifications de l'état ou Evaluate target health rendent le basculement effectif ; la géolocalisation exige un enregistrement par défaut.
- Journaux de requêtes publiques : CloudWatch Logs dans us-east-1. Journaux de requêtes Resolver : CloudWatch Logs, S3 ou Firehose, avec l'instance source.
- CloudFront : OAC, origines VPC, groupes d'origines, politiques de cache et de requête d'origine, certificat ACM dans us-east-1, liste de préfixes gérée dans les groupes de sécurité de l'origine.
- Global Accelerator : IP anycast statiques, cadran de trafic par Région, pondérations par point de terminaison, conservation de l'IP client, vérifications de l'état ELB pour les points de terminaison équilibreurs de charge.
