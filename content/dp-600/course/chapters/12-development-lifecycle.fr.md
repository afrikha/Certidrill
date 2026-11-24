Le cycle de vie de développement des analyses couvre la façon dont les éléments Fabric sont versionnés, promus du développement vers la production, vérifiés pour leur impact en aval et réutilisés. L'examen mélange des outils qui se ressemblent : l'intégration Git versionne un espace de travail, les pipelines de déploiement promeuvent le contenu entre les espaces de travail des étapes, le point de terminaison XMLA permet à des outils externes d'écrire dans un modèle sémantique, et .pbip, .pbit et .pbids sont trois fichiers différents. Les questions demandent lequel répond à un besoin, qui peut l'utiliser, et ce qu'il copie ou ne copie pas.

<!-- section: git-integration | objectives: 1.2.1 -->
## Le contrôle de version avec l'intégration Git

L'intégration Git connecte **un espace de travail** à **une branche et un dossier** d'un référentiel **Azure DevOps, GitHub ou GitHub Enterprise** (cloud uniquement). Tous les éléments de l'espace de travail sont versionnés ensemble, et les dossiers de l'espace de travail correspondent aux dossiers Git. Git stocke les **définitions des éléments, jamais les données**. La prise en charge dépend du type d'élément : les lakehouses, entrepôts, notebooks, pipelines et Dataflow Gen2 sont pris en charge, alors que les éléments Power BI **Report**, **Semantic model** et **Paginated report** sont toujours indiqués en préversion.

Prérequis et autorisations :

- L'espace de travail est sur une capacité Fabric (ou Power BI Premium), et un administrateur Fabric active le paramètre de locataire **Users can synchronize workspace items with their Git repositories** (plus le paramètre GitHub pour GitHub).
- **Seul un Admin de l'espace de travail connecte ou déconnecte** l'espace de travail (**Paramètres de l'espace de travail > Intégration Git** : fournisseur, organisation, projet, référentiel, branche, dossier, puis **Connecter et synchroniser**).
- Valider et mettre à jour demandent **Contributor** (avec l'écriture sur les éléments) et les droits Git correspondants : Read pour mettre à jour ; Read, Contribute et une stratégie de branche qui autorise les commits directs pour valider. Les Viewers ne peuvent faire aucune action Git.
- Changer ou créer une branche depuis Fabric est réservé à l'Admin, sauf si l'Admin active **Allow users with at least Contributor role to change Git branch**.

À la première synchronisation, si un côté est vide, son contenu est copié depuis l'autre ; si les deux ont du contenu, vous choisissez le sens : **valider** (commit) écrase Git, **mettre à jour** (update) écrase l'espace de travail.

| Statut Git d'un élément | Sens | Que faire |
| --- | --- | --- |
| Synced (synchronisé) | Espace de travail et branche identiques | Rien |
| Uncommitted changes (modifications non validées) | Modifié dans l'espace de travail | Valider depuis le volet Contrôle de code source |
| Update required (mise à jour requise) | Modifié dans Git (par exemple une demande de tirage fusionnée) | Mettre à jour ; la mise à jour tire toujours toute la branche |
| Conflict (conflit) | Modifié des deux côtés | Résoudre ; validation et mise à jour sont bloquées |
| Unsupported item (élément non pris en charge) | Le type d'élément ne peut pas être synchronisé | Ignoré par Git, pas supprimé |

Les modèles de branches :

- **Créer une branche vers** (Branch out) crée un nouvel espace de travail connecté à une nouvelle branche : chaque développeur travaille dans un espace de travail isolé, puis fusionne par une **demande de tirage** (pull request) dans Git.
- Les validations sont désactivées tant que Git a des modifications plus récentes : mettez à jour d'abord, puis validez.
- Limites utiles : 1 000 éléments par espace de travail pour la synchronisation, 25 Mo par fichier, dossiers sur 10 niveaux.

> **Piège d'examen.** L'intégration Git ne déplace pas le contenu vers un espace de travail de test ou de production et ne change pas les sources de données. Elle versionne des définitions. Promouvoir avec des connexions propres à chaque environnement est le rôle des pipelines de déploiement (ou de branches Git connectées à l'espace de travail de chaque étape).

<!-- section: pbip-projects | objectives: 1.2.2 -->
## Les projets Power BI Desktop (.pbip)

Un .pbix est un seul fichier binaire. Enregistrer en **projet Power BI** (**Fichier > Enregistrer sous**, type *Power BI Project (.pbip)*) écrit le rapport et le modèle sémantique sous forme de **fichiers texte** que Git peut comparer et fusionner :

```text
Sales/
├── Sales.pbip                  pointer that opens the report (optional)
├── Sales.Report/
│   └── definition.pbir         points to the semantic model
├── Sales.SemanticModel/
│   ├── definition.pbism
│   ├── definition/             model metadata as TMDL files
│   └── .pbi/cache.abf          local data cache, not committed
└── .gitignore                  excludes .pbi/localSettings.json and .pbi/cache.abf
```

- Le `.gitignore` n'est créé que s'il n'en existe pas déjà un. Le cache local garde les données hors du référentiel : **un projet stocke des définitions, pas des données**.
- Les métadonnées du modèle peuvent être modifiées hors de Desktop (TMDL dans Visual Studio Code, ou outils externes connectés à Desktop) ; Desktop détecte les modifications externes et propose de les appliquer. Les fichiers non documentés comme `report.json` ou `diagramLayout.json` ne doivent pas être modifiés à la main.
- Déployez un projet avec l'intégration Git de Fabric (validez le dossier dans la branche d'un espace de travail connecté ; les éléments Report et Semantic model y sont en préversion), les API REST Fabric, ou **Publier** dans Desktop, qui charge aussi le cache.
- Convertissez un .pbix en .pbip et inversement uniquement par **Enregistrer sous** dans Desktop.
- Limitations : pas d'étiquettes de confidentialité dans un projet, pas d'enregistrement direct dans OneDrive ou SharePoint, chemin racine court (260 caractères sous Windows).

> **Conseil d'examen.** « Plusieurs développeurs doivent travailler sur le même rapport et le même modèle, relire les modifications ligne par ligne et les fusionner » appelle un .pbip avec Git. Un .pbix dans un référentiel ne peut être remplacé que d'un bloc.

<!-- section: deployment-pipelines | objectives: 1.2.3 -->
## Les pipelines de déploiement

Un pipeline de déploiement compte **de 2 à 10 étapes** (trois par défaut : Development, Test, Production), **un espace de travail par étape**, sur une capacité Fabric. Déployer copie des éléments d'une étape vers une étape adjacente, dans un sens ou dans l'autre, et écrase les éléments **appariés** de la cible.

| Copié | Non copié |
| --- | --- |
| Métadonnées et définitions des éléments, pages de rapport, métadonnées du modèle, relations entre éléments | Les **données** : actualisez les modèles sémantiques après un déploiement vers une étape vide |
| Sources de données et paramètres (puis modifiés par les règles) | Autorisations et paramètres de l'espace de travail ; contenu des applications |
| Étiquettes de confidentialité, seulement pour les nouveaux éléments ou quand l'étiquette source est protégée et pas celle de la cible | Attributions de rôles du modèle sémantique, planification d'actualisation, informations d'identification des sources, paramètres de mise en cache des requêtes, approbation |

Les **règles de déploiement** changent des valeurs dans l'étape **cible**, pour que le test et la production utilisent leurs propres sources :

| Règle | Éléments |
| --- | --- |
| Règle de source de données | Modèles sémantiques, flux de données Gen1, rapports paginés, bases de données en miroir |
| Règle de paramètre | Modèles sémantiques, flux de données Gen1 |
| Règle de lakehouse par défaut | Notebooks |

- Les règles sont créées dans l'étape cible (jamais dans la première étape) par le **propriétaire** de l'élément, et prennent effet au déploiement suivant.
- Une règle de source de données ne peut basculer que vers une source **du même type**.
- Pour les modèles Direct Lake sur SQL, utilisez des règles de source de données ; pour les modèles **Direct Lake sur OneLake**, des paramètres M et des **règles de paramètre**.

La **liaison automatique** (autobinding) garde les dépendances dans l'étape : un rapport déployé en Test se lie à la copie Test de son modèle sémantique. Si la dépendance n'existe pas dans la cible, le déploiement échoue ; utilisez **Sélectionner les éléments associés** pour la déployer aussi. La liaison automatique n'est pas prise en charge pour Dataflow Gen2. Le premier déploiement d'un élément Power BI échoue aussi si l'étape cible contient déjà un élément de même nom et de même type.

Autorisations :

| Action | Demande |
| --- | --- |
| Créer un pipeline | Licence Pro, PPU ou Premium ; vous devenez Admin du pipeline |
| Affecter un espace de travail à une étape | Admin du pipeline et Admin de l'espace de travail |
| Déployer vers une étape vide | Admin du pipeline et Contributor sur l'espace de travail source |
| Déployer vers l'étape suivante | Admin du pipeline et Contributor sur les deux espaces de travail (et propriétaire de l'élément pour les flux de données) |
| Créer une règle de déploiement | Admin du pipeline, Contributor ou plus sur la cible, propriétaire de l'élément |
| Voir l'historique des déploiements | Admin du pipeline |

> **Piège d'examen.** Admin est la seule autorisation de pipeline et elle ne donne pas accès au contenu des espaces de travail. Un Admin du pipeline sans rôle d'espace de travail ne peut pas déployer.

| Besoin | Outil |
| --- | --- |
| Tracer chaque modification, revenir en arrière, fusionner un travail parallèle | Intégration Git |
| Promouvoir en production un contenu testé, avec les chaînes de connexion de production | Pipeline de déploiement avec règles |
| Chaque développeur travaille isolé | Créer une branche vers des espaces de travail personnels |

<!-- section: impact-analysis | objectives: 1.2.4 -->
## L'analyse d'impact des dépendances en aval

Avant de modifier un lakehouse, un entrepôt, un flux de données ou un modèle sémantique, lancez une **analyse d'impact** sur lui : depuis sa carte dans la **vue de traçabilité** de l'espace de travail, ou depuis la page de détails de l'élément. Elle demande l'**autorisation d'écriture** sur l'élément.

| Onglet ou option | Affiche |
| --- | --- |
| Éléments enfants | Uniquement les enfants directs |
| Tous les éléments en aval | Tous les éléments dépendants, avec le nombre d'éléments et d'espaces de travail touchés |
| Parcourir par type d'élément / Parcourir par espace de travail | Regroupe les éléments touchés |
| Accès limité | Les éléments que vous ne pouvez pas ouvrir apparaissent sans leur nom |
| Notifier les contacts | Envoie un e-mail avec votre message aux listes de contacts de tous les espaces de travail touchés, même ceux auxquels vous n'avez pas accès |

Pour une **source de données**, le volet ne montre que les enfants directs et la chaîne de connexion ; relancez l'analyse d'impact sur un enfant pour aller plus loin.

> **Conseil d'examen.** « Avant de renommer une colonne de la table du lakehouse, identifiez tous les rapports d'autres espaces de travail qui peuvent casser et prévenez leurs propriétaires » veut dire analyse d'impact, **Tous les éléments en aval**, puis **Notifier les contacts**.

<!-- section: xmla-endpoint | objectives: 1.2.5 -->
## Gérer les modèles sémantiques par le point de terminaison XMLA

Les espaces de travail sur une capacité Fabric, Premium ou PPU exposent un **point de terminaison XMLA**, le protocole d'Analysis Services, pour que des outils gèrent les modèles sémantiques comme un serveur Analysis Services :

```text
powerbi://api.powerbi.com/v1.0/myorg/Sales%20Analytics
```

Copiez l'adresse depuis **Paramètres de l'espace de travail > Premium > Connexion de l'espace de travail** ; les espaces du nom de l'espace de travail sont encodés en URI.

| Paramètre | Permet | Où |
| --- | --- | --- |
| **Read** (par défaut) | Requêtes, métadonnées et traces : DAX Studio, Excel, SQL Server Profiler | Paramètres de la capacité, charge de travail des modèles sémantiques, **XMLA Endpoint** |
| **Read Write** | Aussi déployer des modèles, exécuter des scripts TMSL, modifier les métadonnées, actualiser des partitions individuelles | Même paramètre, défini par un administrateur de capacité ; s'applique à tous les espaces de travail de la capacité |

- Le paramètre de locataire **Allow XMLA endpoints and Analyze in Excel with on-premises semantic models** doit aussi être activé (il l'est par défaut).
- **Contributor ou plus** dans l'espace de travail agit comme administrateur de base de données par XMLA ; l'autorisation **Build** donne l'accès en lecture (comme lecteur de base de données, filtré par la RLS).
- Outils : Tabular Editor et ALM Toolkit (écrire les métadonnées, comparer et déployer), SSMS (scripts TMSL, actualisation de partitions), Visual Studio avec les projets Analysis Services, PowerShell `Invoke-ASCmd`, DAX Studio (lecture).
- Les actualisations par XMLA ne sont pas limitées aux 48 actualisations planifiées par jour et peuvent cibler une seule partition, comme les partitions d'actualisation incrémentielle. Elles n'actualisent pas les caches de vignettes, qui s'actualisent quand un utilisateur ouvre le rapport.
- Les informations d'identification des sources ne peuvent pas être définies par XMLA : définissez-les dans les paramètres du modèle sémantique.
- Microsoft recommande le **format de stockage de modèle sémantique volumineux** pour les modèles écrits par XMLA. Les opérations d'écriture sur un modèle créé dans Power BI Desktop exigent les **métadonnées améliorées**.

> **Piège d'examen.** Après une écriture par XMLA, un modèle sémantique créé dans Power BI Desktop **ne peut plus être téléchargé en .pbix**. Gardez le .pbix source ou, mieux, un .pbip dans Git.

<!-- section: reusable-assets | objectives: 1.2.6 -->
## Les ressources réutilisables : .pbit, .pbids et modèles sémantiques partagés

| Fichier ou ressource | Contient | Créé avec | Sert à |
| --- | --- | --- | --- |
| Modèle (.pbit) | Pages et visuels du rapport, définition du modèle (tables, relations, mesures), requêtes et paramètres ; **aucune donnée** | **Fichier > Exporter > Modèle Power BI** dans Desktop | Démarrer de nouveaux rapports avec la même présentation et le même modèle ; les paramètres sont demandés à l'ouverture |
| Fichier de source de données (.pbids) | Une connexion en JSON : protocole, adresse, mode facultatif | **Fichier > Options et paramètres > Paramètres de la source de données > Exporter PBIDS**, ou à la main | Donner aux auteurs de rapports une connexion prête ; Desktop ouvre le Navigateur pour choisir les tables |
| Modèle sémantique partagé | Un modèle publié réutilisé par de nombreux rapports | Publier une fois, accorder **Build** | Un modèle gouverné, de nombreux rapports légers |

Un fichier .pbids contient **exactement une** source de données et **ni informations d'identification, ni tables, ni requête** ; si `mode` est absent, l'utilisateur choisit Import ou DirectQuery. Pour SQL Server (`tds`), `database` est facultatif : un fichier peut désigner un serveur sans nommer de base de données :

```json
{
  "version": "0.1",
  "connections": [
    {
      "details": {
        "protocol": "tds",
        "address": {
          "server": "sql-contoso.database.windows.net",
          "database": "SalesDB"
        }
      },
      "options": {},
      "mode": "DirectQuery"
    }
  ]
}
```

**Modèles sémantiques partagés.** Les auteurs de rapports se connectent depuis Power BI Desktop ou le service à un modèle publié (**Modèles sémantiques Power BI** dans Obtenir les données, ou le catalogue OneLake) et créent des **rapports légers** en connexion active : ni données ni modèle dans le fichier du rapport. Il leur faut l'autorisation **Build** sur le modèle (par le rôle Contributor ou plus, ou accordée sur le modèle ou l'application). Approuvez le modèle (Promoted ou Certified) et rendez-le détectable pour que les auteurs le trouvent. Une modification du modèle partagé atteint tous les rapports : vérifiez-la d'abord par une analyse d'impact.

> **Piège d'examen.** Un .pbit ne transporte pas de données et un .pbids ne transporte ni tables ni informations d'identification. Aucun des deux ne remplace un modèle sémantique partagé quand le besoin est « une source de vérité unique utilisée par tous les rapports ».

<!-- section: key-points -->
## Points clés

- Intégration Git : l'Admin de l'espace de travail connecte ; une branche et un dossier ; définitions uniquement ; éléments Report et Semantic model encore en préversion ; valider, mettre à jour, créer une branche vers, demandes de tirage.
- .pbip = fichiers texte pour Git ; .pbit = modèle sans données ; .pbids = une connexion sans informations d'identification.
- Pipelines de déploiement : 2 à 10 étapes, métadonnées uniquement, règles dans l'étape cible par le propriétaire de l'élément, liaison automatique dans l'étape, Admin du pipeline plus Contributor sur les deux espaces de travail pour déployer.
- L'analyse d'impact demande l'autorisation d'écriture ; Tous les éléments en aval et Notifier les contacts répondent à « qui casse et qui prévenir ».
- XMLA Read est la valeur par défaut ; Read Write est un paramètre de capacité ; un modèle Desktop modifié ne peut plus être téléchargé en .pbix.
- Les modèles sémantiques partagés demandent l'autorisation Build et se trouvent grâce à l'approbation et à la découverte.
