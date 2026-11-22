La périphérie du réseau (edge) est l'endroit où la plupart des attaques touchent d'abord une application : inondations, tentatives d'injection, robots, bourrage d'identifiants (credential stuffing), requêtes qui tentent de contourner le CDN pour atteindre directement l'origine. Les questions de sécurité en périphérie donnent une menace et des contraintes (utilisateurs dans le monde entier, restriction par pays, page de connexion attaquée, jeu de règles d'un partenaire à réutiliser) et demandent le contrôle, la couche où il s'exécute et le paramètre exact. Sachez ce que chaque service en périphérie peut voir, où il peut être attaché et ce qu'il ne sait pas faire.

<!-- section: edge-strategy | objectives: 3.1.1 -->
## Choisir une stratégie de sécurité en périphérie selon la menace

| Menace anticipée | Contrôle principal | Complément |
| --- | --- | --- |
| DDoS volumétrique de couche 3/4 (inondations SYN, réflexion UDP) | AWS Shield Standard, automatique et gratuit pour tous les clients, sur les services en périphérie (CloudFront, Route 53, Global Accelerator) | Shield Advanced pour une détection adaptée, le support de la SRT, la protection des coûts |
| Inondations de requêtes HTTP (couche 7) | Règles basées sur le débit (rate-based) AWS WAF, groupe de règles géré Anti-DDoS | Shield Advanced avec détection basée sur l'état ; le cache CloudFront absorbe les requêtes répétées |
| Injection SQL, cross-site scripting, charges d'exploits connus | Groupes de règles gérés AWS WAF : Core rule set, Known bad inputs, SQL database, groupes propres à un système ou une application | Règles personnalisées pour les chemins de l'application |
| Robots d'extraction (scrapers) et clients automatisés | Groupe de règles Bot Control, actions CAPTCHA et Challenge | Limites de débit sur les empreintes |
| Bourrage d'identifiants sur une page de connexion | Groupe de règles Account takeover prevention (ATP) | Règle basée sur le débit limitée au chemin de connexion |
| Fausses inscriptions de comptes | Groupe de règles Account creation fraud prevention (ACFP) | CAPTCHA sur le chemin d'inscription |
| Sources malveillantes connues ou anonymisantes | Amazon IP reputation list, Anonymous IP list | Ensembles d'IP issus du renseignement sur les menaces |
| Attaquants qui contournent le CDN pour frapper l'origine | Contrôle d'accès à l'origine (OAC) S3, origines VPC CloudFront, liste de préfixes côté origine | Un en-tête personnalisé secret vérifié à l'origine |
| Usurpation d'appareils et abus de rubriques (topics) dans l'IoT | TLS mutuel X.509 d'AWS IoT Core avec des politiques IoT au moindre privilège | Audits Device Defender |

**Où s'attache AWS WAF** : les distributions CloudFront (ACL web de portée `CLOUDFRONT`, gérée dans US East (N. Virginia)), et les ressources régionales : Application Load Balancers, API REST API Gateway, API GraphQL AppSync, groupes d'utilisateurs Cognito, services App Runner, instances Verified Access et Amazon Bedrock AgentCore Gateway. Pas les Network Load Balancers, pas directement les instances EC2.

Défense en profondeur : bloquer d'abord en périphérie (CloudFront avec WAF et Shield), garder l'origine inaccessible autrement que par la périphérie, filtrer de nouveau au niveau régional (WAF sur l'ALB, Network Firewall dans le VPC) et terminer par les groupes de sécurité. La documentation récente d'AWS WAF écrit **protection pack (web ACL)** ; l'API et la plupart des énoncés d'examen disent toujours ACL web (web ACL).

> **Piège d'examen.** AWS WAF ne peut pas être associé à un Network Load Balancer. Pour une application TCP ou UDP derrière un NLB, la réponse de couche 7 ne s'applique pas : utilisez Shield Advanced sur les adresses IP Elastic ou un Global Accelerator en frontal, et Network Firewall ou les groupes de sécurité pour le filtrage.

<!-- section: edge-protection | objectives: 3.1.2 -->
## Mettre en œuvre la protection en périphérie du réseau

**ACL web AWS WAF** : des règles évaluées par priorité, chacune avec une action (**Allow**, **Block**, **Count**, **CAPTCHA**, **Challenge**), des groupes de règles (les vôtres, gérés par AWS, AWS Marketplace), une action par défaut et une capacité mesurée en WCU. Les règles ajoutent des **étiquettes** (labels) que les règles suivantes peuvent tester. Exécutez d'abord les nouvelles règles en **Count**, lisez les journaux, puis passez en Block.

**Protection contre le Top 10 de l'OWASP** : le Core rule set couvre les exploits web courants (injections génériques, traversée de répertoires, requêtes surdimensionnées), Known bad inputs bloque des charges comme les motifs d'exploits connus, SQL database cible l'injection SQL, les groupes Linux, POSIX, Windows, PHP et WordPress ajoutent des règles propres à une plateforme, et Admin protection bloque l'accès aux pages d'administration exposées. Bot Control, ATP, ACFP et Anti-DDoS sont des groupes payants. Le contrôle d'accès défaillant ou les failles de logique métier exigent toujours des corrections dans l'application ; WAF est une couche, pas un remède.

**En-têtes CloudFront.**

- **En-têtes du lecteur** (viewer) ajoutés par CloudFront et envoyés à l'origine avec une **politique de requête d'origine** (origin request policy) : `CloudFront-Viewer-Country`, `CloudFront-Viewer-Address`, `CloudFront-Viewer-ASN`, `CloudFront-Viewer-JA3-Fingerprint`, `CloudFront-Viewer-JA4-Fingerprint`, `CloudFront-Viewer-TLS`. Les en-têtes d'adresse, d'ASN, TLS et d'empreinte ne sont autorisés que dans les politiques de requête d'origine, pas dans les politiques de cache.
- Les **politiques d'en-têtes de réponse** (response headers policies) ajoutent des en-têtes de sécurité à chaque réponse : `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options` (`nosniff`), `X-Frame-Options` (`DENY` ou `SAMEORIGIN`), `Referrer-Policy`, `X-XSS-Protection`, ainsi que des en-têtes CORS, des en-têtes personnalisés et la suppression d'en-têtes (par exemple `X-Powered-By`). Chaque en-tête a un paramètre de **remplacement de l'origine** (origin override).
- **En-tête personnalisé d'origine** : CloudFront ajoute un en-tête secret aux requêtes vers l'origine ; une règle WAF sur l'ALB bloque les requêtes qui ne le portent pas.

**Protéger l'origine.**

| Origine | Contrôle |
| --- | --- |
| Compartiment S3 | **Contrôle d'accès à l'origine (OAC)** : politique de compartiment pour le principal de service `cloudfront.amazonaws.com` avec `AWS:SourceArn` égal à l'ARN de la distribution ; prend en charge SSE-KMS (ajoutez le même principal à la politique de clé) et `PUT` ou `DELETE`. L'identité d'accès à l'origine (OAI) est héritée |
| ALB, NLB ou instance EC2 dans un sous-réseau privé | **Origines VPC CloudFront** : pas d'IP publique ; autorisez le trafic entrant depuis la liste de préfixes côté origine `com.amazonaws.global.cloudfront.origin-facing` ou, plus strictement, depuis le groupe de sécurité géré par le service `CloudFront-VPCOrigins-Service-SG` |
| ALB public | Groupe de sécurité n'autorisant que la liste de préfixes CloudFront côté origine, plus la vérification de l'en-tête secret |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOnlyOurDistribution",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::media-assets-prod/*",
      "Condition": {
        "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::111122223333:distribution/E2QWRUHEXAMPLE" }
      }
    }
  ]
}
```

**CORS Amazon S3.** Une configuration de partage des ressources entre origines multiples (CORS : jusqu'à 100 règles, la première règle correspondante s'applique) liste `AllowedOrigins`, `AllowedMethods`, `AllowedHeaders`, `ExposeHeaders` et `MaxAgeSeconds`. CORS indique seulement aux navigateurs quels appels entre origines autoriser : il **n'accorde aucun accès** ; les politiques de compartiment, les ACL et les URL présignées décident toujours. Derrière CloudFront, transmettez l'en-tête `Origin` pour que S3 puisse évaluer CORS, ou répondez aux requêtes CORS par une politique d'en-têtes de réponse.

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://app.example.com"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedHeaders": ["Content-Type", "Authorization"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 600
    }
  ]
}
```

**Politiques AWS IoT.** Les politiques IoT Core s'attachent à des certificats X.509, à des identités Amazon Cognito ou à des groupes d'objets (thing groups), refusent par défaut et utilisent les actions `iot:Connect`, `iot:Publish`, `iot:Subscribe` et `iot:Receive` sur des ressources `client`, `topic` et `topicfilter`. Les variables de politique lient chaque appareil à sa propre identité : `${iot:Connection.Thing.ThingName}` dans les ARN de ressources, et la condition `iot:Connection.Thing.IsAttached` à `true` pour qu'un certificat valide ne puisse pas se faire passer pour un autre objet. Les modifications de politique peuvent mettre plusieurs minutes à se propager.

**Shield Advanced en périphérie** : protégez la distribution CloudFront et la zone hébergée Route 53 (et l'ALB s'il est aussi accessible), associez des vérifications de l'état et activez le groupe de règles Anti-DDoS dans l'ACL web.

> **Piège d'examen.** Une règle CORS S3 qui autorise `https://app.example.com` ne rend pas les objets lisibles par les utilisateurs de ce site : sans autorisation dans la politique de compartiment ni URL présignée, le navigateur reçoit `403`. À l'inverse, `AllowedOrigins: ["*"]` n'est pas non plus un accès public.

<!-- section: edge-rules | objectives: 3.1.3 -->
## Règles en périphérie : géographie, limitation du débit et empreinte du client

**Géographie.**

| | Restriction géographique CloudFront | Instruction de correspondance géographique (geo match) AWS WAF |
| --- | --- | --- |
| Granularité | Pays uniquement | Pays (ISO 3166-1 alpha-2), et région (ISO 3166-2) par des étiquettes comme `awswaf:clientip:geo:region:US-OR` |
| Portée | Toute la distribution, liste d'autorisation ou de blocage | N'importe quelle règle, combinable avec des chemins, en-têtes, ensembles d'IP, limites de débit |
| Réponse | `403` (page d'erreur personnalisée possible) | Action de la règle (Block avec réponse personnalisée, CAPTCHA, Count) |
| Adresse du client | IP du lecteur | IP source ou IP lue dans un en-tête (configuration d'IP transférée) |

Les requêtes bloquées par la restriction CloudFront ne sont pas transmises à WAF : quand la géographie doit se combiner à d'autres critères, utilisez l'instruction geo match de WAF. Des localisations plus fines (ville, code postal) exigent un service de géolocalisation tiers avec des URL signées.

**Limitation du débit** avec les règles basées sur le débit :

- **Fenêtre d'évaluation** : 60, 120, 300 ou 600 secondes (300 par défaut). **Limite** : 10 requêtes au minimum par fenêtre et par instance d'agrégation. Action : toute action sauf Allow.
- **Agrégation** : IP source, adresse IP dans un en-tête, ASN, ASN dans un en-tête, tout compter (count all, exige une instruction de réduction de portée) ou **clés personnalisées** combinant espace de noms d'étiquette, en-tête, cookie, argument de requête, chaîne de requête, chemin d'URI, empreinte JA3, empreinte JA4, méthode HTTP, IP. Une requête à laquelle manque un composant de la clé n'est pas comptée.
- Une **instruction de réduction de portée** (scope-down statement) limite le comptage aux requêtes correspondantes, par exemple un chemin.
- Derrière un proxy ou un CDN, l'IP source est celle du proxy ; utilisez l'option d'IP transférée (première adresse de `X-Forwarded-For`), en sachant que les en-têtes peuvent être falsifiés.

```json
{
  "Name": "login-throttle",
  "Priority": 10,
  "Action": { "Block": {} },
  "Statement": {
    "RateBasedStatement": {
      "Limit": 50,
      "EvaluationWindowSec": 300,
      "AggregateKeyType": "CUSTOM_KEYS",
      "CustomKeys": [
        { "IP": {} },
        { "JA4Fingerprint": { "FallbackBehavior": "MATCH" } }
      ],
      "ScopeDownStatement": {
        "ByteMatchStatement": {
          "SearchString": "/account/login",
          "FieldToMatch": { "UriPath": {} },
          "TextTransformations": [{ "Priority": 0, "Type": "LOWERCASE" }],
          "PositionalConstraint": "STARTS_WITH"
        }
      }
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "login-throttle"
  }
}
```

**Empreinte du client (client fingerprinting).** Les empreintes **JA3** (hachage de 32 caractères) et **JA4** (36 caractères) décrivent le TLS Client Hello du client. AWS WAF ne les inspecte que sur **CloudFront et ALB**, avec des instructions de chaîne, d'expression régulière et de taille (pas les instructions SQLi ou XSS), et exige un **comportement de repli** (fallback : correspondance ou non) pour les requêtes dont l'empreinte ne peut pas être calculée. Récupérez les valeurs dans les journaux WAF, puis bloquez l'empreinte d'un outil malveillant, ou limitez le débit par empreinte quand les attaquants changent d'adresse IP. L'inspection de l'**ordre des en-têtes** est un autre signal d'empreinte.

> **Conseil d'examen.** « Les attaquants passent par des milliers d'adresses IP mais utilisent le même outil » désigne une limitation du débit ou un blocage sur l'empreinte JA3 ou JA4, pas sur l'IP. « Bloquer un pays sauf deux de ses États » exige un geo match WAF avec des étiquettes de région ; la restriction géographique CloudFront ne sait pas le faire.

<!-- section: edge-integrations | objectives: 3.1.4 -->
## Intégrations avec les services AWS en périphérie et les services tiers

**Journalisation WAF.** Une seule destination de journalisation par ACL web : groupe de journaux CloudWatch Logs, compartiment S3 ou flux Amazon Data Firehose, dont le nom commence par `aws-waf-logs-`. Les journaux contiennent la règle terminale, les étiquettes, les empreintes JA3 et JA4 et le détail de la requête ; les **champs masqués** (redacted fields) cachent des valeurs comme l'en-tête `authorization`, et les **filtres de journalisation** ne conservent qu'une partie des requêtes. Le masquage de la configuration de journalisation ne s'applique ni à l'échantillonnage des requêtes ni à la collecte par Security Lake : utilisez pour cela les paramètres de protection des données de l'ACL web.

**Ingestion OCSF avec Amazon Security Lake.**

- Les **journaux AWS WAFv2** sont une source native de Security Lake (sans frais WAF pour cette collecte), convertis en OCSF avec CloudTrail, les journaux de flux VPC, Route 53 Resolver, les journaux d'audit EKS et les résultats Security Hub CSPM.
- Les **sources personnalisées** apportent les données d'un CDN, d'un WAF ou d'un pare-feu tiers : le producteur écrit des objets **Parquet** au format **OCSF** (version 1.3 ou antérieure), **une classe d'événements OCSF par source personnalisée**, sous le préfixe de la source partitionné en `region=`, `accountId=`, `eventDay=`. Security Lake crée le préfixe, un rôle de fournisseur, une table Lake Formation et un robot d'indexation Glue. Jusqu'à 50 sources personnalisées par compte.
- Les **abonnés** (un SIEM, Athena, OpenSearch) reçoivent un accès aux données ou un accès par requête.

```text
aws-security-data-lake-eu-west-1-example/ext/edge-cdn-http/region=eu-west-1/accountId=111122223333/eventDay=20261121/part-0001.zstd.parquet
```

**Règles WAF tierces.** Les groupes de règles gérés AWS Marketplace des éditeurs de sécurité s'abonnent dans la console WAF et s'ajoutent à une ACL web comme n'importe quel groupe de règles. Le vendeur maîtrise les règles, actions, étiquettes et mises à jour ; vous ne pouvez pas les modifier, mais vous pouvez remplacer l'action d'une règle ou de tout le groupe par Count pour traiter les faux positifs. Tarification : un abonnement mensuel plus les requêtes. Pour ne plus payer, retirez le groupe de toutes les ACL web et politiques Firewall Manager avant d'annuler l'abonnement.

**AWS Firewall Manager** applique dans toute l'organisation les politiques WAF (y compris des groupes Marketplace, des groupes gérés par AWS et des règles personnalisées), les protections Shield Advanced et les politiques de groupes de sécurité, d'ACL réseau, de Network Firewall et de DNS Firewall, y compris aux nouveaux comptes et ressources dès leur apparition.

**Intégrations de surveillance** : métriques WAF par règle dans CloudWatch, métriques et événements Shield Advanced `DDoSDetected`, données WAF et Shield visibles par la SRT au moyen de son rôle d'accès.

> **Piège d'examen.** Une politique WAF de Firewall Manager qui utilise un groupe de règles AWS Marketplace ne fonctionne que si chaque compte concerné s'est abonné à ce groupe. Et les journaux WAF vont vers une seule destination : pour alimenter à la fois un SIEM et un stockage longue durée, envoyez-les à Firehose et distribuez, ou à S3 et laissez Security Lake collecter.

<!-- section: key-points -->
## Points clés

- Associer menace et contrôle : Shield Standard et services en périphérie pour les couches 3/4, règles basées sur le débit WAF et Anti-DDoS pour les inondations HTTP, groupes de règles gérés pour les menaces OWASP, Bot Control, ATP et ACFP pour l'automatisation et la fraude.
- WAF s'attache à CloudFront, ALB, API REST API Gateway, AppSync, Cognito, App Runner, Verified Access et AgentCore Gateway ; jamais à un NLB.
- Protéger l'origine : OAC pour S3, origines VPC ou liste de préfixes côté origine pour les équilibreurs et instances, vérification d'un en-tête secret ; les politiques d'en-têtes de réponse ajoutent HSTS, CSP et d'autres en-têtes de sécurité.
- CORS est une règle pour les navigateurs, pas un accès accordé ; les politiques IoT lient les certificats aux noms d'objets avec des variables de politique et `IsAttached`.
- Géographie : restriction CloudFront pour des listes de pays sur toute une distribution, geo match WAF pour les régions et les règles combinées ; fenêtres de 60 à 600 secondes, limite minimale de 10, clés personnalisées dont JA3 et JA4.
- Intégrer : une destination de journaux WAF préfixée `aws-waf-logs-`, la source WAF native de Security Lake et des sources personnalisées OCSF, des groupes de règles Marketplace, Firewall Manager dans toute l'organisation.
