Azure App Service héberge des applications web et des API sans serveurs à gérer. Presque toutes les questions d'examen sur App Service reviennent à une seule chose : quel **niveau tarifaire** offre la fonctionnalité, et comment elle se comporte.

<!-- section: app-service-plans | objectives: 3.4.1 -->
## Plans App Service

Un **plan App Service** est l'ensemble des ressources de calcul qui exécutent vos applications. Il fixe :

- la **région** ;
- le **système d'exploitation** (Windows ou Linux : un plan héberge l'un ou l'autre) ;
- le **niveau tarifaire** et la taille des instances (par exemple S1, P1v3) ;
- le **nombre d'instances**.

Toutes les applications d'un plan s'exécutent sur **les mêmes instances** et évoluent ensemble. Vous payez le plan, pas chaque application (niveaux dédiés). Une application qui demande une autre région, un autre système d'exploitation ou une mise à l'échelle indépendante a besoin de son propre plan.

| Niveau | Calcul | Instances max. | Domaine personnalisé | Liaison TLS | Mise à l'échelle automatique | Emplacements | Sauvegardes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Gratuit** (F1) | Partagé, quota de processeur | 1 | Non | Non | Non | Non | Non |
| **Partagé** (D1) | Partagé, quota de processeur | 1 | Oui | Non | Non | Non | Non |
| **Basic** (B1-B3) | Dédié | 3, manuel | Oui | SNI, certificat managé | Non | Non | Oui |
| **Standard** (S1-S3) | Dédié | 10 | Oui | SNI et basée sur IP | **Oui** | **5** | Oui |
| **Premium** (v3, v4) | Dédié, plus rapide | 30 | Oui | Oui | Oui, plus la mise à l'échelle automatique | 20 | Oui |
| **Isolé** (v2) | Dédié, dans un environnement App Service Environment à l'intérieur de votre réseau virtuel | 100 | Oui | Oui | Oui | 20 | Oui |

Réponses « au moindre coût » à mémoriser : domaine personnalisé = **Partagé** ; HTTPS sur un domaine personnalisé, instances dédiées, sauvegardes, intégration au réseau virtuel, point de terminaison privé = **Basic** ; mise à l'échelle automatique et emplacements de déploiement = **Standard** ; plus de 10 instances, plus de 5 emplacements, redondance de zone = **Premium** ; isolation réseau complète = **Isolé**.

```bash
az appservice plan create -g RG1 -n plan-contoso --location westeurope \
  --is-linux --sku P1V3 --number-of-workers 2
```

<!-- section: app-service-scaling | objectives: 3.4.2 -->
## Mettre à l'échelle un plan App Service

| Direction | Ce qui change | Comment |
| --- | --- | --- |
| **Scale-up** / scale-down (montée en puissance) | Le **niveau ou la taille** des instances : plus de processeur, de mémoire, de fonctionnalités | *Monter en puissance (plan App Service)* ; s'applique en quelques secondes à toutes les applications, sans redéploiement |
| **Scale-out** / scale-in (montée en charge) | Le **nombre** d'instances | *Monter en charge (plan App Service)* |

Méthodes de scale-out :

| Méthode | Niveau | Comportement |
| --- | --- | --- |
| **Manuelle** | Basic et supérieurs | Un nombre d'instances fixe ; il ne change jamais de lui-même |
| **Mise à l'échelle automatique basée sur des règles** (autoscale d'Azure Monitor) | Standard et supérieurs | Règles sur des métriques (pourcentage de processeur, mémoire, longueur de la file HTTP) ou des planifications, entre des limites minimale et maximale |
| **Mise à l'échelle automatique** (automatic scaling) | Premium v2 et supérieurs | La plateforme ajoute des instances selon le trafic HTTP. *Rafale maximale* au niveau du plan ; *instances toujours prêtes* par application |

L'autoscale fonctionne comme pour les groupes identiques : limites d'instances, paires de règles de scale-out et de scale-in, refroidissement, et **profils** (par défaut, récurrent, dates fixes ; un profil à dates fixes l'emporte sur les autres pendant ses dates).

> **Piège d'examen.** « Monter en puissance vers S3 » n'ajoute pas d'instances. Si l'exigence est « le nombre d'instances doit changer automatiquement avec la charge », la réponse est l'autoscale sur un plan Standard ou supérieur, jamais un scale-up ni un nombre d'instances manuel.

<!-- section: create-web-app | objectives: 3.4.3 -->
## Créer une application

Une application a un nom unique au monde qui forme son nom d'hôte par défaut `<app>.azurewebsites.net`. À la création, vous choisissez le mode de publication (**code** ou **conteneur**), la **pile d'exécution** (.NET, Java, Node.js, Python, PHP), le système d'exploitation, la région et le plan.

```bash
az webapp list-runtimes --os-type linux
az webapp create -g RG1 -n app-contoso-web --plan plan-contoso \
  --runtime "NODE:20-lts" --https-only true
az webapp config appsettings set -g RG1 -n app-contoso-web --settings API_URL=https://api.contoso.com
```

- Les **paramètres d'application** et les **chaînes de connexion** sont exposés au code sous forme de variables d'environnement ; les modifier redémarre l'application.
- Déploiement : déploiement ZIP, Git local, GitHub Actions ou Azure Pipelines (*Centre de déploiement*), FTPS, ou image conteneur.
- **Always On** (Basic et supérieurs) garde l'application chargée au lieu de la décharger après une période d'inactivité.
- Une **identité managée** permet à l'application d'accéder à Key Vault, au stockage ou à une base de données sans secret.
- La console Kudu (`<app>.scm.azurewebsites.net`) donne accès aux fichiers et aux journaux.

<!-- section: app-service-tls | objectives: 3.4.4 -->
## Certificats et TLS

Réglages de protocole : **HTTPS uniquement** redirige HTTP vers HTTPS ; **Version TLS minimale** rejette les versions plus anciennes (1.2 par défaut). Le nom par défaut `*.azurewebsites.net` dispose déjà d'un certificat Microsoft ; les certificats servent aux **domaines personnalisés**.

| Option de certificat | Caractéristiques |
| --- | --- |
| **Certificat managé App Service** | Gratuit ; créé et **renouvelé automatiquement** ; pour un domaine personnalisé déjà mappé à l'application ; **pas de caractère générique, non exportable** ; l'application doit être joignable depuis internet pour la validation d'un domaine racine |
| **Certificat App Service** | Acheté via Azure, stocké dans Key Vault, renouvellement automatique possible ; standard ou **générique** (wildcard) |
| Import depuis Key Vault | Un certificat que vous gérez dans Key Vault |
| Chargement d'un certificat privé (`.pfx`) | Un certificat de n'importe quelle autorité ; vous gérez le renouvellement |
| Chargement d'un certificat public (`.cer`) | Pas pour les liaisons : permet à l'application d'approuver un point de terminaison distant |

Créez ensuite une **liaison** entre le domaine personnalisé et le certificat : **SNI SSL** (Basic et supérieurs) ou **SSL basé sur IP** (Standard et supérieurs ; adresse IP entrante dédiée, pour les anciens clients).

Ordre des opérations : mapper le domaine personnalisé, ajouter ou créer le certificat, créer la liaison.

```bash
az webapp update -g RG1 -n app-contoso-web --https-only true
az webapp config set -g RG1 -n app-contoso-web --min-tls-version 1.2
```

<!-- section: custom-domain | objectives: 3.4.5 -->
## Mapper un nom DNS personnalisé

Les domaines personnalisés demandent le niveau **Partagé** ou supérieur (TLS sur ces domaines demande Basic). App Service doit **vérifier que le domaine vous appartient**, et le DNS doit **acheminer** le nom vers l'application :

| Nom à mapper | Enregistrement d'acheminement | Enregistrement de vérification |
| --- | --- | --- |
| Sous-domaine `www.contoso.com` | **CNAME** `www` vers `<app>.azurewebsites.net` (à préférer : suit les changements d'IP), ou un enregistrement A | **TXT** `asuid.www` = ID de vérification du domaine personnalisé |
| Domaine racine (apex) `contoso.com` | Enregistrement **A** `@` vers l'adresse IP entrante de l'application (un CNAME est interdit à la racine) | **TXT** `asuid` = ID de vérification du domaine personnalisé |
| Générique `*.contoso.com` | CNAME `*` vers `<app>.azurewebsites.net` | TXT `asuid` |

Selon Learn, l'enregistrement TXT `asuid` n'est pas absolument obligatoire, mais fortement recommandé : il prouve la propriété et empêche la prise de contrôle de sous-domaine par une autre application App Service ; créez-le donc toujours. Un générique `*` ne valide pas les sous-domaines qui ont déjà leur propre enregistrement CNAME : un enregistrement TXT par sous-domaine peut alors être nécessaire.

Étapes : relever l'**ID de vérification du domaine personnalisé** et l'adresse IP de l'application (page Domaines personnalisés) ; créer les enregistrements DNS chez votre fournisseur DNS ; ajouter le domaine personnalisé dans l'application et valider ; ajouter un certificat et une liaison.

Pour migrer un site en service **sans interruption**, créez d'abord uniquement l'enregistrement TXT `asuid`, ajoutez et sécurisez le domaine dans App Service, et basculez le CNAME ou l'enregistrement A en dernier.

<!-- section: app-service-backup | objectives: 3.4.6 -->
## Sauvegarder une application

| | **Sauvegardes automatiques** | **Sauvegardes personnalisées** |
| --- | --- | --- |
| Niveaux | Basic, Standard, Premium, Isolé | Idem |
| Configuration | Aucune : activées par défaut | Un **compte de stockage et un conteneur** que vous fournissez, à la demande ou planifiées |
| Fréquence et rétention | Toutes les heures, non configurable ; conservées 30 jours (chaque sauvegarde horaire des jours 1 à 3, puis une sur trois, puis une sur six à partir du jour 15) | Toutes les 2 heures au plus, jusqu'à 12 sauvegardes par jour (manuelles et planifiées) ; rétention de 0 à 30 jours ou illimitée (les sauvegardes à la demande sont conservées indéfiniment) |
| Taille | Jusqu'à 30 Go | Jusqu'à 10 Go, dont 4 Go au plus pour une base de données liée |
| Bases de données liées | Non | En cours de retrait : plus proposées dans les nouvelles configurations de sauvegarde (retirées pour MySQL et PostgreSQL en novembre 2025, pour Azure SQL et SQL Server en avril 2026) ; les existantes s'arrêtent le 31/03/2028 |
| Sauvegarde partielle | Non | Oui : exclusions listées dans `_backup.filter`, dans `%HOME%\site\wwwroot` |
| Téléchargement | Non | Oui : fichier ZIP et manifeste XML dans le conteneur |

Une sauvegarde contient la configuration de l'application et ses fichiers. Les bases de données liées sont en cours de retrait des sauvegardes personnalisées : utilisez plutôt la sauvegarde native de chaque service de base de données. Vous **restaurez** vers la même application (écrasement), vers un emplacement de déploiement ou vers une nouvelle application. Si le compte de stockage est derrière un pare-feu, activez la sauvegarde et la restauration via l'intégration au réseau virtuel.

<!-- section: app-service-networking | objectives: 3.4.7 -->
## Paramètres réseau

App Service sépare les fonctionnalités **entrantes** (qui peut atteindre l'application) des fonctionnalités **sortantes** (ce que l'application peut atteindre).

| Sens | Fonctionnalité | But |
| --- | --- | --- |
| Entrant | **Restrictions d'accès** | Autoriser ou refuser par plage IPv4/IPv6, **étiquette de service** ou **sous-réseau de réseau virtuel** (point de terminaison de service `Microsoft.Web`). Règles distinctes pour le site principal et le site `scm` |
| Entrant | **Point de terminaison privé** | Une adresse IP privée pour l'application dans votre réseau virtuel ; joignable depuis les réseaux connectés par peering et le réseau local. Désactivez l'accès réseau public pour refuser le trafic internet |
| Sortant | **Intégration au réseau virtuel** | L'application appelle des ressources **à l'intérieur** d'un réseau virtuel (et au-delà, par peering ou VPN). Demande un sous-réseau dédié, **délégué à `Microsoft.Web/serverFarms`**, dans la même région |
| Sortant | **Connexions hybrides** | L'application appelle un hôte et un port TCP locaux à travers Azure Relay, sans VPN |

- Les règles de restriction d'accès sont évaluées **par priorité, le plus petit numéro d'abord ; la première correspondance s'applique**. Dès qu'une règle existe, le trafic sans correspondance est refusé (HTTP 403) par la dernière règle implicite.
- L'intégration au réseau virtuel est **uniquement sortante** : elle ne rend pas l'application joignable en privé. Pour un accès entrant privé, utilisez un point de terminaison privé.
- Par défaut, seules les destinations privées (RFC 1918) passent par l'intégration ; avec *tout acheminer* (trafic internet sortant), tout y passe, et les NSG et tables de routage du sous-réseau d'intégration s'appliquent.
- Les **adresses IP sortantes** de l'application (Propriétés) sont celles qu'un pare-feu distant doit autoriser en l'absence d'intégration.

<!-- section: deployment-slots | objectives: 3.4.8 -->
## Emplacements de déploiement

Un emplacement de déploiement est une application active avec son propre nom d'hôte (`<app>-<emplacement>.azurewebsites.net`), dans le même plan que l'emplacement de production. Standard : 5 emplacements ; Premium et Isolé : 20.

Usage type : déployer en **préproduction** (staging), valider, puis **échanger** (swap) préproduction et production. Avant de basculer l'acheminement, App Service préchauffe les instances de l'emplacement source avec les paramètres de la cible : l'échange se fait donc **sans interruption** ; la version précédente se retrouve en préproduction, et un second échange constitue le **retour arrière**.

Ce qui suit le contenu lors d'un échange et ce qui reste avec l'emplacement :

| Échangé avec le contenu | Reste avec l'emplacement |
| --- | --- |
| Paramètres d'application et chaînes de connexion (non marqués comme paramètres d'emplacement), versions du framework, mappages de gestionnaires, certificats publics, contenu des WebJobs, mappages de chemins | Paramètres marqués **Paramètre d'emplacement de déploiement** (« collants »), noms de domaine personnalisés, certificats privés et liaisons TLS, **paramètres de mise à l'échelle**, points de terminaison de publication, identités managées, intégration au réseau virtuel, restrictions IP, Always On, paramètres de diagnostic |

Marquez comme paramètres d'emplacement les valeurs qui doivent différer entre environnements : la chaîne de connexion d'une base de préproduction, par exemple.

| Fonctionnalité | Comportement |
| --- | --- |
| **Échange avec aperçu** (en plusieurs phases) | La phase 1 applique les paramètres de la cible à l'emplacement source et s'interrompt : vous testez la préproduction avec les paramètres de production. Vous terminez ou annulez ensuite l'échange |
| **Échange automatique** | Chaque déploiement sur l'emplacement est échangé automatiquement avec la production après préchauffage. Non pris en charge pour les applications Linux |
| **% de trafic** (test en production) | Achemine un pourcentage du trafic de production vers un autre emplacement ; le paramètre de requête `x-ms-routing-name=<emplacement>` force un emplacement pour un utilisateur |
| Clonage des paramètres | Un nouvel emplacement peut copier la configuration d'un emplacement existant ; le contenu n'est pas copié |

```bash
az webapp deployment slot create -g RG1 -n app-contoso-web --slot staging \
  --configuration-source app-contoso-web
az webapp deployment slot swap -g RG1 -n app-contoso-web --slot staging --target-slot production
```

<!-- section: key-points -->
## Points clés

- Le plan fixe la région, le système d'exploitation, le niveau et les instances ; les applications d'un plan les partagent.
- Partagé : domaine personnalisé. Basic : TLS, sauvegardes, 3 instances manuelles. Standard : autoscale, 5 emplacements. Premium : 30 instances, 20 emplacements.
- Scale-up = instances plus grosses ; scale-out = plus d'instances ; autoscale à partir de Standard.
- Sous-domaine : CNAME plus TXT `asuid.<sous-domaine>`. Racine : enregistrement A plus TXT `asuid`.
- Certificat managé : gratuit, renouvelé automatiquement, pas de générique, non exportable.
- Les sauvegardes automatiques ne demandent aucune configuration ; les sauvegardes personnalisées demandent un compte de stockage et permettent les sauvegardes partielles ; les bases de données liées ne sont plus proposées pour les nouvelles sauvegardes (utilisez la sauvegarde propre à la base).
- L'intégration au réseau virtuel est sortante ; le point de terminaison privé et les restrictions d'accès sont entrants.
- Les paramètres d'emplacement restent avec l'emplacement ; échangez de nouveau pour revenir en arrière.
