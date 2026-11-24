Les charges de travail d'IA générative créées dans Microsoft Foundry demandent quatre types de contrôles que l'examen teste séparément : une passerelle qui authentifie, limite et journalise le trafic vers les modèles (AI Gateway dans Azure API Management), une détection des menaces sur les invites et les réponses (Defender for AI services), des filtres de contenu et de sécurité sur ce que lisent et écrivent les modèles et les agents (garde-fous Foundry) et un endroit unique pour voir la posture des ressources de données et d'IA (le tableau de bord de sécurité des données et de l'IA).

<!-- section: ai-gateway | objectives: 3.1.7 -->
## AI Gateway dans API Management pour Foundry

Les fonctionnalités de **passerelle IA** (AI gateway) d'**Azure API Management** placent une instance API Management devant les déploiements de modèles d'une ressource Foundry. L'instance joue le rôle de proxy inverse avec un point de terminaison entrant unique : elle authentifie l'appelant, applique les limites de jetons, journalise la requête et seulement ensuite la transmet au déploiement de modèle. Tous les niveaux d'API Management, classiques ou v2, peuvent servir de passerelle ; la prise en charge de chaque fonctionnalité de passerelle IA dépend du niveau.

Foundry peut consommer des modèles via deux types de ressources distincts :

| Voie | Configuration | Utilisation par les projets |
| --- | --- | --- |
| API Management | Back-ends, authentification, XML des stratégies, limites de jetons et réseau se configurent dans API Management (portail Azure ou code). Dans Foundry : **Connections** > **Add connection** > **Model** > source **Gateway**, avec l'URL de base de la passerelle et l'authentification | Comme modèles connectés. Une connexion à l'**étendue de la ressource** peut servir à tous les projets de la ressource Foundry ; une connexion à l'**étendue du projet** est limitée à un projet |
| Azure AI Gateway | Un produit distinct, avec son propre portail et `az aigateway` ; dans Foundry, **Manage** > **Gateways** > **Azure AI Gateway** (intégration à l'interface Foundry encore en cours de déploiement) | Les alias sélectionnés apparaissent dans les projets comme modèles connectés |

L'ancienne expérience en préversion liait et gérait une instance API Management depuis le portail Foundry ; on ne peut plus créer de nouveau lien API Management depuis Foundry. Les liens, API et stratégies existants continuent de fonctionner ; leurs paramètres de limites de jetons restent visibles dans Foundry, mais se modifient dans le XML des stratégies API Management.

> **Piège d'examen.** La passerelle n'applique ses stratégies qu'au trafic envoyé à son point de terminaison. Une application qui appelle le point de terminaison propre du déploiement de modèle, ou un outil MCP inscrit avec l'URL directe de son back-end, contourne la passerelle : ni limites de jetons, ni journaux de passerelle. Le code doit utiliser le point de terminaison d'exécution de la passerelle, et les agents le modèle connecté. L'accès de gestion à une passerelle n'accorde pas non plus l'accès à l'exécution.

Les limites de jetons se définissent avec la stratégie `llm-token-limit`, par clé de compteur (par exemple l'abonnement API Management de chaque équipe) :

| Limite | Ce qu'elle plafonne | Réponse en cas de dépassement |
| --- | --- | --- |
| `tokens-per-minute` | Le débit | `429 Too Many Requests` |
| `token-quota` avec `token-quota-period` | Le volume sur une période (Hourly, Daily, Weekly, Monthly, Yearly) | `403 Forbidden` |

Contrôles d'authentification et de réseau de la passerelle :

- Les appelants s'authentifient avec des **jetons Microsoft Entra** (chaque application utilise sa propre identité managée) plutôt qu'avec une clé partagée : une application compromise ne peut ni utiliser le quota d'une autre application ni usurper son identité.
- La passerelle elle-même utilise une **identité managée affectée par le système ou par l'utilisateur** pour appeler les déploiements de modèles : attribuez-lui **Cognitive Services OpenAI User** sur la ressource Foundry, et obtenez le jeton avec `authentication-managed-identity` pour la ressource `https://cognitiveservices.azure.com`. Aucune clé à stocker ni à faire tourner. La validation des appelants (`validate-azure-ad-token`) se place avant les stratégies d'authentification auprès du back-end.
- Restreignez le point de terminaison de la passerelle avec un **point de terminaison privé** pour les appelants situés dans Azure, ou une liste d'adresses IP autorisées pour les appelants externes, combinés à la validation des jetons Microsoft Entra.

Les stratégies personnalisées se gèrent dans l'instance API Management. Les stratégies de passerelle IA à reconnaître :

| Stratégie | Rôle |
| --- | --- |
| `llm-token-limit` | Limite TPM ou quota de jetons par clé de compteur (abonnement, adresse IP...) ; peut estimer les jetons de l'invite et rejeter avant d'appeler le back-end |
| `llm-emit-token-metric` | Envoie des métriques de consommation de jetons avec des dimensions personnalisées à Azure Monitor |
| `llm-content-safety` | Envoie les invites ou les complétions à Azure AI Content Safety et renvoie `403` quand un contenu est signalé ; `shield-prompt="true"` détecte aussi les attaques par invite. Couvre aussi les API d'outils MCP et d'agents A2A |

```text
<llm-token-limit counter-key="@(context.Subscription.Id)"
    tokens-per-minute="500" estimate-prompt-tokens="false"
    remaining-tokens-variable-name="remainingTokens" />
```

Pour auditer le trafic, ajoutez un paramètre de diagnostic sur l'instance API Management avec **Logs related to ApiManagement Gateway**, envoyé vers un espace de travail Log Analytics avec des tables **Resource specific**. Les journaux de diagnostic capturent les métadonnées des requêtes (heure, appelant, code de réponse, latence), **pas les corps des requêtes ni des réponses** par défaut ; les corps activés par API sont limités à 8 192 octets chacun. Pour les API LLM, sélectionnez aussi **Logs related to generative AI gateway** : cette catégorie enregistre la consommation de jetons et les modèles et, si vous activez la journalisation des messages sur l'API LLM, les invites et les complétions (découpées en blocs de 32 Ko, jusqu'à 2 Mo par message). Créez ensuite des alertes sur les anomalies, comme un appelant proche de sa limite de jetons ou un agent qui fait soudain beaucoup plus d'appels au modèle que d'habitude.

```kusto
ApiManagementGatewayLogs
| where TimeGenerated > ago(1h)
| summarize Requests = count() by ApiId, ResponseCode
```

<!-- section: defender-ai-services | objectives: 3.1.8 -->
## Defender for AI services

La **protection contre les menaces pour les services d'IA** est un plan de protection des charges de travail de Defender for Cloud. Elle détecte en temps réel les menaces contre les applications d'IA générative, comme les tentatives de jailbreak, la fuite de données, l'empoisonnement de données et le vol d'informations d'identification, à l'aide des **Prompt Shields** d'Azure AI Content Safety et du renseignement sur les menaces de Microsoft. Les alertes peuvent être corrélées en incidents dans le portail Microsoft Defender (Defender XDR).

Pour l'activer : **Microsoft Defender for Cloud** > **Paramètres d'environnement** > sélectionner l'abonnement > sur la page **Plans Defender**, passer **AI services** à **On**. L'activation du plan demande le niveau **Owner** ou **Contributor**. Ouvrez ensuite **Settings** pour le plan afin de configurer ses composants :

| Composant | Effet | Remarques |
| --- | --- | --- |
| Preuves des invites suspectes (**Enable user prompt evidence**) | Les alertes incluent les segments suspects de l'invite et de la réponse du modèle, données sensibles masquées | Désactivé : les invites sont toujours analysées, mais leur contenu est masqué dans les alertes |
| Sécurité des données pour les interactions IA | Permet à Microsoft Purview d'analyser invites et réponses (classification, audit, gestion des risques internes, conformité des communications, eDiscovery) | Fonctionnalité Purview payante, licence Purview requise ; non incluse dans le plan. N'inclut pas les données des agents Foundry ; la prise en charge complète des stratégies de sécurité des données exige des appels Entra ID avec un jeton de contexte utilisateur |
| Sécurité des modèles IA | Analyse les modèles des registres Azure Machine Learning à la recherche de problèmes comme des logiciels malveillants et des vulnérabilités de sérialisation | |

Couverture :

- Pris en charge : modèles Azure OpenAI et modèles du service Azure AI Model Inference. Seuls les jetons **texte** sont analysés (pas l'image ni l'audio).
- Clouds commerciaux uniquement ; pas pour les comptes AWS connectés.

> **Piège d'examen.** Defender for AI services **détecte et alerte** ; il ne bloque pas une invite. Bloquer un jailbreak avant qu'il n'atteigne le modèle relève d'un garde-fou Foundry (contrôle User prompt attacks). Désactiver les preuves d'invite n'arrête pas la détection, cela masque seulement le texte de l'invite dans les alertes.

La posture de l'IA est une autre fonctionnalité : la **gestion de la posture de sécurité de l'IA** fait partie de **Defender CSPM**. Elle découvre la nomenclature IA (AI BOM) des applications créées avec Azure OpenAI, Foundry, Azure Machine Learning, Amazon Bedrock et Google Vertex AI, et ajoute des recommandations (points de terminaison privés, identité managée, authentification basée sur l'identité pour les comptes Azure AI) et des chemins d'attaque, par exemple des données de grounding exposées à Internet. Depuis le 1er juillet 2026, la découverte et la posture des agents eux-mêmes (agents Foundry, agents cloud tiers) exigent une licence Microsoft Agent 365 ; Defender CSPM découvre toujours les comptes et projets Foundry.

| Exigence | Plan |
| --- | --- |
| Alerter sur les tentatives de jailbreak contre un déploiement Azure OpenAI | Defender for AI services |
| Afficher le texte de l'invite dans l'alerte | Defender for AI services + preuves des invites |
| Trouver les ressources d'IA dont les données de grounding sont exposées à Internet | Defender CSPM (posture de sécurité de l'IA) |
| Auditer et classifier les invites dans Purview | Sécurité des données pour les interactions IA + licence Purview |

<!-- section: foundry-guardrails | objectives: 3.1.9 -->
## Garde-fous pour les agents dans Foundry

Un **garde-fou** (guardrail) est une collection nommée de **contrôles**. Chaque contrôle définit un **risque** à détecter, les **points d'intervention** à analyser et l'**action** à mener. Les risques sont détectés par les classifieurs d'Azure AI Content Safety. Les garde-fous s'appliquent aux Foundry Models vendus par Azure et aux agents créés dans Foundry Agent Service (les garde-fous d'agent sont en préversion), pas aux autres agents inscrits dans le plan de contrôle Foundry.

| Risque | Modèles | Agents (préversion) |
| --- | --- | --- |
| Hate, Sexual, Self-harm, Violence | Oui | Oui |
| User prompt attacks (jailbreak) | Oui | Oui |
| Indirect attacks (injection d'invite dans des documents ou une sortie d'outil) | Oui | Oui |
| Protected material for text / for code | Oui | Oui |
| Personally identifiable information (préversion) | Oui | Oui |
| Task adherence (préversion) | Oui | Oui |
| Groundedness (préversion), Spotlighting (préversion) | Oui | Non |

La détection Groundedness (préversion) d'Azure OpenAI est retirée le 30 avril 2027. Les agents hébergés disposent aussi de contrôles de sortie réseau (en disponibilité générale, sauf les règles Transform, en préversion).

Points d'intervention :

| Point | Analyse | S'applique à |
| --- | --- | --- |
| User input | L'invite envoyée au modèle ou à l'agent | Modèles et agents |
| Tool call (préversion) | L'outil que l'agent veut appeler et les données qu'il envoie | Agents |
| Tool response (préversion) | Le contenu renvoyé par l'outil, avant qu'il n'atteigne la mémoire de l'agent ou l'utilisateur | Agents |
| Output | La complétion finale renvoyée à l'utilisateur | Modèles et agents |

Actions : **Annotate** (modèles uniquement) ou **Annotate and block** (modèles et agents). Pour les quatre catégories de préjudice, le niveau de blocage est **Low** (bloque seulement la gravité élevée), **Medium** (moyenne et élevée) ou **High** (faible, moyenne et élevée, le plus restrictif) ; **Off** ne bloque rien pour ce risque, et la désactivation des préjudices de contenu sur les sorties est réservée aux clients approuvés. Les contrôles aux points Tool call et Tool response ne fonctionnent qu'avec les outils qui prennent en charge la modération, comme Azure AI Search, Azure Functions, OpenAPI, le grounding SharePoint, le grounding Bing et Browser Automation.

Attribution et héritage :

- Les modèles utilisent le garde-fou par défaut `Microsoft.DefaultV2`, sauf si vous en attribuez un autre. Les garde-fous par défaut ne sont pas modifiables : créez-en un personnalisé.
- Un agent sans garde-fou propre **hérite** du garde-fou de son déploiement de modèle.
- Le garde-fou d'un agent **remplace entièrement** celui du modèle. Si le modèle a Violence au niveau High et que le garde-fou de l'agent fixe Violence à Low sur l'entrée et la sortie seulement, l'agent est contrôlé au niveau Low et ses appels d'outils ne sont pas contrôlés pour Violence.
- Une requête peut désigner un autre garde-fou dans l'en-tête `x-policy-id` ; dans l'API REST, un garde-fou est une stratégie RAI attribuée à un déploiement via `raiPolicyName`.

Pour en créer un dans le portail Foundry : **Build** > **Guardrails** > **Create Guardrail** ; étape 1, ajouter les contrôles (risque, points d'intervention, action, **Add control**) ; étape 2, **Add agents** et/ou **Add models** ; étape 3, vérifier, nommer et **Create**. L'attribution prend effet immédiatement. Le rôle requis est **Foundry Account Owner** ou supérieur sur la ressource.

> **Piège d'examen.** Une injection d'invite indirecte cachée dans une page web ou un document renvoyé par un outil est interceptée par le risque **Indirect attacks** au point **Tool response**, pas par User prompt attacks au point User input. Et un contrôle sur les points d'outil n'a aucun effet si l'outil ne prend pas en charge la modération.

<!-- section: data-ai-dashboard | objectives: 3.1.10 -->
## Tableau de bord de sécurité des données et de l'IA

Le **tableau de bord de sécurité des données et de l'IA** (Data and AI security dashboard) de Defender for Cloud donne une vue unique des ressources de données (stockage, bases de données managées, bases de données sur des machines virtuelles) et des services d'IA, de leur état de protection, de leurs risques et de leurs données sensibles. Il fonctionne au niveau de l'abonnement et montre ce que permettent les plans activés.

Pour en tirer toute la valeur, il faut :

- **Defender CSPM** avec l'extension de **découverte des données sensibles**
- **Defender for Storage** et **Defender for Databases**
- La protection contre les menaces pour les **services d'IA**
- Le fournisseur de ressources `Microsoft.Security` inscrit sur chaque abonnement
- Des autorisations de lecture sur les évaluations, sous-évaluations et alertes (`Microsoft.Security/assessments/read`, `Microsoft.Security/alerts/read`)

| Section | Affiche |
| --- | --- |
| Data and AI security overview | Les ressources par catégorie et si chacune est entièrement, partiellement ou pas protégée ; les ressources avec des recommandations, alertes ou chemins d'attaque élevés ou critiques |
| Top issues | Les alertes de gravité la plus élevée (par tactique MITRE ATT&CK), les recommandations et chemins d'attaque critiques et élevés |
| Data closer look | Découverte des données sensibles (types d'informations, étiquettes de confidentialité), alertes de protection des données, requêtes de l'explorateur de sécurité (secrets en texte clair, stockage public avec données sensibles), ressources de données exposées à Internet |
| AI closer look | Découverte de l'IA, protection contre les menaces de l'IA (invites analysées, alertes par gravité), requêtes de l'explorateur de sécurité (données sensibles utilisées pour le grounding, conteneurs vulnérables utilisés pour l'IA), ressources exposées à Internet utilisées pour le grounding |

Depuis le tableau de bord, **Manage Sensitivity Settings** ouvre les paramètres de sensibilité des données au niveau du locataire, basés sur les types d'informations et les étiquettes de Microsoft Purview.

> **Piège d'examen.** Sans Defender CSPM et la découverte des données sensibles, le tableau de bord ne peut montrer ni quelles données de grounding sont sensibles ni les chemins d'attaque qui y mènent ; sans le plan AI services, les widgets de protection contre les menaces de l'IA restent vides.

<!-- section: key-points -->
## Points clés

- AI Gateway = API Management devant les modèles Foundry : authentification Entra, `llm-token-limit` avec TPM (`429`) et quota (`403`) par clé de compteur, journalisation (catégorie generative AI gateway pour les invites et les complétions).
- API Management se configure dans Azure, puis se consomme dans Foundry par une connexion Gateway (étendue de la ressource ou du projet) ; on ne peut plus créer de lien API Management depuis Foundry, et le trafic qui évite le point de terminaison de la passerelle n'est pas contrôlé.
- Defender for AI services détecte (jailbreak, fuite de données) et alerte ; les preuves d'invite ajoutent seulement le texte de l'invite aux alertes ; l'intégration Purview demande une licence Purview.
- La posture de l'IA (AI BOM, chemins d'attaque) vient de Defender CSPM, pas du plan AI services.
- Garde-fou = contrôles (risque + point d'intervention + action) ; le garde-fou de l'agent remplace celui du modèle ; les points Tool call et Tool response sont réservés aux agents.
- Le tableau de bord de sécurité des données et de l'IA est alimenté par Defender CSPM, Defender for Storage, Defender for Databases et le plan AI services.
