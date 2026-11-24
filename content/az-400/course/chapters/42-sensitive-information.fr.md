L'automatisation a besoin de mots de passe, de clés, de certificats et de fichiers de signature, et chaque copie dans du YAML, un journal ou le disque d'un agent est une fuite en puissance. L'examen demande où stocker chaque type de secret, comment un pipeline l'obtient sans stocker d'information d'identification, et quel paramètre l'empêche de fuiter.

<!-- section: key-vault | objectives: 4.2.1 -->
## Secrets, clés et certificats dans Azure Key Vault

| Objet | Contient | Usage DevOps typique |
| --- | --- | --- |
| Secret | Toute valeur jusqu'à 25 Ko : mot de passe, chaîne de connexion, clé d'API | Variables de pipeline, paramètres d'application via des références Key Vault |
| Clé | Clé RSA ou EC ; protégée par logiciel (Standard) ou par HSM (Premium) | Chiffrement avec des clés gérées par le client, signature |
| Certificat | Certificat X.509 avec sa clé et sa stratégie ; la partie privée se lit comme un secret | TLS pour App Service ou Application Gateway, signature de code |

**Modèle d'accès.** L'accès au plan de données utilise Azure RBAC ou les stratégies d'accès héritées. Depuis la version d'API 2026-02-01, Azure RBAC est le modèle par défaut des nouveaux coffres. Modèle recommandé : un coffre par application et par environnement, rôles attribués à l'étendue du coffre (les attributions sur des secrets individuels sont déconseillées).

| Rôle | Permet |
| --- | --- |
| Key Vault Secrets User | Lire le contenu des secrets : le rôle de l'identité d'un pipeline ou d'une application |
| Key Vault Secrets Officer | Toute action sur les secrets sauf les autorisations |
| Key Vault Certificate User / Certificates Officer | Lire des certificats complets / gérer les certificats |
| Key Vault Crypto User / Crypto Officer | Utiliser les clés pour des opérations de chiffrement / gérer les clés |
| Key Vault Reader | Métadonnées uniquement, jamais les valeurs des secrets |
| Key Vault Administrator | Toutes les opérations du plan de données ; pas d'attribution de rôles |
| Key Vault Contributor | Plan de contrôle uniquement (la ressource coffre), aucun accès aux données |

> **Piège d'examen.** Key Vault Contributor ne lit pas les secrets, mais sur un coffre qui utilise les stratégies d'accès il peut s'accorder l'accès en modifiant les stratégies. Avec le modèle RBAC, l'accès aux données exige un rôle de données comme Key Vault Secrets User.

**Protection.** La suppression réversible est toujours active : les coffres et objets supprimés restent récupérables de 7 à 90 jours (90 par défaut), durée fixée à la création et non modifiable. La **protection contre le vidage** (facultative, impossible à désactiver une fois activée) empêche quiconque de vider avant la fin de la rétention. Le nom d'un coffre supprimé de manière réversible ne peut pas être réutilisé avant son vidage ou son expiration. Vider exige le rôle Key Vault Purge Operator (ou le propriétaire de l'abonnement pour un coffre).

**Rotation.** Donnez une date d'expiration aux secrets et faites-les tourner : Key Vault publie des événements d'expiration proche et d'expiration dans Event Grid (déclenchez une fonction Azure qui effectue la rotation), les clés prennent en charge une stratégie de rotation automatique et les certificats d'une autorité de certification intégrée se renouvellent automatiquement. Les applications lisent la dernière version par son nom : la rotation n'exige pas de redéploiement.

**Réseau.** Si le pare-feu du coffre bloque l'accès public, un agent hébergé par Microsoft ou un exécuteur hébergé par GitHub ne peut pas l'atteindre (les agents hébergés par Microsoft ne font pas partie des services approuvés de Key Vault) : utilisez un agent ou un exécuteur auto-hébergé dans un réseau autorisé par un point de terminaison privé ou par le pare-feu. Un groupe de variables lié au coffre est interrogé depuis les adresses IP publiques d'Azure DevOps : le pare-feu doit donc aussi autoriser les plages d'adresses IP d'Azure DevOps de la zone géographique de l'organisation. Pour ne pas ouvrir le coffre à Azure DevOps, lisez les secrets avec AzureKeyVault@2 sur un agent auto-hébergé dont le réseau virtuel est autorisé.

Dans Azure Pipelines, deux façons de lire les secrets :

```yaml
variables:
  - group: vg-contoso-prod-kv   # variable group linked to a key vault

steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: 'sc-contoso-prod-wif'
      KeyVaultName: 'kv-contoso-prod'
      SecretsFilter: 'SqlPassword,ApiKey'
      RunAsPreJob: false
  - script: ./deploy.sh
    env:
      SQL_PASSWORD: $(SqlPassword)
```

| | Groupe de variables lié à Key Vault | Tâche AzureKeyVault@2 |
| --- | --- | --- |
| Configuré dans | Pipelines > Bibliothèque, partagé par de nombreux pipelines | Le YAML du pipeline |
| Liste des secrets | Noms de secrets choisis ; les nouveaux secrets du coffre doivent être ajoutés au groupe | `SecretsFilter` (`*` pour tous) |
| Valeurs | Récupérées à l'exécution, toujours les plus récentes | Récupérées quand la tâche s'exécute |
| Prend en charge | Secrets uniquement (pas les clés ni les certificats) | Secrets |

Les deux exigent une connexion de service Azure Resource Manager dont l'identité a **Get** et **List** sur les secrets (stratégies d'accès) ou **Key Vault Secrets User** (RBAC).

<!-- section: secretless | objectives: 4.2.2 -->
## Secrets et authentification sans secret dans GitHub Actions et Azure Pipelines

Les **secrets GitHub Actions** existent à trois niveaux :

| Niveau | Limite | Remarque |
| --- | --- | --- |
| Organisation | 1 000 | Créés par les propriétaires de l'organisation ; stratégie d'accès : tous les dépôts, les dépôts privés ou des dépôts choisis |
| Dépôt | 100 | Disponibles pour tous les workflows du dépôt |
| Environnement | 100 | Lisibles seulement par les jobs qui référencent l'environnement, une fois ses règles de protection (relecteurs obligatoires, minuteur d'attente, branches) satisfaites |

Un secret fait au maximum 48 Ko ; les noms utilisent des lettres, des chiffres et `_`, et ne commencent ni par un chiffre ni par `GITHUB_`. Quand le même nom existe à plusieurs niveaux, le niveau le plus bas l'emporte (environnement, puis dépôt, puis organisation). Les secrets ne peuvent pas être référencés directement dans `if:` : définissez le secret comme variable d'environnement au niveau du job et testez cette variable dans la condition. Les secrets ne sont pas transmis aux workflows déclenchés par Dependabot ou depuis des forks (sauf GITHUB_TOKEN), ni automatiquement aux workflows réutilisables : le workflow appelant transmet explicitement les seuls secrets dont le workflow réutilisable a besoin.

```bash
gh secret set SQL_PASSWORD --env production
gh secret set NPM_TOKEN --org contoso --repos api,web
```

**Authentification sans secret avec OpenID Connect.** Le workflow demande un jeton OIDC à GitHub et l'échange auprès de Microsoft Entra ID grâce à une information d'identification fédérée sur une inscription d'application ou une identité managée attribuée par l'utilisateur. Les ID de client, de locataire et d'abonnement ne sont pas des secrets, mais les stocker en secrets les garde hors des journaux.

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: az webapp list --resource-group rg-web --output table
```

Le sujet de l'information d'identification fédérée doit correspondre exactement au job (pas de caractères génériques pour les branches et les étiquettes) :

| Job | Sujet |
| --- | --- |
| Référence l'environnement `production` | `repo:contoso/web:environment:production` |
| S'exécute sur la branche `main`, sans environnement | `repo:contoso/web:ref:refs/heads/main` |
| S'exécute sur l'étiquette `v1.0` | `repo:contoso/web:ref:refs/tags/v1.0` |
| Déclenché par `pull_request` | `repo:contoso/web:pull_request` |

Émetteur `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`. Une non-correspondance fait échouer l'échange de jeton sans message d'erreur utile.

> **Piège d'examen.** Un job qui déclare `environment: production` présente le sujet d'environnement, pas celui de la branche. Si l'information d'identification a été créée pour `ref:refs/heads/main`, la connexion échoue même sur `main`.

**Azure Pipelines** offre trois emplacements pour les secrets : les variables secrètes dans les paramètres du pipeline (limitées à ce pipeline), les groupes de variables de la Bibliothèque (partagés, avec la sécurité de la Bibliothèque et les autorisations de pipeline) et les groupes de variables liés à Key Vault. Les variables secrètes sont chiffrées au repos, masquées dans les journaux et **ne sont pas** déchiffrées dans des variables d'environnement : mappez-les avec `env:`. Pour Azure, utilisez une connexion de service Azure Resource Manager avec **fédération d'identité de charge de travail** : aucun secret à faire tourner. `AzureCLI@2` avec `addSpnToEnvironment: true` expose au script `servicePrincipalId`, `tenantId` et soit `servicePrincipalKey`, soit, avec la fédération d'identité de charge de travail, le jeton de fédération `idToken`, sans les stocker.

| Exigence | Réponse |
| --- | --- |
| Un workflow GitHub déploie dans Azure, sans information d'identification stockée | OIDC : `id-token: write`, information d'identification fédérée, `azure/login` |
| Azure Pipelines déploie dans Azure, sans secret à faire tourner | Connexion de service avec fédération d'identité de charge de travail |
| Secret de production lisible seulement après une approbation (GitHub) | Secret d'environnement avec relecteurs obligatoires |
| Même clé d'API tierce dans 40 dépôts | Secret d'organisation avec des dépôts choisis |
| Secret partagé par dix pipelines Azure et renouvelé dans Key Vault | Groupe de variables lié à Key Vault |

<!-- section: secure-files | objectives: 4.2.3 -->
## Fichiers sensibles pendant le déploiement : fichiers sécurisés

Un certificat de signature, un profil de provisionnement Apple, un magasin de clés Android, une clé SSH ou un fichier de licence ne doivent jamais être commités. Dans Azure Pipelines, chargez-les dans **Pipelines > Bibliothèque > Fichiers sécurisés** :

- chiffrés au repos sur le serveur, **10 Mo** au maximum par fichier ;
- utilisables uniquement depuis une tâche de pipeline ;
- les pipelines YAML doivent être **autorisés** sur le fichier (Autorisations de pipeline, ou Accès ouvert pour tous les pipelines) ; des approbations et vérifications peuvent être ajoutées ;
- rôles de la Bibliothèque : Reader, User (utiliser dans les pipelines), Creator, Administrator (celui qui a chargé le fichier).

```yaml
steps:
  - task: DownloadSecureFile@1
    name: signingCert
    inputs:
      secureFile: 'contoso-codesign.pfx'
  - script: ./sign.sh "$(signingCert.secureFilePath)"
    env:
      CERT_PASSWORD: $(CertPassword)
```

Le fichier est téléchargé dans `$(Agent.TempDirectory)`, son chemin est dans la variable de sortie `secureFilePath`, et il est supprimé à la fin du job, qu'il réussisse, échoue ou soit annulé. Gardez son mot de passe dans une variable secrète ou dans Key Vault, pas à côté de lui.

| Besoin | Réponse |
| --- | --- |
| Certificat ou magasin de clés utilisé par une tâche de build | Fichier sécurisé + DownloadSecureFile@1 |
| Certificat TLS utilisé par un service Azure | Certificat Key Vault, référencé par le service |
| Petit binaire dans GitHub Actions | Secret encodé en Base64 (limite de 48 Ko), décodé sur l'exécuteur |
| Fichier de plus de 48 Ko dans GitHub Actions | Chiffrer avec `gpg`, commiter le fichier chiffré, stocker la phrase secrète en secret |

> **Piège d'examen.** Un fichier sécurisé n'est pas une variable : le citer par son nom dans un script ne fait rien tant que DownloadSecureFile@1 n'a pas été exécutée, et un pipeline YAML non autorisé sur le fichier attend l'autorisation.

<!-- section: prevent-leakage | objectives: 4.2.4 -->
## Concevoir des pipelines qui ne fuient pas

Le masquage est fait au mieux. Azure Pipelines et GitHub masquent dans les journaux les valeurs de secrets enregistrées, mais jamais leurs sous-chaînes, et ils ne reconnaissent pas un secret transformé (Base64, JSON, encodage d'URL).

| Risque | Contrôle |
| --- | --- |
| Secret affiché par un script | Ne jamais afficher de secret ; le mapper dans une variable d'environnement plutôt qu'en argument de ligne de commande |
| Valeur obtenue à l'exécution (un jeton généré) | L'enregistrer : `::add-mask::VALUE` (GitHub), `##vso[task.setvariable variable=token;issecret=true]` (Azure Pipelines) |
| Secret structuré (JSON) partiellement non masqué | Un secret par valeur |
| Une pull request depuis un fork vole les secrets | GitHub : les secrets ne sont pas envoyés aux workflows de forks, évitez `pull_request_target` avec une extraction du code du fork. Azure Pipelines : laissez **Make secrets available to builds of forks** désactivé, exigez le commentaire d'un membre de l'équipe ; contrôle d'organisation ou de projet **Limit building pull requests from forked GitHub repositories** (désactiver, générer de manière sécurisée ou personnaliser les règles) |
| Injection de script depuis le titre d'une pull request ou un nom de branche | Passer `${{ github.event... }}` par une variable `env:`, jamais directement dans `run:` |
| Action tierce compromise | Épingler les actions sur un SHA de commit complet ; restreindre les actions autorisées |
| Exécuteur auto-hébergé dans un dépôt public | Utiliser des exécuteurs hébergés pour du code non fiable |
| Le jeton du pipeline atteint d'autres projets | **Limit job authorization scope** au projet actuel ; **Protect access to repositories in YAML pipelines** |
| Remplacement d'une variable au moment de la mise en file d'attente | **Limit variables that can be set at queue time** ; ne rendre modifiables que les variables prévues |
| Secret poussé dans le code | Analyse des secrets avec protection push |
| Azure CLI affiche une clé | `--output none` sur les commandes qui renvoient des secrets |

```yaml
- bash: |
    TOKEN=$(./get-token.sh)
    echo "##vso[task.setvariable variable=apiToken;issecret=true]$TOKEN"
  displayName: Get token
- bash: ./call-api.sh
  env:
    API_TOKEN: $(apiToken)
```

```yaml
- name: Check title
  env:
    TITLE: ${{ github.event.pull_request.title }}
  run: |
    echo "::add-mask::$(cat token.txt)"
    [[ "$TITLE" =~ ^[A-Z]+-[0-9]+ ]] || exit 1
```

> **Conseil d'examen.** Les questions « un secret apparaît dans les journaux » se résolvent en changeant le chemin du secret (variable d'environnement, issecret, add-mask, une valeur par secret), pas en supprimant les journaux. Faites tourner tout secret déjà divulgué.

<!-- section: key-points -->
## Points clés

- Key Vault : secrets, clés, certificats ; RBAC par défaut depuis l'API 2026-02-01 ; Key Vault Secrets User pour les pipelines ; suppression réversible de 7 à 90 jours ; la protection contre le vidage est définitive.
- Azure Pipelines lit Key Vault avec un groupe de variables lié (secrets uniquement, valeurs les plus récentes) ou avec AzureKeyVault@2.
- Secrets GitHub : organisation, dépôt, environnement ; le niveau le plus bas l'emporte ; 48 Ko ; les secrets d'environnement attendent les règles de protection.
- Sans secret : OIDC avec `id-token: write` dans GitHub, connexions de service avec fédération d'identité de charge de travail dans Azure Pipelines ; le sujet doit correspondre exactement.
- Fichiers sécurisés : 10 Mo, autorisés par pipeline, DownloadSecureFile@1, supprimés après le job.
- Les variables secrètes se mappent avec `env:` ; le masquage est fait au mieux ; protégez les builds de forks, épinglez les actions et restreignez l'étendue des jobs.
