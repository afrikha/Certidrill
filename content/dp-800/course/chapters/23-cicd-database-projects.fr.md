Un projet de base de données SQL conserve le schéma sous forme de code : un fichier `.sql` par objet, compilé en un `.dacpac` qui décrit l'état souhaité, puis déployé par SqlPackage, qui calcule les instructions `ALTER` dont une cible a besoin. Les questions d'examen donnent un extrait de pipeline, un fichier projet ou une exigence (bloquer la perte de données, garder les données de recherche dans Git, aucun déploiement en production sans approbation, aucun secret dans le dépôt) et demandent l'étape, la propriété ou le contrôle manquant.

<!-- section: sdk-projects | objectives: 2.3.3 -->
## Créer, générer et valider des projets SQL Database

| | Projet de style SDK | Projet d'origine |
| --- | --- | --- |
| Fichier projet | `<Sdk Name="Microsoft.Build.Sql" Version="..." />` | `<Import>` des cibles de build SSDT |
| Build | `dotnet build`, .NET 8 et versions ultérieures, Windows, Linux, macOS | MSBuild (.NET Framework) dans Visual Studio |
| Fichiers `.sql` | Inclus par défaut (`**/*.sql`) | Chacun listé avec `<Build Include>` |
| Outils | Extension SQL Database Projects pour VS Code, Database DevOps dans SSMS, ligne de commande ; style SDK dans Visual Studio 2022 (préversion) | SSDT dans Visual Studio |

```bash
dotnet new install Microsoft.Build.Sql.Templates
dotnet new sqlproj -n SalesDb
dotnet build SalesDb/SalesDb.sqlproj          # produces bin/Debug/SalesDb.dacpac
dotnet build SalesDb/SalesDb.sqlproj /p:DSP=Microsoft.Data.Tools.Schema.Sql.Sql160DatabaseSchemaProvider
```

```text
<Project DefaultTargets="Build">
  <Sdk Name="Microsoft.Build.Sql" Version="2.1.0" />
  <PropertyGroup>
    <Name>SalesDb</Name>
    <DSP>Microsoft.Data.Tools.Schema.Sql.SqlAzureV12DatabaseSchemaProvider</DSP>
    <RunSqlCodeAnalysis>True</RunSqlCodeAnalysis>
  </PropertyGroup>
  <ItemGroup>
    <PostDeploy Include="Scripts\PostDeployment\PostDeploy.sql" />
  </ItemGroup>
</Project>
```

La **plateforme cible** (`DSP`) détermine la syntaxe valide :

| Cible | Suffixe de la valeur `DSP` |
| --- | --- |
| SQL Server 2022 / 2025 | `Sql160DatabaseSchemaProvider` / `Sql170DatabaseSchemaProvider` |
| Azure SQL Database | `SqlAzureV12DatabaseSchemaProvider` |
| Base de données SQL dans Fabric (préversion) | `SqlDbFabricDatabaseSchemaProvider` |
| Entrepôt de données Fabric | `SqlDwUnifiedDatabaseSchemaProvider` |

Le build **valide** le modèle : la syntaxe T-SQL pour la plateforme cible, et chaque référence (une vue sur une colonne supprimée, une procédure qui appelle une table absente) donne une erreur de build. Les avertissements ne font pas échouer le build ; les règles d'analyse du code signalent les problèmes de conception. Un projet qui cible SQL Server 2017 échoue au build s'il utilise une fonction de SQL Server 2025. Publier vers une autre plateforme que celle du `DSP` échoue, sauf avec `/p:AllowIncompatiblePlatform=true`.

> **Piège d'examen.** Le `.dacpac` est un produit du build, pas une source : chaque build le régénère. La validation d'une modification fusionnée, c'est `dotnet build`, qui détecte les références cassées qu'une fusion Git sans conflit ne voit pas.

<!-- section: source-control | objectives: 2.3.4 -->
## Configurer le contrôle de code source

Initialisez Git à la racine du projet (ou de la solution) et organisez les fichiers par schéma et type d'objet, un objet par fichier : une modification de table ne touche que son fichier.

```text
SalesDb/
├── SalesDb.sqlproj
├── Tables/
│   ├── Customer.sql
│   └── OrderStatus.sql
├── Views/
├── StoredProcedures/
└── Scripts/
    ├── PreDeployment/PreDeploy.sql
    └── PostDeployment/
        ├── PostDeploy.sql
        └── OrderStatus.data.sql
```

```text
# .gitignore
bin/
obj/
*.dacpac
*.user
```

Validez dans le dépôt le `.sqlproj`, chaque script d'objet, les scripts de prédéploiement et de post-déploiement, les paramètres de comparaison de schémas (`.scmp`), le journal de refactorisation (`.refactorlog`) qui enregistre les renommages, et les profils de publication **sans** informations d'identification.

<!-- section: reference-data | objectives: 2.3.2 -->
## Données de référence et statiques dans le contrôle de code source

Les données de recherche (statuts, pays, paramètres) vont avec le schéma, dans le **script de post-déploiement**, qui s'exécute après les modifications de schéma à chaque déploiement. Un projet a au plus **un** script de prédéploiement et **un** script de post-déploiement ; découpez le contenu avec des inclusions SQLCMD `:r`.

```text
-- Scripts/PostDeployment/PostDeploy.sql
:r .\OrderStatus.data.sql
:r .\Country.data.sql
```

```text
-- Scripts/PostDeployment/OrderStatus.data.sql : idempotent, safe on every deployment
MERGE INTO dbo.OrderStatus AS target
USING (VALUES (1, N'Pending'), (2, N'Shipped'), (3, N'Delivered'), (4, N'Cancelled'))
      AS source (StatusID, StatusName)
ON target.StatusID = source.StatusID
WHEN MATCHED AND target.StatusName <> source.StatusName THEN
    UPDATE SET StatusName = source.StatusName
WHEN NOT MATCHED BY TARGET THEN
    INSERT (StatusID, StatusName) VALUES (source.StatusID, source.StatusName)
WHEN NOT MATCHED BY SOURCE THEN
    DELETE;
```

Les fichiers inclus doivent être exclus de la compilation du modèle, sinon le build tente de les compiler comme des objets :

```text
<ItemGroup>
  <Build Remove="Scripts\PostDeployment\OrderStatus.data.sql" />
  <None Include="Scripts\PostDeployment\OrderStatus.data.sql" />
</ItemGroup>
```

Les valeurs propres à un environnement viennent de **variables SQLCMD** déclarées dans le projet (`$(Environment)`) et définies au déploiement (`/v:Environment=prod`). Une `DefaultValue` déclarée dans le projet n'est pas compilée dans le `.dacpac` : elle préremplit seulement la boîte de dialogue de publication des outils graphiques, et un déploiement en ligne de commande sans `/v` ni profil de publication reçoit des valeurs vides. Le script de prédéploiement prépare les changements que le modèle ne sait pas exprimer, comme déplacer des données avant la suppression d'une colonne.

> **Piège d'examen.** Un simple `INSERT` dans le script de post-déploiement échoue sur une clé en double au deuxième déploiement. Les scripts de données de référence doivent être idempotents : `MERGE`, ou des tests `IF NOT EXISTS`. Ne gardez `WHEN NOT MATCHED BY SOURCE THEN DELETE` que si les lignes retirées de Git doivent disparaître de la base.

<!-- section: branching-prs | objectives: 2.3.5 -->
## Branches, pull requests et résolution des conflits

- Une **branche de fonctionnalité** de courte durée par modification (`git checkout -b feature/add-customer-email`), fusionnée dans `main` par une **pull request** ; `main` reste déployable.
- La pull request exécute un **build CI** (`dotnet build`, analyse du code, tests unitaires) comme vérification obligatoire : stratégie de branche **Build Validation** dans Azure DevOps, ou workflow GitHub sur `pull_request` vers `main` défini comme vérification d'état obligatoire.
- Les relecteurs vérifient les dépendances cassées, le nommage, la perte de données et si les scripts de données de référence doivent être mis à jour.

**Conflits.** Deux branches qui modifient le même `CREATE TABLE` (l'une ajoute `Phone`, l'autre `Address`) entrent en conflit dans `Tables/Customer.sql`. Tirez `main` dans la branche de fonctionnalité, gardez les deux colonnes dans une seule instruction valide, validez, puis **générez** : une fusion de texte peut encore laisser une procédure qui référence une colonne renommée dans l'autre branche. Les renommages doivent passer par la refactorisation du projet pour aller dans le `.refactorlog` ; sinon le déploiement voit une colonne supprimée plus une nouvelle, ce qui perd les données (ou est arrêté par `BlockOnPossibleDataLoss`).

```bash
git checkout feature/add-customer-phone
git pull origin main
# edit Tables/Customer.sql to keep both columns
git add Tables/Customer.sql
git commit -m "Resolve conflict: keep Phone and Address"
dotnet build SalesDb.sqlproj
```

<!-- section: testing-strategy | objectives: 2.3.1 -->
## Stratégie de test : tests unitaires et d'intégration

| Niveau | Ce qu'il prouve | Où il s'exécute |
| --- | --- | --- |
| Validation du build | La syntaxe et les références d'objets sont valides pour la cible | À chaque commit et pull request, sans base de données |
| Tests unitaires | Une procédure ou une fonction renvoie le bon résultat pour des entrées données, lève l'erreur attendue pour une entrée invalide | Sur une base de test déployée à partir du projet |
| Tests d'intégration | Scénarios en plusieurs étapes : enchaînements de procédures, déclencheurs, vues après des changements liés, application plus base | Sur un environnement de test dédié, entièrement déployé |

Les tests unitaires SQL Server (SSDT) ont des scripts de **prétest** (préparer les données), de **test** (exécuter) et de **post-test** (nettoyer), et des **conditions de test** : Row Count, Scalar Value, Expected Schema, Data Checksum, Empty ResultSet, Not Empty ResultSet, Execution Time, et **Inconclusive**, la condition par défaut ajoutée à chaque nouveau test : elle renvoie toujours Inconclusive, ne vérifie rien et doit être supprimée une fois les vraies conditions ajoutées. Un test négatif attend une erreur (`ExpectedSqlException` avec une gravité et un état) et échoue si la procédure réussit. L'option **Automatically deploy the database project before unit tests are run** garde la base de test synchronisée.

```yaml
# GitHub Actions: after build and deployment to the test database
- name: Run database tests
  run: dotnet test ./SalesDb.Tests/SalesDb.Tests.csproj
```

Règles : ne jamais tester sur la production ; remettre la base dans un état connu avant chaque exécution ; garder les chaînes de connexion dans la configuration pour que les exécutions locales et CI ciblent la bonne base ; un test en échec arrête le pipeline avant la préproduction.

> **Conseil d'examen.** « Détecter une référence cassée avant la fusion » = validation du build dans la pull request. « Vérifier le résultat de la procédure de remise » = test unitaire. « Vérifier que passer une commande met à jour ensemble le stock, la facture et les tables d'audit » = test d'intégration.

<!-- section: secrets-management | objectives: 2.3.6 -->
## Gestion des secrets

| Secret | Où il va |
| --- | --- |
| Connexion à Azure pour un workflow GitHub | **OpenID Connect** (informations d'identification fédérées sur une application Microsoft Entra ou une identité managée affectée par l'utilisateur) : `azure/login` avec les ID de client, de locataire et d'abonnement ; aucun secret client ; le job a besoin de `permissions: id-token: write` |
| Valeurs dont le workflow a besoin | **Secrets** de dépôt ou **d'environnement** (`${{ secrets.NAME }}`) ; les secrets d'environnement ne sont fournis qu'aux jobs qui ciblent cet environnement |
| Informations d'identification Azure DevOps | **Connexion de service** avec fédération d'identité de charge de travail ; groupes de variables **liés à Azure Key Vault**, ou tâche Azure Key Vault, variables secrètes |
| Authentification à la base | Identité Microsoft Entra du pipeline (`Authentication=Active Directory Default` ou un principal de service), pas un mot de passe SQL |
| Valeurs propres à l'environnement dans les scripts | Variables SQLCMD définies par le pipeline à partir des secrets |

Ne validez jamais de chaînes de connexion ni de mots de passe (dans `.sqlproj`, `.publish.xml`, les fichiers de workflow ou les scripts de post-déploiement) ; faites pivoter toute information d'identification restante.

> **Piège d'examen.** Un secret placé dans une variable GitHub ou dans un `env:` écrit dans le fichier de workflow est visible dans le dépôt. « Aucune information d'identification stockée nulle part » = fédération OIDC, et l'étape de connexion échoue sans `id-token: write`.

<!-- section: schema-drift | objectives: 2.3.7 -->
## Détecter la dérive de schéma

La **dérive** est un écart entre la base déployée et le projet, en général un correctif appliqué directement en production.

| Outil | Usage |
| --- | --- |
| Comparaison de schémas (VS Code, SSMS, Visual Studio) | Base contre projet : montre la dérive et permet de ramener des changements choisis dans le projet. Projet contre base : aperçu d'un déploiement. Les options (ignorer les espaces, l'ordre des colonnes) sont enregistrées dans un fichier `.scmp` |
| `SqlPackage /Action:Extract` avec `/p:ExtractTarget=SchemaObjectType` dans le dossier du projet | Scriptable : `git status` liste ensuite chaque objet qui a dérivé |
| `SqlPackage /Action:DeployReport` | Liste XML des opérations qu'une publication exécuterait, y compris des `Drop` ou `TableDataMotion` inattendus |
| `SqlPackage /Action:DriftReport` | Changements apportés à une base **inscrite** comme application de la couche Données depuis son inscription |

```bash
sqlpackage /Action:Extract /SourceConnectionString:"$PROD_CONN" \
  /TargetFile:SalesDb /p:ExtractTarget=SchemaObjectType
git status --porcelain          # one line per drifted object file
```

Résolvez la dérive dans un seul sens : un changement à garder (un index de correctif) entre dans le projet par une pull request ; un changement non autorisé est écrasé par le prochain déploiement du projet. Planifiez la vérification de dérive dans un pipeline et déclenchez une alerte en cas de changement.

<!-- section: update-deploy | objectives: 2.3.8 -->
## Mettre à jour un projet et déployer les modifications

Le cycle : modifier les scripts d'objets dans une branche, générer, prévisualiser, fusionner, puis publier le **même** `.dacpac` dans chaque environnement tour à tour.

```bash
sqlpackage /Action:Script /SourceFile:bin/Debug/SalesDb.dacpac \
  /TargetConnectionString:"$TEST_CONN" /OutputPath:deploy.sql
sqlpackage /Action:Publish /SourceFile:bin/Debug/SalesDb.dacpac \
  /TargetConnectionString:"$PROD_CONN" \
  /p:BlockOnPossibleDataLoss=true /p:DropObjectsNotInSource=false /v:Environment=prod
```

| Propriété de publication | Par défaut | Effet |
| --- | --- | --- |
| `BlockOnPossibleDataLoss` | True | Arrête le déploiement si un changement (suppression de colonne, type réduit) peut perdre des données |
| `DropObjectsNotInSource` | False | À true, supprime les objets de la cible absents du projet |
| `AllowIncompatiblePlatform` | False | À true, accepte une plateforme cible différente du `DSP` |

La publication est incrémentielle et idempotente : une nouvelle base est créée dans l'ordre des dépendances, une base existante ne reçoit que les changements nécessaires, et publier deux fois le même `.dacpac` ne change rien.

```yaml
name: sql-deploy
on:
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: dotnet build ./SalesDb/SalesDb.sqlproj -o ./out
      - uses: actions/upload-artifact@v4
        with: { name: dacpac, path: ./out/SalesDb.dacpac }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dacpac }
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/sql-action@v2.3
        with:
          connection-string: ${{ secrets.AZURE_SQL_CONNECTION_STRING }}
          path: ./SalesDb.dacpac
          action: publish
```

`azure/sql-action` ajoute une règle de pare-feu temporaire pour l'adresse IP de l'exécuteur et la retire après le déploiement. Dans Azure Pipelines, l'équivalent est la tâche `SqlAzureDacpacDeployment@1`, ou `sqlpackage` exécuté en script sur n'importe quel agent.

> **Piège d'examen.** Générer un nouveau `.dacpac` par environnement rompt le principe « ce qui a été testé est ce qui est déployé ». Générez une fois, publiez le même artefact partout, et exécutez `Script` ou `DeployReport` avant la production pour relire les instructions `ALTER` générées.

<!-- section: pipeline-controls | objectives: 2.3.9 -->
## Contrôles des pipelines de déploiement

| Contrôle | Azure DevOps | GitHub |
| --- | --- | --- |
| Protéger `main` | Stratégies de branche : nombre minimal de relecteurs, éléments de travail liés, résolution des commentaires, **Build Validation** | Règles de protection de branche ou ensembles de règles : relectures de pull request obligatoires, vérifications d'état obligatoires |
| Relecteurs obligatoires pour les fichiers de base de données | Relecteurs inclus automatiquement sur un chemin comme `/Database/*` | `CODEOWNERS` avec relecture obligatoire des propriétaires du code |
| Quand les pipelines s'exécutent (déclencheurs) | `trigger` (CI sur push) ; pull requests dans Azure Repos Git : stratégie de branche **Build Validation** uniquement, car un déclencheur de pull request ne se configure pas dans le fichier YAML (`pr` s'applique aux dépôts GitHub et Bitbucket Cloud) | `on: push`, `on: pull_request` |
| Approbation avant la production | **Environnement** avec approbations et vérifications (approbateurs, heures ouvrées, contrôle de branche) | Règles de protection d'**environnement** : relecteurs obligatoires, minuteur d'attente, branches de déploiement (seulement `main`) |
| Qui peut utiliser les informations d'identification de production | Sécurité de la connexion de service et vérification de **contrôle de branche** limitée à `main` | Secrets d'environnement, fournis seulement après le passage des règles de l'environnement |

```text
# .github/CODEOWNERS : later rules win
*.sql            @contoso/db-team
/Database/       @contoso/db-team @contoso/dba-lead
```

```yaml
# Azure Pipelines: the deployment job waits for the production environment's approvals
stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          - task: DotNetCoreCLI@2
            inputs:
              command: build
              projects: SalesDb/SalesDb.sqlproj
              arguments: -o $(Build.ArtifactStagingDirectory)
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: dacpac
  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProduction
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: SqlAzureDacpacDeployment@1
                  inputs:
                    azureSubscription: sc-sql-prod
                    AuthenticationType: servicePrincipal
                    ServerName: sql-contoso.database.windows.net
                    DatabaseName: SalesDb
                    DeploymentAction: Publish
                    DacpacFile: $(Pipeline.Workspace)/dacpac/SalesDb.dacpac
```

Les approbations et vérifications se configurent sur l'**environnement** (ou la connexion de service), pas dans le YAML : l'auteur d'un pipeline ne peut pas les supprimer en modifiant le fichier.

> **Piège d'examen.** Une `condition` sur la branche dans le YAML n'est pas un contrôle, car quiconque modifie le pipeline peut la changer. « Seul du code relu provenant de `main` peut atteindre la production, avec l'approbation d'un DBA » = stratégie ou protection de branche sur `main`, plus des approbations d'environnement et une restriction de branche sur l'environnement de production ou la connexion de service.

<!-- section: key-points -->
## Points clés

- Projet de style SDK = `Microsoft.Build.Sql`, `dotnet build` sur tout système d'exploitation, fichiers `.sql` inclus par défaut ; `DSP` fixe la plateforme cible ; le build valide la syntaxe et les références.
- Validez les scripts d'objets, le `.sqlproj`, les scripts de pré/post-déploiement, le `.refactorlog`, le `.scmp` ; ignorez `bin/`, `obj/`, `*.dacpac`.
- Données de référence = `MERGE` idempotent dans l'unique script de post-déploiement, découpé avec `:r`, fichiers inclus retirés du build.
- Branches de fonctionnalité, pull requests avec validation du build, nouveau build après résolution des conflits, renommages par le journal de refactorisation.
- Validation du build, tests unitaires, tests d'intégration : dans cet ordre, jamais sur la production.
- Fédération OIDC (`id-token: write`), secrets d'environnement, groupes de variables liés à Key Vault ; aucun mot de passe dans le dépôt.
- Dérive : comparaison de schémas, Extract plus `git status`, `DeployReport`, `DriftReport` pour les bases inscrites.
- Publiez un seul artefact partout ; `BlockOnPossibleDataLoss` vaut true par défaut ; stratégies de branche, propriétaires du code et approbations d'environnement protègent la production.
