Les charges de travail d'IA générative créées dans Microsoft Foundry demandent quatre types de contrôles que l'examen teste séparément : une passerelle qui authentifie, limite et journalise le trafic vers les modèles (AI Gateway dans Azure API Management), une détection des menaces sur les invites et les réponses (Defender for AI services), des filtres de contenu et de sécurité sur ce que lisent et écrivent les modèles et les agents (garde-fous Foundry) et un endroit unique pour voir la posture des ressources de données et d'IA (le tableau de bord de sécurité des données et de l'IA).

<!-- section: ai-gateway | objectives: 3.1.7 -->
## AI Gateway dans API Management pour Foundry

**AI Gateway** fait passer le trafic vers les modèles et les outils d'une ressource Foundry par une instance **Azure API Management**. L'instance joue le rôle de proxy inverse avec un point de terminaison entrant unique : elle authentifie l'appelant, applique les limites de jetons, journalise la requête et seulement ensuite la transmet au déploiement de modèle.

Prérequis et autorisations :

| Tâche | Exigence |
| --- | --- |
| Créer une nouvelle instance API Management depuis Foundry | Contributor ou Owner sur le groupe de ressources cible |
| Utiliser une instance existante | API Management Service Contributor (ou Owner) sur cette instance |
| Gérer la passerelle dans Foundry | Par exemple Foundry Account Owner ou Foundry Owner sur la ressource Foundry (anciennement Azure AI Account Owner et Azure AI Owner) |
| Instance existante proposée dans la liste | Même locataire Microsoft Entra **et** même abonnement que la ressource Foundry, et un **niveau v2** |
| Ressource Foundry dont l'accès réseau public est désactivé | L'instance API Management doit aussi être privée : Standard v2 ou Premium v2 avec un point de terminaison privé, ou Premium v2 injecté dans un réseau virtuel |

Étapes dans le portail Foundry (nouvelle expérience Foundry) : **Manage** > **AI Gateway** > **Add AI Gateway**, sélectionner la ressource Foundry, choisir **Create new** ou **Use existing**, nommer la passerelle, sélectionner **Add** et attendre l'état **Enabled**. **Create new** déploie une instance **Basic v2**, prévue pour le développement et le test ; utilisez une instance Standard v2 ou Premium v2 existante pour la production.

Règles d'étendue :

- La passerelle est rattachée à la **ressource Foundry** et partagée par tous ses projets. Les limites se définissent **par projet**. Des projets qui exigent des passerelles distinctes vont dans des ressources Foundry distinctes.
- Les nouveaux projets sont activés par défaut. **Les projets existants ne le sont pas** : ouvrez la passerelle, vérifiez la colonne **Gateway status** et sélectionnez **Add project to gateway**. D'ici là, leurs requêtes contournent la passerelle.

> **Piège d'examen.** Un projet qui existait avant l'ajout de la passerelle continue d'appeler les modèles directement tant que vous n'avez pas sélectionné **Add project to gateway**. « Les limites de jetons ne s'appliquent pas » dans un scénario signifie en général que le projet n'est pas activé.

Les limites de jetons se configurent dans **Manage** > **AI Gateway** > la passerelle > **Token management** > **+ Set limit**, par projet et par déploiement :

| Limite | Ce qu'elle plafonne | Réponse en cas de dépassement |
| --- | --- | --- |
| Jetons par minute (TPM) | Le débit | `429 Too Many Requests` |
| Quota total de jetons | Le volume sur une période (par exemple horaire, quotidienne, mensuelle) | `403 Forbidden` |

Contrôles d'authentification et de réseau de la passerelle :

- Les appelants s'authentifient avec des **jetons Microsoft Entra** (chaque application utilise sa propre identité managée) plutôt qu'avec une clé partagée : une application compromise ne peut ni utiliser le quota d'une autre application ni usurper son identité.
- La passerelle elle-même utilise une **identité managée affectée par le système ou par l'utilisateur** pour appeler les déploiements de modèles, avec un rôle comme **Cognitive Services User** limité à ces déploiements. Aucune clé à stocker ni à faire tourner.
- Restreignez le point de terminaison de la passerelle avec un **point de terminaison privé** pour les appelants situés dans Azure, ou une liste d'adresses IP autorisées pour les appelants externes, combinés à la validation des jetons Microsoft Entra.

Les stratégies personnalisées se gèrent dans l'instance API Management. Les stratégies de passerelle IA à reconnaître :

| Stratégie | Rôle |
| --- | --- |
| `llm-token-limit` | Limite TPM ou quota de jetons par clé de compteur (abonnement, adresse IP...) ; peut estimer les jetons de l'invite et rejeter avant d'appeler le back-end |
| `llm-emit-token-metric` | Envoie des métriques de consommation de jetons avec des dimensions personnalisées à Azure Monitor |
| `llm-content-safety-policy` | Modère les invites avec Azure AI Content Safety |

```text
<llm-token-limit counter-key="@(context.Subscription.Id)"
    tokens-per-minute="500" estimate-prompt-tokens="false"
    remaining-tokens-variable-name="remainingTokens" />
```

Pour auditer le trafic, ajoutez un paramètre de diagnostic sur l'instance API Management avec **Logs related to ApiManagement Gateway**, envoyé vers un espace de travail Log Analytics avec des tables **Resource specific**. Les journaux de diagnostic capturent les métadonnées des requêtes (heure, appelant, jetons, code de réponse, latence), **pas le contenu des invites ni des complétions** par défaut. Créez ensuite des alertes sur les anomalies, comme un appelant proche de sa limite de jetons ou un agent qui fait soudain beaucoup plus d'appels au modèle que d'habitude.

```kusto
ApiManagementGatewayLogs
| where TimeGenerated > ago(1h)
| summarize Requests = count() by ApiId, ResponseCode
```

<!-- section: defender-ai-services | objectives: 3.1.8 -->
## Defender for AI services

La **protection contre les menaces pour les services d'IA** est un plan de protection des charges de travail de Defender for Cloud. Elle détecte en temps réel les menaces contre les applications d'IA générative, comme les tentatives de jailbreak, la fuite de données, l'empoisonnement de données et le vol d'informations d'identification, à l'aide des **Prompt Shields** d'Azure AI Content Safety et du renseignement sur les menaces de Microsoft. Les alertes peuvent être corrélées en incidents dans le portail Microsoft Defender (Defender XDR).

Pour l'activer : **Microsoft Defender for Cloud** > **Paramètres d'environnement** > sélectionner l'abonnement > sur la page **Plans Defender**, passer **AI services** à **On**. L'activation du plan à l'étendue de l'abonnement demande **Owner** (ou des rôles disposant des autorisations correspondantes). Ouvrez ensuite **Settings** pour le plan afin de configurer ses composants :

| Composant | Effet | Remarques |
| --- | --- | --- |
| Preuves des invites suspectes (**Enable user prompt evidence**) | Les alertes incluent les segments suspects de l'invite et de la réponse du modèle, données sensibles masquées | Désactivé : les invites sont toujours analysées, mais leur contenu est masqué dans les alertes |
| Sécurité des données pour les interactions IA | Permet à Microsoft Purview d'analyser invites et réponses (classification, audit, gestion des risques internes, conformité des communications, eDiscovery) | Fonctionnalité Purview payante, licence Purview requise ; non incluse dans le plan |
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

Points d'intervention :

| Point | Analyse | S'applique à |
| --- | --- | --- |
| User input | L'invite envoyée au modèle ou à l'agent | Modèles et agents |
| Tool call (préversion) | L'outil que l'agent veut appeler et les données qu'il envoie | Agents |
| Tool response (préversion) | Le contenu renvoyé par l'outil, avant qu'il n'atteigne la mémoire de l'agent ou l'utilisateur | Agents |
| Output | La complétion finale renvoyée à l'utilisateur | Modèles et agents |

Actions : **Annotate** (modèles uniquement) ou **Annotate and block** (modèles et agents). Pour les quatre catégories de préjudice, le niveau de blocage est **Low** (bloque seulement la gravité élevée), **Medium** (moyenne et élevée) ou **High** (faible, moyenne et élevée, le plus restrictif). Les contrôles aux points Tool call et Tool response ne fonctionnent qu'avec les outils qui prennent en charge la modération, comme Azure AI Search, Azure Functions, OpenAPI, le grounding SharePoint, le grounding Bing et Browser Automation.

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

- AI Gateway = API Management devant les modèles Foundry : authentification Entra, limites TPM (`429`) et quota (`403`) par projet, journalisation des métadonnées.
- Une instance API Management existante doit être v2, dans le même locataire et le même abonnement ; les projets existants doivent être ajoutés à la passerelle.
- Defender for AI services détecte (jailbreak, fuite de données) et alerte ; les preuves d'invite ajoutent seulement le texte de l'invite aux alertes ; l'intégration Purview demande une licence Purview.
- La posture de l'IA (AI BOM, chemins d'attaque) vient de Defender CSPM, pas du plan AI services.
- Garde-fou = contrôles (risque + point d'intervention + action) ; le garde-fou de l'agent remplace celui du modèle ; les points Tool call et Tool response sont réservés aux agents.
- Le tableau de bord de sécurité des données et de l'IA est alimenté par Defender CSPM, Defender for Storage, Defender for Databases et le plan AI services.
