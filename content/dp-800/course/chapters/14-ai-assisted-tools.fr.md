Les outils assistés par IA écrivent, expliquent et exécutent du T-SQL pour vous : GitHub Copilot dans SQL Server Management Studio (SSMS) et dans Visual Studio Code avec l'extension MSSQL, Copilot dans Microsoft Fabric, et les serveurs Model Context Protocol (MCP) qui donnent à un agent un accès direct à une base de données. Les questions d'examen demandent quelles données quittent votre environnement, comment activer chaque outil, quel mode de conversation et quel fichier répondent à une exigence, et quel point de terminaison MCP connecte un agent à SQL Server, Azure SQL ou un lakehouse Fabric avec le moindre privilège.

<!-- section: security-impact | objectives: 1.4.1 -->
## Impact de sécurité des outils assistés par IA

Chaque prompt est envoyé à un modèle hébergé dans le cloud, avec le contexte que l'outil y ajoute :

| Outil | Contexte envoyé avec le prompt |
| --- | --- |
| GitHub Copilot (VS Code, Visual Studio, SSMS) | Le code en cours d'édition, le contenu des fichiers ouverts, votre prompt, et des informations de schéma quand l'éditeur est connecté à une base. SSMS peut ajouter la version de SQL Server et des informations sur la base |
| Copilot dans Fabric | Les métadonnées des éléments de l'espace de travail : lakehouses, entrepôts, modèles sémantiques |
| Copilot pour la base de données SQL dans Fabric | Le **schéma** de la base, pas les données |

Ce que Microsoft indique sur ces données : les prompts et les réponses ne servent pas à entraîner les modèles, les données sont chiffrées en transit et au repos, et GitHub Copilot dans SSMS ne conserve ni les prompts, ni les réponses, ni les métadonnées système.

Les outils agissent **avec votre identité**. Dans SSMS, une requête écrite par Copilot s'exécute avec les autorisations de votre connexion : sans `SELECT` sur `Sales.Orders`, Copilot ne peut pas la lire non plus. Un serveur MCP agit avec l'identité qu'il utilise pour se connecter : c'est cette identité qui constitue la vraie limite de sécurité.

| Risque | Contrôle |
| --- | --- |
| Données réglementées (PII, financières, de santé) ou schémas relevant du secret industriel envoyés à un modèle cloud | Classifier d'abord les données ; limiter l'attribution des licences Copilot ou l'accès à Copilot dans Fabric (groupes de sécurité) en cohérence avec l'accès aux bases |
| Informations d'identification collées dans des prompts ou stockées dans des fichiers lus par l'assistant | Variables d'environnement, invites de saisie VS Code (`"password": true`), Azure Key Vault ; jamais de mot de passe dans `mcp.json` ni dans un fichier d'instructions |
| Instructions `GRANT` générées plus larges que nécessaire | Relire chaque instruction d'autorisation au regard du moindre privilège |
| SQL dynamique généré exposé à l'injection | Exiger `sp_executesql` avec des paramètres, jamais de concaténation de saisie utilisateur |
| Un agent capable de modifier des données | Identité dédiée en lecture seule pour le serveur MCP, base de développement ou de test plutôt que production, approbation de chaque appel d'outil |
| Trafic MCP sur l'internet public | Règles de pare-feu, points de terminaison privés ou VPN pour les environnements sensibles |

Les expériences agent demandent avant d'agir : dans l'extension MSSQL, le mode Agent exige une approbation pour chaque appel d'outil ; dans SSMS et VS Code, les opérations d'écriture du mode Agent ne sont jamais effectuées sans votre approbation explicite.

Résidence des données dans Fabric : si la capacité est hors des États-Unis ou de la France, Copilot pour la base de données SQL reste désactivé tant qu'un administrateur n'active pas **Data sent to Azure OpenAI can be processed outside your capacity's geographic region, compliance boundary, or national cloud instance**. Quand un agent de données Fabric est consommé depuis un service extérieur à Fabric, y compris comme serveur MCP, les réponses peuvent sortir de la limite de conformité de Fabric et relever des conditions de traitement de ce service.

Gouvernance de GitHub Copilot : une stratégie du tableau de bord d'administration GitHub Copilot active ou désactive le mode Agent et MCP dans SSMS, une **liste d'autorisation de serveurs MCP** limite les serveurs que les utilisateurs peuvent ajouter, et GitHub Enterprise Cloud enregistre l'usage de Copilot dans les journaux d'audit.

> **Piège d'examen.** Le code généré par IA est un premier jet. Le filtrage du contenu réduit les modèles de code dangereux mais ne remplace pas la relecture : la bonne réponse à « garantir que le T-SQL généré respecte les normes de sécurité » est une relecture humaine (plus des tests), pas « faire confiance aux filtres de Copilot » ni « ajouter un fichier d'instructions ».

<!-- section: enable-copilot | objectives: 1.4.2 -->
## Activer GitHub Copilot et Copilot dans Fabric

**GitHub Copilot** exige un compte GitHub avec un accès à Copilot (un abonnement payant ou Copilot Free) et un éditeur pris en charge.

| Environnement | Activation |
| --- | --- |
| SSMS 22 | Visual Studio Installer > SSMS > **Modify** > onglet Workloads > **AI Assistance** > Modify. Puis sélectionnez le badge GitHub Copilot (en haut à droite) > **Open Chat Window to Sign In** et connectez-vous avec le compte qui dispose de l'accès Copilot |
| Visual Studio Code | Installez les extensions **GitHub Copilot** et **GitHub Copilot Chat** et connectez-vous à GitHub, installez **SQL Server (mssql)**, connectez-vous depuis la vue **Connections**, puis clic droit sur la base > **Chat with this database** |

Fonctionnalités de SSMS par version : conversation et conversation inline ; saisie semi-automatique à partir de SSMS 22.2 ; mode Agent et serveurs MCP à partir de SSMS 22.7.

Dans VS Code, la première conversation sur une base vous demande d'accorder à l'extension MSSQL l'accès aux modèles de langage de GitHub Copilot Chat. Le participant de conversation `@mssql` **connaît le schéma** grâce à la base connectée ; les complétions inline (texte fantôme dans les fichiers `.sql`) **ne le connaissent pas**. Les commandes slash comme `@mssql /connect` et `@mssql /changeDatabase` connectent et changent de base.

**Copilot dans Fabric** est contrôlé par un administrateur Fabric dans le portail d'administration > **Tenant settings** > **Copilot and Azure OpenAI Service** :

| Paramètre | Rôle |
| --- | --- |
| Users can use Copilot and other features powered by Azure OpenAI | Le commutateur principal, pour l'organisation ou des groupes de sécurité précis |
| Data sent to Azure OpenAI can be processed outside your capacity's geographic region, compliance boundary, or national cloud instance | Nécessaire quand la capacité est hors des régions où Fabric traite les requêtes Copilot (pour Copilot dans la base de données SQL : hors des États-Unis et de la France) |
| Capacities can be designated as Fabric Copilot capacities | Permet aux administrateurs de capacité de désigner une capacité Fabric Copilot |
| Users can use Copilot, AI Agents, and other AI experiences powered by OpenAI as a Microsoft subprocessor | Autorise les fonctionnalités qui utilisent OpenAI comme sous-traitant de Microsoft |

Prérequis et règles :

- Une capacité payante **F2 ou supérieure**, ou Power BI Premium **P1 ou supérieure**, dans une région prise en charge. Les SKU d'essai ne sont pas pris en charge pour Copilot dans la base de données SQL. Les espaces de travail Pro et Premium par utilisateur ont besoin d'une **capacité Fabric Copilot**.
- Copilot est activé par défaut pour les locataires qui ont des capacités payantes ; Microsoft recommande de le limiter d'abord à des groupes de sécurité.
- Si les paramètres sont **délégués aux administrateurs de capacité**, chaque administrateur de capacité les active sur sa capacité.
- Copilot pour la base de données SQL n'est pas disponible quand Private Link est activé et l'accès public désactivé.

Copilot dans l'éditeur de requêtes SQL de Fabric propose un **volet de conversation** (langage naturel vers T-SQL ; il ne peut pas modifier les requêtes déjà présentes dans l'éditeur), la **complétion de code** (Tab accepte) et les actions rapides **Fix** et **Explain** sur une requête sélectionnée. Il n'exécute pas de requêtes de lui-même.

> **Piège d'examen.** Un utilisateur qui a un rôle dans l'espace de travail n'a toujours pas Copilot si le commutateur du locataire est désactivé, si l'espace de travail est sur une capacité d'essai ou Pro, ou si les paramètres sont délégués et que l'administrateur de capacité ne les a pas activés. Une licence GitHub Copilot n'active pas Copilot dans Fabric : ce sont deux produits distincts.

<!-- section: models-mcp-tools | objectives: 1.4.3 -->
## Modèles, modes de conversation et outils MCP dans une session

**Modèle.** Dans SSMS et VS Code, un sélecteur de modèle en haut de la fenêtre Copilot Chat choisit le modèle de la session (familles GPT, Claude et Gemini, selon votre abonnement). Prenez un modèle plus puissant pour l'optimisation et la conception, un modèle plus rapide pour les complétions courantes.

**Mode.** Le mode détermine ce que Copilot peut faire :

| Mode | Ce qu'il fait | Outils MCP |
| --- | --- | --- |
| Ask | Répond et génère du code dans la conversation ; `@mssql` dans VS Code exécute par défaut des requêtes en lecture seule | Non |
| Edit | Applique des modifications sur plusieurs fichiers de l'espace de travail | Non |
| Agent | Planifie et exécute un travail en plusieurs étapes avec des outils : se connecter, lister les bases, exécuter des requêtes, lire des plans d'exécution, modifier le schéma, avec approbation | **Oui** |
| Plan (extension MSSQL) | Conçoit un modèle de données à partir d'un document d'exigences avant toute instruction DDL | Par le contexte `@mssql` |

**Outils.** En mode Agent, l'icône **Tools** de la conversation liste chaque serveur MCP et ses outils, avec un état (vert quand il est sain). N'activez que les outils nécessaires à la tâche pour cette session. Dans SSMS, les outils d'un serveur MCP nouvellement ajouté sont **désactivés par défaut** : activez chaque outil dans la liste Tools avant que Copilot puisse l'utiliser.

Ajouter un serveur :

| Client | Méthode |
| --- | --- |
| VS Code | Palette de commandes > **MCP: Add Server** > HTTP ou Stdio, ou un fichier d'espace de travail `.vscode/mcp.json` que VS Code détecte et propose de démarrer |
| SSMS 22.7+ | Icône Tools > **+** vert > **Add custom MCP server** (Server ID, Type HTTP ou stdio) ou **Add from MCP registry**, ou le fichier utilisateur `%USERPROFILE%\.mcp.json` |

```json
{
  "servers": {
    "sales-sql": {
      "type": "http",
      "url": "https://dab-sales.azurewebsites.net/mcp",
      "headers": {
        "Authorization": "Bearer ${input:sql_token}"
      }
    }
  },
  "inputs": [
    {
      "id": "sql_token",
      "type": "promptString",
      "description": "Access token for the Sales MCP endpoint",
      "password": true
    }
  ]
}
```

L'entrée `inputs` demande le jeton au démarrage et le garde hors du fichier, qui peut alors être validé dans le dépôt et partagé avec l'équipe.

**Copilot dans Fabric** travaille automatiquement sur les ressources de l'espace de travail. Pour utiliser des données Fabric depuis un autre client de conversation, publiez un **agent de données Fabric** et copiez son URL de serveur MCP (voir la dernière section). Les fournisseurs d'IA que Fabric peut appeler sont décidés par les paramètres du locataire ci-dessus, pas par l'utilisateur dans la conversation.

> **Piège d'examen.** « Copilot ne voit pas les outils du serveur MCP » signifie en général que la conversation est en mode Ask ou Edit, ou que l'outil est désactivé dans la liste Tools. Passez en mode **Agent** et activez l'outil ; réinstaller l'extension ou changer de modèle n'y change rien.

<!-- section: instruction-files | objectives: 1.4.4 -->
## Fichiers d'instructions GitHub Copilot

Les fichiers d'instructions envoient les normes de l'équipe avec chaque requête de conversation.

| Fichier | Emplacement | S'applique à |
| --- | --- | --- |
| Instructions du dépôt | `.github/copilot-instructions.md` à la racine du dépôt | Chaque requête de conversation dans le dépôt ; aucun en-tête (frontmatter) nécessaire |
| Instructions ciblées | `.github/instructions/<name>.instructions.md` | Les fichiers qui correspondent au glob `applyTo` de l'en-tête |
| `AGENTS.md` | Racine du dépôt | Alternative multi-agents à `copilot-instructions.md` |
| Fichiers de prompt | `.github/prompts/<name>.prompt.md` | Rien d'automatique : un prompt réutilisable que vous choisissez dans la conversation |
| Instructions d'utilisateur et d'organisation | Profil utilisateur, paramètres de l'organisation | Préférences personnelles ; normes gérées de façon centralisée |

Un fichier de dépôt pour un projet de base de données :

```text
# Database development standards

- Target: Azure SQL Database. Always use schema-qualified names (dbo.Customer).
- Tables singular PascalCase; procedures usp_ActionEntity; views vw_EntityName.
- Explicit column lists, never SELECT *.
- Every procedure: SET NOCOUNT ON, TRY...CATCH, explicit transaction for writes.
- Never GRANT to public. Never concatenate user input: use sp_executesql with parameters.
- Use EXISTS rather than COUNT(*) for existence checks.
```

Un fichier ciblé qui ne s'applique qu'aux fichiers T-SQL :

```text
---
applyTo: '**/*.sql'
---
Use THROW, not RAISERROR, in new code.
Name indexes IX_TableName_ColumnName.
```

Règles à retenir :

- Les modèles `applyTo` sont relatifs à la racine de l'espace de travail, pas à `.github/instructions` : `tests/**/*.sql` correspond à `tests/unit/a.sql` mais pas à `src/a.sql`.
- Les instructions ne s'appliquent pas aux **suggestions inline** pendant la frappe ; elles s'appliquent à la conversation.
- Les instructions guident le modèle ; elles ne garantissent pas leur respect et ne remplacent ni les tests, ni la revue de code, ni les contrôles de sécurité.

> **Conseil d'examen.** « Tous les développeurs doivent recevoir automatiquement les mêmes conventions T-SQL » = `.github/copilot-instructions.md` validé dans le dépôt. « Seulement pour les fichiers `.sql` » = un fichier `.instructions.md` avec `applyTo`. « Une tâche réutilisable que le développeur lance à la demande » = un fichier `.prompt.md`.

<!-- section: mcp-endpoints | objectives: 1.4.5 -->
## Se connecter à des points de terminaison de serveur MCP

| Exigence | Point de terminaison |
| --- | --- |
| Accès d'un agent aux tables, vues et procédures de SQL Server ou Azure SQL, avec des autorisations par rôle | **SQL MCP Server** (générateur d'API de données) |
| Converser sur une base à laquelle vous êtes connecté dans VS Code, sans serveur à exécuter | Extension MSSQL, **Chat with this database** |
| Azure SQL et d'autres ressources Azure depuis le mode Agent | Extension **Azure MCP Server**, connectée avec votre compte Azure |
| Données d'un lakehouse, d'un entrepôt ou d'un modèle sémantique dans Fabric | Un **agent de données Fabric** publié, utilisé comme serveur MCP |

**SQL MCP Server** est le serveur MCP open source de Microsoft intégré au générateur d'API de données (Data API builder, DAB) 1.7 et versions ultérieures (2.0 recommandée). Il expose les mêmes entités, rôles et autorisations que les points de terminaison REST et GraphQL de DAB, en **HTTP diffusable (streamable HTTP)** (par exemple `http://localhost:5000/mcp`) ou en **stdio**.

```bash
dab init --database-type mssql --connection-string "@env('SQL_CONNECTION_STRING')" --host-mode development
dab add Product --source dbo.Product --source.type table --permissions "anonymous:read" --description "Products sold online"
dab start                               # HTTP endpoint .../mcp
dab start --mcp-stdio role:reader       # stdio transport, as the role reader
```

Ses outils sont générés à partir de la configuration : `describe_entities`, `create_record`, `read_records`, `update_record`, `delete_record`, `execute_entity` et `aggregate_records`. Une entité de procédure stockée peut être publiée comme outil personnalisé nommé (`"mcp": { "custom-tool": true }`, DAB 2.0 et versions ultérieures), et une entité peut être masquée pour MCP :

```json
{
  "entities": {
    "Payroll": {
      "source": "dbo.Payroll",
      "mcp": { "dml-tools": false },
      "permissions": [ { "role": "hr", "actions": [ "read" ] } ]
    }
  }
}
```

Choix de conception à connaître : l'agent n'interroge jamais directement la base, seulement par les entités DAB (qui peuvent renommer des objets et masquer des colonnes) ; SQL MCP Server ne fait volontairement pas de NL2SQL (DAB construit un T-SQL déterministe) et n'exécute pas de DDL ; les résultats de `read_records` sont mis en cache. En mode stdio, le rôle par défaut est `anonymous`.

**Lakehouse Fabric.** Créez un agent de données dans l'espace de travail, donnez-lui le lakehouse ou l'entrepôt comme source, **publiez-le**, puis ouvrez ses **Settings** > onglet **Model Context Protocol** et copiez l'**URL du serveur MCP**. Ajoutez-la comme serveur HTTP dans `.vscode/mcp.json` ; VS Code propose **Add Server** et vous vous connectez avec votre compte Microsoft. L'extension **Microsoft Fabric MCP Server** pour VS Code simplifie cette configuration.

Les points de terminaison **Azure SQL** exigent aussi l'accès réseau : l'adresse IP du client autorisée dans le pare-feu du serveur, ou un chemin réseau vers le point de terminaison privé.

| Authentification auprès du point de terminaison MCP | À utiliser pour |
| --- | --- |
| Connexion interactive dans le navigateur | Développement |
| Principal de service (application Microsoft Entra) | Environnements automatisés ou partagés |
| Clé API, quand le serveur la prend en charge | Stockée dans une variable d'environnement ou une invite de saisie, jamais dans le fichier |

Testez la connexion en mode Agent : le serveur apparaît en vert sous l'icône Tools, et « What tables are available in the database? » renvoie votre schéma réel.

> **Piège d'examen.** Utilisez des points de terminaison MCP distincts pour le développement, le test et la production, et donnez à chacun l'identité la plus restreinte : lecture seule, ou schéma seul quand l'agent n'a besoin que des métadonnées. Connecter un agent à la production avec une identité `db_owner` n'est jamais la réponse du moindre privilège.

<!-- section: key-points -->
## Points clés

- Les prompts transportent le code, les fichiers ouverts et le schéma vers un modèle cloud ; ils ne servent pas à l'entraînement. Copilot agit avec vos autorisations, un serveur MCP avec sa propre identité.
- SSMS 22 : charge de travail AI Assistance ; mode Agent et MCP à partir de 22.7. VS Code : extensions GitHub Copilot, GitHub Copilot Chat et mssql ; `@mssql` connaît le schéma, les complétions inline non.
- Copilot dans Fabric : paramètre de locataire « Users can use Copilot and other features powered by Azure OpenAI », F2 ou P1 et plus (pas d'essai), paramètre de traitement hors zone géographique en dehors des régions de traitement.
- Les outils MCP ne fonctionnent qu'en mode **Agent** et doivent être activés dans la liste Tools.
- `.github/copilot-instructions.md` pour tout le dépôt, `.instructions.md` avec `applyTo` pour des modèles de fichiers, `.prompt.md` pour des prompts réutilisables ; aucun ne s'applique aux suggestions inline.
- SQL MCP Server = générateur d'API de données, sept outils DML, même RBAC que REST et GraphQL, pas de NL2SQL, pas de DDL. Lakehouse Fabric = agent de données publié, URL du serveur MCP dans ses paramètres.
