Mettre un modèle de base en production, c'est choisir son hébergement (API serverless ou calcul managé), le modèle adapté à la tâche, la manière dont les versions changent sans casser l'application et la capacité réservée dont une charge de travail à volume élevé a besoin. Les questions d'examen décrivent une charge de travail (résidence des données, trafic régulier ou en rafales, modèle open source, modèle retiré le mois prochain) et demandent l'option de déploiement, le type de déploiement, la stratégie de version ou le nombre d'unités de débit approvisionné.

<!-- section: deployment-options | objectives: 3.2.1 -->
## Déploiements d'API serverless et de calcul managé

Microsoft Foundry propose ces options de déploiement :

| | API serverless | Calcul managé (préversion dans les projets Foundry) |
| --- | --- | --- |
| Modèles | Tous les modèles Foundry : modèles vendus directement par Azure (Azure OpenAI et autres) et certains modèles de partenaires | Modèles open source et de partenaires du catalogue (collection Hugging Face), NVIDIA NIM, modèles sectoriels |
| Où il s'exécute | Points de terminaison hébergés par Microsoft ; rien à dimensionner | Capacité GPU dédiée gérée par Microsoft (accélérateurs A100, H100, MI300X) |
| Déployé sur | La ressource Foundry | Un projet Foundry |
| Facturation | Par jeton, ou par unité de débit approvisionné (PTU) et par heure | Par heure et par SKU d'accélérateur, tant que le déploiement existe |
| Quota | Jetons par minute (TPM) ou PTU par abonnement, région et type de déploiement | Quota de calcul managé par famille d'accélérateurs et région, distinct du quota de machines virtuelles Azure |
| Filtrage du contenu | Garde-fous intégrés et personnalisables | Absent du chemin des données en préversion : appelez vous-même Azure AI Content Safety |
| Traitement des données | Global, zone de données ou régional | Global |
| Authentification | Microsoft Entra ID ou clé | Microsoft Entra ID ou clé |

**Types de déploiement de l'API serverless** (le nom de SKU est celui qu'utilisent les modèles et la CLI) :

| Type de déploiement | Nom de SKU | Données traitées | Facturation |
| --- | --- | --- | --- |
| Global Standard | `GlobalStandard` | N'importe quelle région Azure | Par jeton |
| Data Zone Standard | `DataZoneStandard` | Dans une zone de données (US, EU ou APAC) | Par jeton |
| Standard | `Standard` | Dans la zone géographique Azure | Par jeton |
| Global Provisioned | `GlobalProvisionedManaged` | N'importe quelle région Azure | PTU par heure |
| Data Zone Provisioned | `DataZoneProvisionedManaged` | Dans une zone de données | PTU par heure |
| Regional Provisioned | `ProvisionedManaged` | Dans la zone géographique Azure | PTU par heure |
| Global Batch / Data Zone Batch | `GlobalBatch` / `DataZoneBatch` | Global / zone de données | 50 % moins cher que Global Standard, objectif de 24 heures |
| Developer | `DeveloperTier` | N'importe quelle région Azure | Par jeton ; évaluation de modèles ajustés uniquement, sans SLA, supprimé après 24 heures |

Le **calcul managé dans un projet Foundry** (préversion, sans SLA, déconseillé en production) utilise le SKU `GlobalManagedCompute`, un modèle de déploiement (deployment template) et un type d'accélérateur (par exemple `H100_80GB`). Vous mettez à l'échelle en changeant le nombre d'instances du modèle (`sku.capacity`), pas la taille des nœuds. L'approvisionnement prend environ 10 à 15 minutes ; la facturation s'arrête quand vous supprimez le déploiement. Créer, mettre à jour ou supprimer ces déploiements demande Cognitive Services Contributor, Foundry Account Owner ou Foundry Owner ; les appeler avec Microsoft Entra ID demande Foundry User. Le point de terminaison est le point de terminaison compatible OpenAI de la ressource (`https://<account>.services.ai.azure.com/openai/v1/`) et le champ `model` est le nom du déploiement.

Les **projets basés sur un hub (Foundry classique)** exposent les deux mêmes idées par Azure Machine Learning :

| | Point de terminaison d'API serverless (classique) | Calcul managé (classique) |
| --- | --- | --- |
| Ressource | `az ml serverless-endpoint` dans un projet basé sur un hub | Point de terminaison et déploiement en ligne managés |
| Référence du modèle | ID de modèle du registre **sans** version : le point de terminaison utilise toujours la dernière version | ID de modèle du registre **avec** version, comme `azureml://registries/azureml/models/Phi-4/versions/8` |
| Infrastructure et quota | Aucune ; pas de quota d'abonnement ; 200 000 TPM et 1 000 requêtes par minute par déploiement ; un déploiement par modèle et par projet | Type et nombre d'instances de machines virtuelles ; consomme le quota de cœurs de machines virtuelles de la région |
| Modèles de partenaires | Abonnement Place de marché Azure par projet et par offre (`az ml marketplace-subscription`) | Accès à la Place de marché Azure pour les modèles de partenaires et de la communauté |
| Authentification | Clé | Clé (`auth_mode: key` dans l'exemple classique) |
| URI de scoring | Affiché comme URI cible (Target URI) avec sa clé | `https://<endpoint-name>.<region>.inference.ml.azure.com/score` |
| Rôle | Azure AI Developer sur le groupe de ressources | Azure AI Developer sur le groupe de ressources |

```yaml
# endpoint.yml for: az ml serverless-endpoint create -f endpoint.yml
name: DeepSeek-R1-qwerty
model_id: azureml://registries/azureml-deepseek/models/DeepSeek-R1
```

```bash
az ml serverless-endpoint create -f endpoint.yml
az ml serverless-endpoint get-credentials -n DeepSeek-R1-qwerty
```

Supprimer l'abonnement Place de marché du modèle rend ses points de terminaison serverless Unhealthy (non sains) et inutilisables.

| Exigence | Option |
| --- | --- |
| Azure OpenAI ou un autre modèle vendu par Azure, sans infrastructure, paiement par jeton | API serverless, type de déploiement à paiement par jeton (Global Standard par défaut) |
| Modèle open source non proposé en API serverless | Calcul managé |
| Le filtrage du contenu doit être appliqué par la plateforme | API serverless (le calcul managé n'en a pas en préversion) |
| Volume élevé et régulier avec une latence prévisible | API serverless avec un type de déploiement approvisionné |
| Un modèle personnalisé entraîné dans Azure Machine Learning | Point de terminaison en ligne managé (calcul managé) |
| Coût le plus bas pour des millions de requêtes asynchrones | Global Batch |

> **Piège d'examen.** Le calcul managé est facturé par heure d'accélérateur même si personne n'appelle le modèle, et son quota n'est pas votre quota de machines virtuelles. L'API serverless est facturée par jeton (ou par PTU-heure pour les types approvisionnés). Si l'énoncé dit « ne payer que ce qui est utilisé » et que le modèle est proposé en API serverless, le calcul managé est faux.

<!-- section: model-selection | objectives: 3.2.2 -->
## Sélectionner des modèles pour un cas d'usage

Les **classements de modèles** (leaderboards, préversion) du portail Foundry comparent des modèles de texte (LLM et SLM) et des modèles d'incorporation sur des benchmarks publics :

| Classement | Métrique | Lecture |
| --- | --- | --- |
| Qualité | Indice de qualité : moyenne des scores d'exactitude sur les jeux de données de benchmark | 0 à 1, plus haut = meilleur |
| Sécurité | Taux de réussite des attaques (HarmBench), F1 Toxigen, exactitude WMDP | Un taux de réussite des attaques plus bas est plus sûr ; une exactitude WMDP plus haute signifie plus de connaissances dangereuses |
| Performances | Latence (moyenne, P50, P90, P95, P99), délai jusqu'au premier jeton, jetons générés par seconde, jetons totaux par seconde | Latence plus basse, débit plus haut = meilleur |
| Coût | Coût d'exécution du modèle sur le benchmark | Plus bas = moins cher |
| Incorporations | Exactitude, F1, NDCG à 10, précision et autres métriques de récupération et de clustering | Plus haut = meilleur |

Les **classements par scénario** regroupent les jeux de données par tâche (raisonnement, code, mathématiques, questions-réponses, ancrage, détection de toxicité...). Pour un choix propre à une tâche, partez du classement par scénario plutôt que de l'indice de qualité global, puis ouvrez les résultats détaillés du modèle, essayez-le dans le terrain de jeu (playground) et évaluez-le sur vos propres données.

| Exigence | Sélection |
| --- | --- |
| Tâche simple à volume élevé (classification, extraction, réponses courtes) | Un petit modèle (`-mini`, `-nano` ou un SLM) : une fraction du coût et de la latence |
| Raisonnement en plusieurs étapes, planification complexe, code | Un modèle de raisonnement ; les techniques d'invite comme la chaîne de pensée ne sont pas recommandées pour les modèles de raisonnement |
| Images dans l'invite | Un modèle qui accepte les images en entrée |
| Documents très longs | Un modèle dont la fenêtre de contexte contient l'entrée |
| Modèle non disponible en API serverless dans la région exigée | Une autre région, un autre type de déploiement ou le calcul managé |
| Charge de travail mixte, invites faciles et difficiles | Routeur de modèles (model router) |
| Qualité de récupération pour le RAG | Un modèle d'incorporation choisi dans le classement des incorporations, puis testé sur votre corpus |

Le **routeur de modèles** (model router) est un modèle déployable qui envoie chaque invite au modèle sous-jacent le plus adapté. Modes de routage : **Balanced** (par défaut ; le modèle le moins cher dans une petite marge de qualité par rapport au meilleur), **Quality** (qualité maximale, coût ignoré) et **Cost** (marge de qualité plus large pour plus d'économies). Un **sous-ensemble de modèles** limite les modèles utilisables et sert d'ensemble de repli (choisissez-en au moins deux). Il se déploie en Global Standard ou Data Zone Standard ; sa fenêtre de contexte effective est celle du plus petit modèle du sous-ensemble, et il ne traite pas l'audio.

> **Piège d'examen.** Un modèle en tête d'un classement public n'est pas automatiquement la bonne réponse. Quand l'énoncé demande comment confirmer qu'un modèle moins cher suffit pour votre application, la réponse est une évaluation sur votre propre jeu de données, pas un score de benchmark.

<!-- section: versioning-strategies | objectives: 3.2.3 -->
## Gestion des versions de modèles et stratégies de déploiement en production

Un déploiement fige un nom et une version de modèle derrière un **nom de déploiement** que l'application envoie comme `model`. Utilisez un nom de déploiement stable et lié au rôle (`chat-prod`) pour que le code ne change pas quand le modèle change.

Étapes du cycle de vie d'un modèle :

| Étape | Signification |
| --- | --- |
| Preview (préversion) | Date de retrait « pas avant » environ 90 jours après le lancement ; les déploiements sont mis à niveau de force ou retirés |
| Généralement disponible | Date de retrait fixée à environ 18 mois |
| Legacy (facultatif) | Des modèles plus récents existent ; planifiez la migration |
| Deprecated (déprécié) | Les clients existants gardent leurs déploiements ; les nouveaux clients ne peuvent pas déployer |
| Retired (retiré) | Supprimé ; chaque requête d'inférence renvoie `410 Gone` |

Les notifications arrivent aux propriétaires d'abonnement qui ont des déploiements actifs au moins **60 jours** avant le retrait pour les modèles GA et **30 jours** pour les modèles en préversion, par e-mail et par Azure Service Health. Les dates de retrait ne peuvent pas être prolongées.

La propriété `versionUpgradeOption` d'un déploiement de type Standard décide de ce qui se passe :

| Valeur | Comportement |
| --- | --- |
| `OnceNewDefaultVersionAvailable` | Passe à la nouvelle version par défaut dans les deux semaines après qu'elle devient la version par défaut |
| `OnceCurrentVersionExpired` | Reste figé ; passe à la version par défaut courante au retrait. `null` se comporte de la même façon |
| `NoAutoUpgrade` | Jamais de mise à niveau ; le déploiement **cesse de fonctionner** au retrait |

Les mises à niveau automatiques ne s'appliquent qu'aux types de déploiement Standard. **Les déploiements approvisionnés ne sont jamais mis à niveau automatiquement** : migrez-les soit **sur place** (même nom et même taille de déploiement, nouvelle version du modèle ; le trafic bascule en 20 à 30 minutes, état « updating »), soit par une migration **multi-déploiement** (créer un nouveau déploiement approvisionné, déplacer le trafic, vérifier que l'ancien ne reçoit plus de requêtes pendant 5 à 10 minutes, le supprimer). Les migrations ne se font qu'entre déploiements du même type. Azure CLI peut lire `versionUpgradeOption` mais pas le définir : utilisez des modèles Bicep ou ARM, REST ou Azure PowerShell.

Un déploiement sûr d'une nouvelle version de modèle en production :

1. Déployez la nouvelle version comme **second déploiement** à côté de l'actuel (par exemple `chat-v2` à côté de `chat-prod`).
2. Exécutez le même jeu de données d'évaluation sur les deux et comparez qualité, latence et coût ; vérifiez la compatibilité de l'API, la prise en charge des fonctionnalités, la région, le quota et la capacité.
3. Basculez le trafic par la configuration (le nom de déploiement lu par l'application, une passerelle ou un routage pondéré), en commençant par une petite part.
4. Gardez le déploiement précédent jusqu'à ce que les métriques confirment le changement ; restaurer consiste à remettre l'ancien nom.
5. Supprimez l'ancien déploiement quand il ne reçoit plus de trafic.

| Exigence | Stratégie |
| --- | --- |
| Ne jamais changer le comportement du modèle sans test | Figer la version avec `OnceCurrentVersionExpired` (ou `NoAutoUpgrade`) et mettre à niveau volontairement après évaluation |
| Toujours exécuter la dernière version par défaut sans travail manuel | `OnceNewDefaultVersionAvailable` |
| Modèle retiré le mois prochain sur un déploiement approvisionné | Migrer manuellement (sur place ou multi-déploiement) avant la date |
| Restauration instantanée | Deux déploiements ; basculer le nom de déploiement dans la configuration |

> **Piège d'examen.** `NoAutoUpgrade` ne garde pas une ancienne version en vie après son retrait : le déploiement échoue simplement à partir de cette date. Et un déploiement du routeur de modèles sur sa dernière version reçoit de nouveaux modèles sous-jacents au fil du temps, ce qui peut changer la qualité et le coût : évaluez-le par rapport à votre référence.

<!-- section: provisioned-throughput | objectives: 3.2.4 -->
## Unités de débit approvisionné pour les charges de travail à volume élevé

Une **unité de débit approvisionné (PTU)** est une quantité fixe de capacité de traitement du modèle réservée à un déploiement. Le quota de PTU n'est pas lié à un modèle : le même quota sert tout modèle qui prend en charge les déploiements approvisionnés dans cette région et ce type de déploiement.

| Concept | Règle |
| --- | --- |
| Quota | Nombre maximal de PTU par abonnement, région et type de déploiement ; une limite de stratégie gratuite (portail Foundry : Manage, Quota, Provisioned throughput unit ; demandez-en plus à cet endroit) |
| Capacité | PTU réellement disponibles pour un modèle dans la région, allouées au déploiement ; le quota ne la garantit pas, et le déploiement échoue si la capacité manque |
| Facturation | Par PTU et par heure, de la création à la suppression, quel que soit le nombre de jetons consommés |
| Réservations Azure | Engagement d'un mois ou d'un an pour un tarif horaire réduit, par type de déploiement ; ne garantissent pas la capacité : créez d'abord le déploiement, puis achetez la réservation |
| Mise à l'échelle | Changez le nombre de PTU à tout moment ; réduire libère une capacité qui peut ne plus être disponible, donc ne montez pas et ne descendez pas au gré du trafic |

Chaque modèle a un minimum et un incrément. Pour les déploiements approvisionnés Global et Data Zone des modèles actuels, le minimum est de 15 PTU par incréments de 5 ; les minimums Regional sont plus élevés (25 ou 50 selon le modèle, avec des incréments identiques).

**Dimensionnement.** Le calculateur de capacité du portail Foundry calcule les PTU à partir des requêtes par minute en pointe, des jetons moyens d'entrée et de sortie et du taux de cache :

```text
Input TPM       = peak RPM x average input tokens
Output TPM      = peak RPM x average output tokens
Normalized TPM  = input TPM x (1 - cache rate) + output-to-input ratio x output TPM
PTUs            = normalized TPM / input TPM per PTU, rounded up to the increment
```

| Modèle | TPM d'entrée par PTU | Ratio sortie/entrée |
| --- | --- | --- |
| gpt-4.1 | 3 000 | 4 |
| gpt-4.1-mini | 14 900 | 4 |
| gpt-5 | 4 750 | 8 |
| gpt-5-mini | 23 750 | 8 |

Exemple : gpt-4.1, 600 requêtes par minute en pointe, 1 000 jetons d'entrée et 200 de sortie par requête, sans cache. TPM normalisé = 600 000 + 4 x 120 000 = 1 080 000, donc 360 PTU, une taille Global Provisioned valide (multiple de 5) ; un déploiement Regional arrondit à son incrément plus grand.

**Utilisation.** Surveillez la métrique **Provisioned-managed utilization V2** dans Azure Monitor. À 100 % d'utilisation, le déploiement renvoie immédiatement **HTTP 429**, avec les en-têtes `retry-after` et `retry-after-ms` : c'est un signal de gestion du trafic, pas une erreur du service. Options : réessayer après le délai indiqué (les SDK OpenAI réessaient deux fois par défaut), envoyer la requête à un autre déploiement, ou configurer le **débordement** (spillover), qui envoie les requêtes qui seraient rejetées vers un déploiement standard de la même ressource Foundry, pour toutes les requêtes du déploiement ou par requête avec l'en-tête `x-ms-spillover-deployment`. Le débordement est pris en charge pour les modèles Azure OpenAI, pas pour les modèles d'autres fournisseurs.

```bash
az cognitiveservices account deployment create \
  --name contoso-ai-prod --resource-group rg-ai-prod \
  --deployment-name chat-ptu \
  --model-name gpt-4.1 --model-version "2025-04-14" --model-format OpenAI \
  --sku-name GlobalProvisionedManaged --sku-capacity 360 \
  --spillover-deployment-name chat-standard
```

Créer un déploiement approvisionné demande Contributor ou Cognitive Services Contributor sur l'abonnement ou le groupe de ressources. Le code d'inférence est le même que pour tout autre type de déploiement : passez le nom du déploiement comme `model`.

| Exigence | Réponse |
| --- | --- |
| Latence constante pour un trafic régulier, élevé et prévisible | Déploiement approvisionné |
| Pointes occasionnelles au-delà de la capacité approvisionnée | Débordement vers un déploiement standard |
| Coût horaire le plus bas pour une charge qui tourne toute l'année | Déploiement approvisionné plus une réservation d'un an achetée après la réussite du déploiement |
| Les données doivent rester dans l'UE avec un débit réservé | `DataZoneProvisionedManaged` |
| Volume en rafales, faible ou imprévisible | Déploiement Standard (paiement par jeton) |

> **Piège d'examen.** Un 429 d'un déploiement approvisionné signifie qu'il est à 100 % d'utilisation, pas que le quota est épuisé ; ajouter du quota de PTU ne change rien tant que le déploiement lui-même n'a pas plus de PTU. Et acheter une réservation ne crée jamais de capacité.

<!-- section: key-points -->
## Points clés

- API serverless : facturation par jeton ou par PTU, filtres de contenu intégrés, types de déploiement `GlobalStandard`, `DataZoneStandard`, `Standard`, approvisionnés et batch. Calcul managé : à l'heure par accélérateur, quota propre, pas de filtrage intégré en préversion.
- Projets classiques basés sur un hub : `az ml serverless-endpoint` (ID de modèle sans version, abonnement Place de marché pour les modèles de partenaires) et points de terminaison en ligne managés (ID de modèle versionné, quota de machines virtuelles).
- Choisissez les modèles avec les classements par scénario, puis confirmez par une évaluation sur vos données ; routeur de modèles pour les charges mixtes.
- `versionUpgradeOption` : `OnceNewDefaultVersionAvailable`, `OnceCurrentVersionExpired` (par défaut), `NoAutoUpgrade` (échoue au retrait). Les déploiements approvisionnés ne sont jamais mis à niveau automatiquement. Les modèles retirés renvoient `410 Gone`.
- PTU : le quota n'est pas la capacité ; facturation horaire ; réservations après le déploiement ; 429 à 100 % d'utilisation ; débordement vers un déploiement standard.
