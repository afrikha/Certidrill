L'analyse de sécurité se décale à gauche quand elle s'exécute sur chaque pull request et chaque pipeline, et reste utile quand ses résultats parviennent à ceux qui peuvent corriger. L'examen demande quel analyseur trouve quel problème, comment activer GitHub Advanced Security sur les deux plateformes, ce qu'apporte Microsoft Defender pour le cloud, et comment analyser les conteneurs et les dépendances open source.

<!-- section: scanning-strategy | objectives: 4.3.1 -->
## Une stratégie d'analyse de la sécurité et de la conformité

| Analyse | Trouve | GitHub | Azure DevOps |
| --- | --- | --- | --- |
| Dépendances (analyse de la composition logicielle) | Vulnérabilités connues dans les packages open source | Graphe des dépendances, alertes Dependabot, révision des dépendances | Analyse des dépendances de GHAS for Azure DevOps |
| Code (analyse statique, SAST) | Modèles vulnérables dans votre propre code : injection, traversée de chemin | Analyse du code avec CodeQL ou un outil SARIF tiers | Analyse du code de GHAS for Azure DevOps (CodeQL) |
| Secrets | Clés, jetons, chaînes de connexion dans les commits | Analyse des secrets et protection push | Analyse des secrets et protection push de GHAS for Azure DevOps |
| Licences | Dépendances dont la licence enfreint la stratégie de l'entreprise | Action de révision des dépendances (`allow-licenses` / `deny-licenses`) | Un outil de conformité des licences dans le pipeline |
| Infrastructure as code | Bicep, ARM, Terraform mal configurés | Action Microsoft Security DevOps (Checkov, Template Analyzer, Terrascan) | Tâche Microsoft Security DevOps |
| Image conteneur | Packages système et de langage vulnérables dans les images | Trivy, Defender for Cloud CLI dans le workflow | Idem dans le pipeline ; Defender pour les conteneurs dans le registre |

Où chacune s'exécute :

| Étape | Objectif | Exemple |
| --- | --- | --- |
| Push | Arrêter le secret avant qu'il n'arrive | Protection push |
| Pull request | Bloquer les nouveaux problèmes avant la fusion | Révision des dépendances, analyse du code sur la PR, annotations de PR |
| CI sur la branche principale et planifiée | Trouver les problèmes du code existant et des avis nouvellement publiés | CodeQL hebdomadaire, alertes Dependabot |
| Registre et exécution | Réévaluer les images déjà construites, prioriser ce qui s'exécute | Defender pour les conteneurs, Defender CSPM |

Règles de conception : faites échouer le build seulement sur les résultats à confiance et gravité élevées (`fail-on-severity`, `break: true`) et signalez le reste ; faites de l'analyse une **vérification d'état obligatoire** ou une stratégie de **validation de build** pour qu'elle ne puisse pas être contournée ; envoyez tout au même endroit (vue d'ensemble de la sécurité, Defender pour le cloud).

> **Piège d'examen.** L'analyse des secrets trouve les secrets déjà présents dans le dépôt, historique compris ; la protection push bloque les nouveaux au moment du push. Un secret divulgué est compromis dès qu'il est poussé : révoquez-le et remplacez-le, réécrire l'historique ne le rend pas sûr.

<!-- section: defender-devops | objectives: 4.3.2 -->
## Sécurité DevOps de Microsoft Defender pour le cloud

La sécurité DevOps connecte des organisations Azure DevOps, des organisations GitHub et des groupes GitLab à Defender pour le cloud (**Paramètres d'environnement > Ajouter un environnement**) et affiche leur inventaire, leur posture et les résultats d'analyse à côté des ressources cloud.

| Pour connecter ou utiliser | Autorisation |
| --- | --- |
| Créer le connecteur côté Azure | Contributor ou Security Admin sur l'abonnement |
| Organisation Azure DevOps | Project Collection Administrator |
| Organisation GitHub | Propriétaire de l'organisation |
| Groupe GitLab | Propriétaire du groupe |
| Lire les résultats | Security Reader (sur le connecteur ou le groupe de ressources) |
| Configurer les annotations de pull request | Contributor ou Owner sur l'abonnement |

| Fonctionnalité | CSPM de base (Foundational CSPM) | Defender CSPM |
| --- | --- | --- |
| Inventaire, recommandations sur les erreurs de configuration DevOps | Oui | Oui |
| Résultats de code, d'IaC, de secrets et de dépendances (de GHAS, MSDO ou de l'analyse du code sans agent, en préversion) | Oui | Oui |
| Annotations de pull request (Azure DevOps) | Non | Oui |
| Mappage du code au cloud, analyse des chemins d'attaque, Cloud Security Explorer, requêtes SBOM (les SBOM exigent l'analyse du code sans agent, en préversion) | Non | Oui |

**Microsoft Security DevOps (MSDO)** exécute des analyseurs open source dans le pipeline : Bandit (Python), BinSkim (binaires), Checkov, Terrascan et Template Analyzer (IaC), ESLint (JavaScript), Trivy (conteneurs, IaC). Installez l'extension (Project Collection Administrator) et ajoutez la tâche ; pour que Defender pour le cloud ingère les résultats SARIF, l'artefact doit s'appeler `CodeAnalysisLogs`.

```yaml
steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: Microsoft Security DevOps
    inputs:
      categories: 'IaC,containers'
      break: true
```

Sur GitHub, l'équivalent est l'action Microsoft Security DevOps. L'analyseur d'informations d'identification propre à MSDO est déprécié : les secrets viennent de GitHub Advanced Security. **Defender for Cloud CLI** (Defender CSPM) ajoute l'analyse d'images conteneur à n'importe quel système de CI et envoie les résultats dans Cloud Security Explorer. C'est la voie de migration depuis l'interface CLI de MSDO : son Microsoft Container Security Scanner (adossé à Gestion des vulnérabilités Microsoft Defender) remplace l'analyse d'images par Trivy dans les pipelines, et `--defender-break` renvoie un code de sortie non nul quand des problèmes critiques sont trouvés.

> **Conseil d'examen.** « Afficher les vulnérabilités du code en commentaires des pull requests Azure DevOps » exige Defender CSPM et des annotations de PR configurées ; « remonter d'une image vulnérable à son dépôt » exige le mappage du code au cloud de Defender CSPM. L'inventaire et les recommandations seuls font partie du CSPM de base.

<!-- section: advanced-security | objectives: 4.3.3 -->
## GitHub Advanced Security for GitHub et for Azure DevOps

Sur GitHub, Advanced Security est vendu sous forme de deux produits pour GitHub Team et GitHub Enterprise Cloud ; les dépôts publics bénéficient gratuitement de l'analyse du code et de l'analyse des secrets.

| GitHub Secret Protection | GitHub Code Security |
| --- | --- |
| Alertes d'analyse des secrets, protection push | Analyse du code (CodeQL ou SARIF tiers), Copilot Autofix |
| Secrets génériques comme les mots de passe détectés par IA | Révision des dépendances dans les pull requests |
| Modèles personnalisés pour les secrets propres à l'organisation | Règles de tri automatique personnalisées pour Dependabot |
| Contournement délégué de la protection push, fermeture déléguée des alertes | Campagnes de sécurité, vue d'ensemble de la sécurité |

L'analyse du code a une **configuration par défaut** (GitHub choisit les langages et s'exécute au push, à la pull request et chaque semaine) et une **configuration avancée** (un workflow que vous modifiez). Les outils tiers chargent du SARIF avec `github/codeql-action/upload-sarif`. Charger des résultats exige `security-events: write`.

```yaml
permissions:
  contents: read
  security-events: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: github/codeql-action/init@v4
        with:
          languages: csharp
          queries: security-extended
      - uses: github/codeql-action/autobuild@v4
      - uses: github/codeql-action/analyze@v4
```

**GitHub Advanced Security for Azure DevOps** suit le même découpage : **GitHub Secret Protection for Azure DevOps** et **GitHub Code Security for Azure DevOps**, facturés par committeur actif et activés par dépôt, par projet ou pour l'organisation. **Enable all** n'active que les dépôts existants ; une option distincte active automatiquement les nouveaux dépôts (au niveau du projet) ou les nouveaux projets (au niveau de l'organisation). Le gérer exige Project Collection Administrators ou **Advanced Security: manage settings** ; les Contributors voient les alertes ; les Project Administrators les ferment.

- La **protection push** bloque les secrets à confiance élevée dans les pushes depuis la ligne de commande et le web. Contournement avec `skip-secret-scanning:true` dans le message de commit ; une alerte est quand même créée. Activer Secret Protection analyse aussi tout l'historique.
- La **configuration par défaut de l'analyse du code** s'exécute chaque semaine sur les langages pris en charge (C#, C/C++, Java, JavaScript/TypeScript, Python, Ruby, Rust) ; Go et Swift exigent la **configuration avancée**, qui ajoute des tâches à un pipeline (Init, votre build, Analyze).
- L'**analyse des dépendances** s'exécute dans un pipeline, après la restauration des packages.
- Les résultats apparaissent dans **Repos > Advanced Security** et en annotations de pull request ; les vérifications d'état `AdvancedSecurity/AllHighAndCritical` et `AdvancedSecurity/NewHighAndCritical` peuvent bloquer les pull requests sur les résultats de gravité élevée et critique. Les tâches d'analyse sont des tâches de la Place de marché : **Disable Marketplace tasks** doit être désactivé.

```yaml
steps:
  - task: AdvancedSecurity-Codeql-Init@1
    inputs:
      languages: 'csharp'
      enableAutomaticCodeQLInstall: true
  - task: DotNetCoreCLI@2
    inputs:
      command: 'build'
  - task: AdvancedSecurity-Dependency-Scanning@1
  - task: AdvancedSecurity-Codeql-Analyze@1
```

`enableAutomaticCodeQLInstall` compte sur les agents auto-hébergés ; `buildtype: 'none'` analyse C#, Java et les langages interprétés sans compiler.

> **Piège d'examen.** Pour les langages compilés, CodeQL doit observer le build : Init se place avant l'étape de build, Analyze après, et les builds incrémentiels ou mis en cache cachent du code à la base de données.

<!-- section: ghas-defender | objectives: 4.3.4 -->
## Intégrer GitHub Advanced Security à Defender pour le cloud

Une fois un connecteur GitHub ou Azure DevOps créé, Defender pour le cloud ingère les résultats de GHAS (les secrets exposés et les vulnérabilités open source exigent GHAS ; les résultats de code viennent de l'analyse du code de GHAS, de MSDO ou de l'analyse du code sans agent, en préversion) et les affiche sous forme de recommandations, comme « Azure DevOps repositories should have code scanning findings resolved ».

L'**intégration de GitHub Advanced Security** va plus loin, du code à l'exécution et retour :

- Defender pour le cloud mappe les dépôts aux images conteneur et aux charges de travail qu'ils produisent (par exemple une image d'Azure Container Registry exécutée sur AKS).
- Les alertes GHAS reçoivent des **facteurs de risque d'exécution** issus de l'analyse des chemins d'attaque de Defender CSPM : exposition à Internet, données sensibles, ressources critiques, mouvement latéral.
- Dans GitHub, **Security > Campaigns > Create campaign > From code scanning filters** avec le filtre **Runtime Risks** concentre les développeurs sur le code déployé et exposé.
- Depuis une recommandation Defender, **Take action > Generate GitHub issue** ouvre une issue dans le dépôt d'origine ; l'état se synchronise dans les deux sens.

Prérequis : connecteur GitHub, licence GHAS sur les dépôts, Defender CSPM sur l'abonnement, propriétaire de l'organisation GitHub et Security Admin ; clouds commerciaux uniquement. Les étapes de déploiement vérifient aussi que l'analyse sans agent (en préversion) est activée sur le connecteur. Les résultats peuvent prendre jusqu'à 24 heures.

> **Conseil d'examen.** « Prioriser les alertes Dependabot et d'analyse du code du code qui s'exécute réellement en production et qui est exposé à Internet » correspond à l'intégration de GHAS avec Defender CSPM, pas à un simple paramètre GitHub.

<!-- section: container-scanning | objectives: 4.3.5 -->
## Analyse des conteneurs et CodeQL dans un conteneur

Analysez les images à trois moments :

| Moment | Outil | Comportement |
| --- | --- | --- |
| Build, avant le push | Trivy (catégorie `containers` de MSDO), Defender for Cloud CLI (`defender scan image`, tâche `MicrosoftDefenderCLI@2`), dont l'analyseur remplace l'analyse d'images par Trivy | Faire échouer le pipeline (`break` de MSDO, `--defender-break` de l'interface CLI sur les problèmes critiques), sortie SARIF |
| Registre | Defender pour les conteneurs (Gestion des vulnérabilités Microsoft Defender) | Images nouvelles ou importées analysées en quelques heures ; nouvelle analyse quotidienne des images poussées ou tirées dans les 30 derniers jours |
| Exécution | Defender pour les conteneurs avec l'accès à l'API Kubernetes ou le capteur Defender | Images en cours d'exécution évaluées même si elles ont été construites il y a longtemps |

```yaml
- task: MicrosoftDefenderCLI@2
  inputs:
    command: 'run'
    scanType: 'image'
    imageName: $(ImageName)
    break: true
```

**CodeQL dans un conteneur.** Quand le build ne fonctionne que dans une image conteneur (chaîne d'outils personnalisée), exécutez tout le job dans ce conteneur pour que CodeQL voie le build. Exigences : Git installé et dans le `PATH`, une image basée sur glibc (l'interface CLI CodeQL ne prend pas en charge Alpine, basée sur musl), et toutes les étapes dans le même conteneur.

```yaml
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
    container:
      image: ghcr.io/contoso/build-tools:2.4
    steps:
      - uses: actions/checkout@v6
      - uses: github/codeql-action/init@v4
        with:
          languages: java-kotlin
      - run: ./gradlew build --no-daemon
      - uses: github/codeql-action/analyze@v4
```

> **Piège d'examen.** CodeQL exécuté sur l'hôte de l'exécuteur pendant que le build tourne dans une étape `docker run` ne voit rien à analyser. La clé `container:` au niveau du job, avec les étapes CodeQL dans ce même job, est la solution.

<!-- section: dependabot | objectives: 4.3.6 -->
## Alertes Dependabot pour les composants open source

| Fonctionnalité | Rôle | Configurée dans |
| --- | --- | --- |
| Graphe des dépendances | Liste les manifestes et fichiers de verrouillage du dépôt | Paramètres du dépôt (activé par défaut pour les dépôts publics) |
| Alertes Dependabot | Alertes sur les dépendances concernées par des avis révisés par GitHub | Settings > Advanced Security, ou configurations de sécurité de l'organisation |
| Mises à jour de sécurité Dependabot | Ouvre une pull request qui passe à la version corrigée minimale | Mêmes paramètres ; exige les alertes |
| Mises à jour de version Dependabot | Pull requests pour rester à jour, vulnérable ou non | `.github/dependabot.yml` |
| Règles de tri automatique | Fermer, mettre en attente ou déclencher les mises à jour de sécurité pour les alertes correspondantes | Règles du dépôt ou de l'organisation |

Les alertes sont levées sur la **branche par défaut** quand un nouvel avis entre dans la GitHub Advisory Database ou quand le graphe des dépendances change. À la première activation, les dépendances vulnérables existantes reçoivent des alertes mais aucune notification. Les notifications vont aux utilisateurs Write, Maintain ou Admin qui suivent le dépôt. Les administrateurs du dépôt et les propriétaires de l'organisation les activent. Les actions épinglées sur un SHA de commit ne reçoivent pas d'alertes Dependabot.

```yaml
version: 2
updates:
  - package-ecosystem: "nuget"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: "development"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Bloquez les nouvelles dépendances vulnérables dès la revue avec l'action de révision des dépendances :

```yaml
- uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: high
    deny-licenses: GPL-3.0, AGPL-3.0
```

| Exigence | Réponse |
| --- | --- |
| Être averti quand un package déjà dans `main` reçoit une nouvelle CVE | Alertes Dependabot |
| Obtenir automatiquement une pull request de correction pour cette CVE | Mises à jour de sécurité Dependabot |
| Garder NuGet et les actions à jour chaque semaine | Mises à jour de version dans `dependabot.yml` |
| Arrêter une pull request qui ajoute un package vulnérable ou sous GPL | Action de révision des dépendances en vérification obligatoire |
| Ignorer automatiquement les alertes sur les dépendances de développement | Règle de tri automatique |
| Les mêmes alertes dans Azure Repos | Analyse des dépendances de GHAS for Azure DevOps |

> **Piège d'examen.** `dependabot.yml` configure les mises à jour de version et n'active pas les mises à jour de sécurité : elles s'activent dans les paramètres. Les workflows déclenchés par Dependabot ne reçoivent pas les secrets Actions du dépôt.

<!-- section: key-points -->
## Points clés

- Couvrez dépendances, code, secrets, licences, IaC et images ; bloquez au push et à la pull request, réanalysez de façon planifiée, centralisez les résultats.
- Sécurité DevOps de Defender pour le cloud : connecteurs Azure DevOps, GitHub et GitLab ; annotations de PR et mappage du code au cloud exigent Defender CSPM ; artefact MSDO `CodeAnalysisLogs`.
- GHAS sur les deux plateformes = Secret Protection + Code Security ; contourner la protection push laisse une alerte ; Init de CodeQL avant le build, Analyze après.
- GHAS + Defender pour le cloud ajoute le risque d'exécution aux alertes et campagnes GitHub.
- Analysez les images au build, dans le registre et à l'exécution ; exécutez CodeQL dans le conteneur de build avec `container:`.
- Dependabot : alertes (avis), mises à jour de sécurité (PR de correction), mises à jour de version (`dependabot.yml`), règles de tri automatique.
