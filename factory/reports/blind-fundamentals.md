# Contrôle à l'aveugle — AZ-900, AI-901, DP-900, SC-900

Date : 2026-11-17. Sources : `factory/blind/<code>.answers.json`, `factory/blind/<code>.gaps.json`, les YAML des 12 questions en écart, les rapports `factory/reports/*-<code>-*.md`, et les pages Learn citées plus bas (lues le 2026-11-17). Aucun fichier de question n'a été modifié, aucun statut changé.

## 1. Synthèse

| Certification | Questions | Confirmées | Écarts | Réponses fausses | Signalements « ambigu » |
| --- | --- | --- | --- | --- | --- |
| AZ-900 | 471 | 467 | 4 | 0 | 4 |
| AI-901 | 473 | 470 | 3 | 0 | 3 |
| DP-900 | 473 | 471 | 2 | 0 | 2 |
| SC-900 | 472 | 469 | 3 | 0 | 3 |
| **Total** | **1889** | **1877** | **12** | **0** | **12** |

Les 12 écarts sont tous des cas où le relecteur a donné la réponse attendue tout en signalant la question comme ambiguë. Après analyse :

| Classe | Nombre | Questions |
| --- | --- | --- |
| corrigé faux | 0 | — |
| ambiguïté réelle — à reformuler | 4 | az900-1c-paas-control-statements, ai901-2a-throttling-max-tokens, sc900-3b-kv-trust-yn, az900-2b-ep-private-benefit |
| remarque infondée | 8 | az900-2c-red-yn-secondary, az900-2d-did-statements, ai901-2b-agent-yn-web-search, ai901-2b-text-language-endpoint, dp900-4c-model-design-yn, dp900-2a-norm-benefits, sc900-4a-portal-home-yn, sc900-1a-did-layers-yn |
| fait à vérifier sur Learn | 0 | — |

**Limites de ce résultat, à dire franchement.**

- Un score de 100 % sans aucune réponse fausse peut vouloir dire que les corrigés sont justes. Il peut aussi vouloir dire que les relecteurs, de la même famille de modèles que les rédacteurs, partagent leurs angles morts : une erreur que le rédacteur croit vraie, le relecteur la croit vraie aussi, et elle passe. Deux cas le montrent ici. Pour ai901-2a-throttling-max-tokens, le relecteur a justifié la réponse par un mécanisme (le TPM compte l'estimation `max_tokens`) que la page de quota Learn actuelle contredit. Pour dp900-4c-model-design-yn, il a cité un texte Learn qui n'existe plus. Ce contrôle ne remplace pas la relecture humaine sur Learn.
- L'export à l'aveugle ne contient que l'anglais (`tools/questions/export-blind.ts`, fonction `en()`). Le français n'a pas été testé du tout.
- Une partie du score vient sans doute de questions trop faciles, qui donnent la réponse. Motifs vus dans les 12 questions lues :
  - **Distracteurs absurdes, réponse par élimination.** Dans az900-2b-ep-private-benefit, les options A, B et C sont manifestement fausses (plus d'autorisation, réplication, accès depuis internet). Dans dp900-2a-norm-benefits, A, C et E décrivent l'inverse de la normalisation. Dans ai901-2a-throttling-max-tokens, une seule option réduit la consommation de jetons (D l'augmente, C aussi, A n'a aucun rapport).
  - **Affirmations Oui/Non fausses rédigées en termes absolus**, donc repérables sans connaître le sujet : « no longer needed » (az900-2d s2), « relies on one strong control » (sc900-1a s1), « so that Microsoft can extract your keys » (sc900-3b s3), « a fully developed application that you rent » (az900-1c s2), « more control over the operating system than IaaS » (az900-1c s1).
  - **Le scénario donne la réponse.** Dans ai901-2b-agent-yn-web-search, le contexte « questions about recent public events » écarte d'avance s1 (fichiers chargés).
  - À l'inverse, les affirmations vraies sont souvent des quasi-citations de Learn (az900-2d s1 et s3, sc900-3b s1, dp900-4c s2). Elles sont faciles à reconnaître pour qui a lu le module.

Conséquence : il vaut mieux traiter en priorité les questions « difficulté 3 » et les questions dont la seule source est une page de documentation (pas une unité de formation), car c'est là que rédacteur et relecteur peuvent se tromper ensemble.

## 2. Les 12 écarts

Dans l'export, les options sont mélangées et renommées A, B, C… Les lettres citées par les relecteurs ne sont donc pas les `id` du YAML. Dans chaque cas, j'ai fait la correspondance à partir du champ `given`.

### AZ-900 (aucun rapport de production n'existe pour AZ-900 : rien à comparer)

**az900-2b-ep-private-benefit** — single, réponse `d` (« le trafic reste sur le réseau principal de Microsoft au lieu de l'internet public »).
- Remarque du relecteur : le trafic des VM Azure vers le point de terminaison public d'un compte de stockage reste déjà sur le réseau principal de Microsoft, donc ce n'est pas un avantage propre au point de terminaison privé. (Son « option A » est l'option `d` une fois les options mélangées.)
- Verdict : **ambiguïté réelle — à reformuler.** Le relecteur a raison. Learn, « Microsoft Global Network » : « any traffic between datacenters, within Microsoft Azure, or between Microsoft services such as Virtual Machines, … Storage, and virtual networks routes within our global network and never over the public internet » (https://learn.microsoft.com/en-us/azure/networking/microsoft-global-network). La page sur les points de terminaison privés du stockage décrit l'avantage autrement : une adresse IP privée du réseau virtuel, la possibilité de bloquer le point de terminaison public, la protection contre l'exfiltration, et l'accès depuis le réseau local par VPN ou ExpressRoute (https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints). La clé `d` reste la meilleure des quatre options, mais elle n'est pas distinctive.
- Proposition (option `d` et explication) :
  - EN option d : « The virtual machines reach the storage account through a private IP address of their virtual network, so access through the public endpoint can be blocked. »
  - FR option d : « Les machines virtuelles atteignent le compte de stockage par une adresse IP privée de leur réseau virtuel, si bien que l'accès par le point de terminaison public peut être bloqué. »
  - EN explanation : « A private endpoint gives the storage account an IP address from the virtual network. The traffic of the virtual machines travels over the virtual network and a private link, and the storage firewall can then deny access through the public endpoint. »
  - FR explication : « Un point de terminaison privé donne au compte de stockage une adresse IP du réseau virtuel. Le trafic des machines virtuelles passe par le réseau virtuel et une liaison privée, et le pare-feu du stockage peut alors refuser l'accès par le point de terminaison public. »
  - En profiter pour durcir un distracteur. Par exemple, remplacer `c` par « Clients on the internet can no longer reach the storage account, without any other configuration » / « Les clients sur internet ne peuvent plus joindre le compte de stockage, sans autre configuration ». C'est faux, car la création d'un point de terminaison privé ne bloque pas le point de terminaison public.

**az900-2c-red-yn-secondary** — yes/no, clé O/N/O, contestée sur s1 (« avec GRS, la région secondaire est la région qu'Azure jumelle à la région primaire »).
- Remarque du relecteur : c'est vrai seulement pour les régions jumelées ; dans une région non jumelée, Microsoft choisit la secondaire.
- Verdict : **remarque infondée** au regard de Learn. Le module AZ-900 dit : « Azure assigns the paired secondary region based on region pairs » (https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/3-redundancy). La documentation dit : « The paired secondary region is determined based on the primary region, and can't be changed », et elle limite la géoréplication à « many regions » (https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy). Aucune page ne parle d'une secondaire « choisie par Microsoft » hors jumelage. Point non vérifié, sans incidence sur la clé : la disponibilité de GRS dans chaque région non jumelée.
- Rapport de lot : aucun (AZ-900).

**az900-2d-did-statements** — yes/no, clé O/N/O, contestée sur s1 (« la sécurité physique … est la première ligne de défense du modèle »).
- Verdict : **remarque infondée.** C'est presque mot pour mot l'unité AZ-900 : « The physical security layer is the first line of defense to protect computing hardware in the datacenter » et « Physically securing access to buildings … are the first line of defense » (https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/8-describe-defense-depth). Pour Learn, le périmètre est la troisième couche, pas la première.
- Rapport de lot : aucun.

**az900-1c-paas-control-statements** — yes/no, clé N/N/O, contestée sur s3 (« Azure Functions est un exemple de service PaaS »).
- Verdict : **ambiguïté réelle — à reformuler. Point important : il touche la clé.** L'unité citée (« Describe Platform as a Service », https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/3-describe-platform-service) ne nomme pas Azure Functions. L'explication affirme pourtant que Functions est « one of the PaaS examples that Microsoft gives », ce qui n'est pas démontré. L'Architecture Center distingue trois modèles : « App Service and Container Apps are PaaS services », et « Functions as a service (FaaS) … Azure Functions is a FaaS service » (https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree). Avec cette source, s3 serait « Non ».
- Proposition : remplacer s3 par un service que Microsoft classe sans ambiguïté en PaaS.
  - EN s3 : « Azure App Service is an example of a PaaS service. »
  - FR s3 : « Azure App Service est un exemple de service PaaS. »
  - EN explanation (fin) : « Azure App Service, a managed hosting environment in which you deploy your application without managing virtual machines, is a PaaS service. »
  - FR explication (fin) : « Azure App Service, environnement d'hébergement managé où vous déployez votre application sans gérer de machines virtuelles, est un service PaaS. »
  - Ailleurs dans le contenu, la même affirmation se retrouve dans `az900-1c-iaas-example-service` (explication du distracteur « Azure Functions … classified as PaaS »), dans `az900-1c-use-workloads-hotarea` (« Azure App Service and Azure Functions are PaaS services ») et dans le chapitre `13-service-types` du cours (« Serverless offerings such as Azure Functions are usually classified as PaaS »). Les trois sont à aligner sur la décision du propriétaire (section 4).
- Rapport de lot : aucun.

### AI-901

**ai901-2a-throttling-max-tokens** — single, réponse `b` (« réduire le nombre maximal de jetons de sortie »).
- Remarque du relecteur : la limite TPM compterait l'estimation `max_tokens` ; c'est un détail fin du service.
- Verdict : **ambiguïté réelle — à reformuler. Point important.** Le relecteur s'appuie sur un fonctionnement que la documentation actuelle contredit, et l'explication de la question reprend la même idée. Page « Manage Azure OpenAI … quota » (ms.date 2026-05-04) : « Token rate-limit calculations use actual input and generated tokens rather than the maximum output-token value configured in the request. Setting a higher output-token limit doesn't reserve that number of tokens against the TPM limit » (https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/quota). L'unité de formation citée dit au contraire : « higher max output token settings consume more TPM … If you see throttling, lower max tokens or reduce concurrent requests » (https://learn.microsoft.com/en-us/training/modules/get-started-with-generative-ai-and-agents/2-generative-ai-models). La clé `b` tient dans les deux lectures, mais seulement si les réponses sont longues : plafonner la sortie réduit alors les jetons réellement générés. L'explication actuelle est fausse selon la documentation.
- Proposition :
  - EN stem (ajout avant la question) : « Most responses are long, although the application uses only a short answer. »
  - FR énoncé : « La plupart des réponses sont longues, alors que l'application n'utilise qu'une réponse courte. »
  - EN explanation : « The TPM limit counts the input tokens and the tokens that the model actually generates. Lowering the max output tokens value caps the length of each response, so each request consumes fewer tokens and the deployment stays under its limit more often. »
  - FR explication : « La limite TPM compte les jetons d'entrée et les jetons que le modèle génère réellement. Réduire le nombre maximal de jetons de sortie plafonne la longueur de chaque réponse : chaque requête consomme moins de jetons et le déploiement reste plus souvent sous sa limite. »
  - Le même problème touche `ai901-1c-throttling-remedies` (clé b+d, explication « a higher max output tokens setting consume[s] more of the TPM »).
- Rapport de lot : Q-ai-901-2a.md signale seulement le chevauchement avec l'objectif 1.2.3, pas la contradiction. C'est Q-ai-901-1c.md qui l'a relevée, pour la question sœur, avec la même conclusion (« the answer holds either way »).

**ai901-2b-agent-yn-web-search** — yes/no, clé N/O/N, contestée sur s3 (« la recherche web générale exige une ressource Bing distincte »).
- Remarque du relecteur : tout dépend de l'outil visé, « Web search » ou « Grounding with Bing Search ».
- Verdict : **remarque infondée.** L'énoncé nomme l'outil **Web search**, et s3 parle de « general web search ». La page de l'outil le dit en toutes lettres : « General Web Search — … without a separate Bing resource or project connection », et l'outil « doesn't require a toolbox or a separate Bing project connection ». Seuls l'outil Bing Custom Search et les outils `bing_grounding` demandent une connexion (https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/web-search). Les citations d'URL (s2) sont confirmées (`url_citation`). Si l'on veut lever tout doute, on peut préciser en s3 : « General web search with the Web search tool requires … » / « La recherche web générale avec l'outil Web search exige … ».
- Rapport de lot : oui, Q-ai-901-2b.md cite explicitement s3 et sa source.

**ai901-2b-text-language-endpoint** — single, réponse `b` (`https://adatum-ai.cognitiveservices.azure.com/`).
- Remarque du relecteur : une ressource Foundry expose aussi un point de terminaison `services.ai.azure.com` utilisable par Language. (Son « D » est l'option `b`.)
- Verdict : **remarque infondée.** La seule option en `services.ai.azure.com` est `c`, et c'est un point de terminaison de **projet** (`/api/projects/text`), celui d'`AIProjectClient`, pas celui de la ressource. L'unité Learn montre `AZURE_LANGUAGE_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/` passé à `TextAnalyticsClient` (https://learn.microsoft.com/en-us/training/modules/get-started-text-analysis-azure/3-language-sdk). Aucune option ne propose la racine `services.ai.azure.com` de la ressource, donc pas d'ambiguïté parmi les choix proposés.
- Rapport de lot : non signalé dans Q-ai-901-2b.md.

### DP-900

**dp900-4c-model-design-yn** — yes/no, clé O/O/N, contestée sur s3 (« les totaux de chaque niveau d'une hiérarchie sont calculés pendant l'actualisation et stockés »).
- Remarque du relecteur : le texte Learn de DP-900 décrirait des valeurs pré-agrégées par niveau.
- Verdict : **remarque infondée.** L'unité a été réécrite (ms.date 2026-10-12) : « When you import data into a semantic model (Import mode), Power BI stores it in an efficient in-memory columnar store … Aggregations are calculated at query time », et « the model computes aggregated values at each level at query time » (https://learn.microsoft.com/en-us/training/modules/explore-fundamentals-data-visualization/3-data-modeling). Le relecteur cite l'ancienne version. Il reste un risque : les anciennes formulations circulent encore et l'examen réel peut avoir du retard sur Learn (section 4).
- Rapport de lot : Q-dp-900-4c.md ne signale rien. Q-dp-900-1b.md a relevé le même piège pour `dp900-1b-an-olap-yn` (formulé avec « OLAP cube » pour l'éviter).

**dp900-2a-norm-benefits** — multi, réponse `b` + `d`.
- Remarque du relecteur : `d` (« chaque valeur est limitée au type de données de sa colonne ») serait une propriété des tables relationnelles plutôt qu'un effet de la normalisation. (Ses « C » et « E » sont `b` et `d`.)
- Verdict : **remarque infondée.** Learn le présente comme un effet de la normalisation : « The decomposition of attributes into individual columns ensures that each value is constrained to an appropriate data type » (https://learn.microsoft.com/en-us/training/modules/explore-relational-data-offerings/3-normalization). La question est en revanche facile par élimination (section 1).
- Rapport de lot : non signalé dans Q-dp-900-2a.md.

### SC-900

**sc900-4a-portal-home-yn** — yes/no, clé N/O/O, contestée sur s3 (« le portail liste des portails associés … »).
- Verdict : **remarque infondée.** C'est documenté : « You can access the following management and resource portals by selecting **Solutions** > **Related portals** in the left navigation: Microsoft Defender, Microsoft Entra, Microsoft Fabric, Microsoft Priva, Microsoft Service Trust » (https://learn.microsoft.com/en-us/purview/purview-portal). Une petite correction de l'explication est à faire : elle situe la liste sur « Its Solutions page / Sa page Solutions ». Écrire plutôt « Under Solutions > Related portals in the left navigation » / « Sous Solutions > Portails associés (Related portals) dans le volet de navigation gauche ».
- Rapport de lot : oui, Q-sc-900-4a.md signale que la liste vient de la page du portail et que les menus changent souvent.

**sc900-1a-did-layers-yn** — yes/no, clé N/O/N, contestée sur s2 (« fermer les ports réseau inutilisés d'une VM est un contrôle de la couche calcul »).
- Verdict : **remarque infondée.** L'unité SC-900 range ce contrôle dans la couche calcul : « Compute security … includes keeping operating systems and software patched and up to date, closing unnecessary network ports, restricting administrative access » (https://learn.microsoft.com/en-us/training/modules/describe-security-concepts-methodologies/3-describe-defense-depth). s3 est aussi conforme (« input validation to prevent … SQL injection » relève de la couche application).
- Rapport de lot : non signalé dans Q-sc-900-1a.md.

**sc900-3b-kv-trust-yn** — yes/no, clé O/O/N, contestée sur s1 (« Key Vault réplique le contenu d'un coffre dans sa région et vers une région secondaire »).
- Verdict : **ambiguïté réelle — à reformuler.** L'unité SC-900 le dit sans réserve (https://learn.microsoft.com/en-us/training/modules/describe-basic-security-capabilities-azure/8-describe-ways-azure-encrypts-data). La page de fiabilité est plus précise : « If the region has a paired region and that paired region is in the same geography … the contents are also replicated to the paired region ». Elle exclut Brazil South, Brazil Southeast, West US 3 et « any region that doesn't have a paired region » (https://learn.microsoft.com/en-us/azure/reliability/reliability-key-vault). La clé « Oui » colle à l'unité, mais l'affirmation est trop générale.
- Proposition :
  - EN s1 : « In most regions that have a paired region, Azure Key Vault replicates the contents of a vault within the region and to the paired region. »
  - FR s1 : « Dans la plupart des régions qui ont une région jumelée, Azure Key Vault réplique le contenu d'un coffre dans la région et vers la région jumelée. »
  - Ajuster l'explication de la même façon (« within the region and, in most paired regions, to the paired region » / « dans la région et, dans la plupart des régions jumelées, vers la région jumelée ») et ajouter la page de fiabilité aux références.
  - Même affirmation dans l'explication d'un distracteur de `sc900-3b-kv-vault-per-app` (« Key Vault already replicates its contents to a secondary region by itself »).
- Rapport de lot : Q-sc-900-3b.md classe la question en « difficile » mais ne signale pas ce point.

## 3. Points signalés par les rapports de production

Repère : **[clé]** = point qui peut changer une clé de réponse, à trancher avant la relecture humaine.

### AZ-900

Aucun rapport (`ls factory/reports | grep az-900` ne renvoie rien). On ne sait donc rien des faits non vérifiés, des écarts fr-fr ou des choix de terminologie de ce lot. Les quatre écarts de la section 2 sont les seuls signaux disponibles, et deux d'entre eux (Functions en PaaS, avantage du point de terminaison privé) sont des ambiguïtés réelles.

### AI-901

**Fait non vérifié**
- Q-ai-901-2a : `ai901-2a-auth-input-yn`, une entrée `input` de type chaîne traitée comme l'invite utilisateur ; Learn ne précise pas son rôle. **[clé]**
- Q-ai-901-2a : `ai901-2a-chat-session-yn` (New chat efface l'historique) et le libellé « Instructions » ne reposent que sur le lab et le cours. **[clé]**
- Q-ai-901-2a : distracteurs de `ai901-2a-sdk-packages` non vérifiés ; clés API sur le point de terminaison de projet non vérifiées (non utilisé).
- Q-ai-901-2b : version d'agent résolue par une référence par nom, non vérifiée (aucune question n'en dépend) ; `ai901-2b-audio-text-only-output`, pas d'exemple `modalities=["text"]` ; `ai901-2b-audio-speech-vs-model`, cadrage tiré du chapitre 22, pas de Learn.
- Q-ai-901-1a : `priv-redact-chat-text` (explications des distracteurs NER et expressions clés), `priv-dd-key-storage` (connaissance générale), `fair-approval-by-group` (chiffres inventés).
- Q-ai-901-1b : `model-spoken-input`, entrée audio de Phi-4-multimodal-instruct déduite d'une ligne de tableau qui regroupe trois modèles **[clé]** ; `transp-citations`, aucune phrase Learn ne dit que les citations relèvent de la transparence **[clé]** ; `account-yn-classify` s2 s'appuie sur une page Azure Machine Learning.
- Q-ai-901-2c : `visionapp-why-base64` (connaissance générale) ; identifiants de distracteurs non vérifiés (`PushAudioInputStream`, `base64.encodebytes`, `response.id`…).
- Q-ai-901-2d : `ai901-2d-img-text-heavy`, un conseil de Learn transformé en réponse attendue (`prebuilt-document`) **[clé]** ; `ai901-2d-app-entra-role`, raison donnée par connaissance générale RBAC ; `ai901-2d-app-client-class` et `ai901-2d-app-package`, distracteurs écrits de mémoire.
- C-ai-901-1 : sens de l'événement `recognized` déduit des noms de gestionnaires ; exemples de schémas du chapitre 24 illustratifs ; expiration de la certification et nombre de questions non vérifiés.

**Écart en-us/fr-fr**
- C-ai-901-1, Q-ai-901-2a, 2b : la page fr-fr écrit « API Réponses », le contenu garde « API Responses ».
- Q-ai-901-2a, 2b, 2c, C-ai-901-1 : les pages fr-fr traduisent les libellés du portail (« Comparer les modèles », « Outils »…), le contenu les garde en anglais.
- Q-ai-901-1a : fr-fr « équité » contre « impartialité » (guide d'étude) ; « légendes » contre « sous-titres » ; principes de conception inclusive mal traduits automatiquement.
- Q-ai-901-1c : fr-fr « haut-parleurs » (erreur pour « interlocuteurs »), « tonalité » contre « hauteur », « abstrait/abstractif ».
- Q-ai-901-1d, 2c : fr-fr « modèles modals », « requête » pour prompt, « texte à image » ; Q-ai-901-2d : « mise à la terre » pour grounding.
- Q-ai-901-2a : page fr-fr du prompt engineering traduite automatiquement (« Zéro tir », « biais de récurrence »).

**Terminologie française**
- Libellés du portail laissés en anglais dans tout le français (2a, 2b, 2c, 2d, C-ai-901-1) : à décider une fois pour toute la banque.
- « impartialité / inclusion / responsabilité » (guide d'étude) contre « équité / inclusivité » (Learn) (1a, 1b, C).
- « résumé » contre « synthèse » (guide d'étude) (C).
- Traductions propres, non vérifiées sur fr-fr : « note de transparence », « mention affichée dans le produit » (1b) ; « invites contradictoires », « évaluateurs de risque et de sécurité » (1a).
- « unités de débit approvisionné (PTU) » contre « provisionnées » (1c) ; « service back-end » (2c).

**Référentiel / guide d'étude**
- 2.2.2 (invites vocales avec un modèle multimodal) n'est couvert par aucune unité du parcours : écrit à partir d'un quickstart (C-ai-901-1, Q-ai-901-2b). **[clé]** : la surface d'API de l'examen peut être différente.
- Le parcours AI-901 n'a pas d'unité sur l'IA responsable : les principes sont écrits depuis d'autres modules (1a, 1b).
- Contenu au-delà du parcours (garde-fous Foundry, Key Vault, PII en 1a ; encodeur/décodeur en 1b ; diarisation, liste d'expressions en 1c ; `dd-field-methods` en 1d ; `previous_response_id` en 2a ; questions difficiles de 2c et 2d) : à garder ou retirer selon la portée voulue.
- Noms de modèles qui vieillissent (GPT-6 déjà listé, GPT-Image-2/2.5, `dall-e-3` retiré le 2026-03-04) (1b, 1d, 2c, C).
- Analyse de sentiment, expressions clés et résumé passent en « legacy » (retrait du 31/03/2029) (1c, 2b) ; Azure Vision Image Analysis obsolète (1d).
- Chevauchements : 2a avec 1.2.3 (`throttling-max-tokens`, `deployment-settings-dd`) ; 1d `text-heavy-image-document` avec 2.4.2.

**Autre (sources Learn contradictoires, technique)**
- Limitation (throttling) : l'unité de formation dit que `max_tokens` consomme du TPM, la page de quota dit que seuls les jetons réels comptent (Q-ai-901-1c, `ai901-1c-throttling-remedies`). Confirmé par l'écart `ai901-2a-throttling-max-tokens`. **[clé]**
- API vidéo : `/openai/v1/videos` avec le statut `completed` (unité) contre `/video/generations/jobs` avec `succeeded` (documentation) ; `visionapp-video-rest-yn` et `videogen-async-job-sentences` suivent l'unité (2c). **[clé]**
- Clé de référence d'agent `agent` contre `agent_reference` (2b, C) ; point de terminaison `/openai/v1/` contre `/openai` (2a) ; chemin vers le catalogue Discover contre Build (2a, C) ; nom du catalogue (1b).
- Limites d'images différentes entre pages (10 / 20 Mo contre 50 / 512 Mo), non utilisées (2c) ; noms des champs de facture (2d).
- Python : `language: python` utilisé, mais absent de `LANGUAGES` dans `lib/markdown.ts`, donc aucune coloration (2b, 2c, 2d). Les titres de référence mélangent H1 et `<title>` selon les lots (2a, 2b, 1d, 2d).

### DP-900

**Fait non vérifié**
- Q-dp-900-1a : « pas lisible par l'homme » pour Parquet et Delta Lake (`dp900-1a-fmt-readable-multi`) : connaissance générale, pas une phrase Learn. **[clé]**
- Q-dp-900-3b : `dp900-3b-api-table-global`, distracteur RA-GRS (« une copie lisible dans la seule région jumelée ») non vérifié dans ce lot.
- Q-dp-900-4a : `store-delta-lake-format`, Avro « row-based » repris du chapitre 12 sans nouvelle vérification.
- Q-dp-900-4b : `rt-iot-hub` (pas de comparaison avec Event Hubs sur la page), `rt-kafka` (descriptions des distracteurs), `pbi-tile` et `pbi-scheduled-refresh` (signets, abonnements) ; titres de référence tirés d'un résumé WebFetch, à vérifier au caractère près.
- Q-dp-900-1b : unité MySQL/PostgreSQL non récupérée ; deux questions ne reposent que sur « Identify data services » et la vue d'ensemble PostgreSQL.
- Q-dp-900-3a : noms français de la redondance donnés de mémoire.
- C-dp-900-1 : ORC mentionné sans vérification (une phrase, à retirer si l'on s'en tient au périmètre Learn).

**Écart en-us/fr-fr**
- C-dp-900-1 : fr-fr affiche encore un SLA de 99,99 % (ancien texte), absent en en-us ; traductions automatiques (« clé row », « Tempéré »/« Sporadique »).
- Q-dp-900-2b : fr-fr « restauration à un moment donné », « sans serveur », « serveur managé (logique) », contre les choix du cours.
- C-dp-900-2, Q-dp-900-3b : fr-fr « Azure Cosmos DB pour NoSQL », « entièrement géré ».
- Q-dp-900-4c : fr-fr « vue Model », « schéma flocon de neige », « Importation / Double ».
- Q-dp-900-1c : fr-fr « applications de ligne de business » ; Q-dp-900-1a : « basé sur les lignes », « crochets » pour les chevrons.

**Terminologie française**
- Pas de glossaire DP-900 : les choix des chapitres (C-dp-900-1, C-dp-900-2) et des lots 2b et 4b pourraient en servir de base.
- « restauration à un point dans le temps », « serverless », « serveur logique » (2b) ; noms d'API Cosmos DB en anglais (C-2, 3b) ; « histogramme », « segment (slicer) », « carte » contre « carte géographique » (C-2, 4c) ; noms des éléments Fabric en anglais (C-2, 4a, 4b).
- Termes Power BI de 4b non vérifiés sur fr-fr (« Éditeur Power Query », « signet », « abonnement »…).

**Référentiel / guide d'étude**
- Guide d'étude au 21/07/2026 (C-1, C-2, 1c).
- Synapse et HDInsight ne sont plus enseignés (C-2, 4a) ; MariaDB retiré (C-1, 2b) ; Cosmos DB for PostgreSQL en voie de retrait (C-2, 2b, 3b).
- Services hors des deux services d'analytique nommés par le guide (Data Factory, Stream Analytics, Data Explorer, Purview) utilisés dans 6 questions de 1c ; DirectQuery, Dual, cardinalité, graphiques à bulles et combinés, vue de requête DAX au-delà de l'unité (4c).
- « smart tier », cinquième niveau d'accès dans la documentation, alors que l'unité en compte quatre : la question d'ordonnancement de 3a contourne le problème. **[clé]**
- Redondance désormais dans l'unité blob, absente du chapitre 31 (3a) ; « Azure Data Lake Storage » contre « … Gen2 » (1b contre 3a et chapitre 12).
- Table storage « semi-structured » (unité) contre « structured » (documentation) (3a) ; SELECT classé en DML (C-1, 2a).
- Date de retrait du visuel Q&R contradictoire (décembre 2026 / février 2027), donc non utilisé (C-2, 4b, 4c).

**Autre**
- Modèle analytique pré-agrégé (cube OLAP) contre agrégation au moment de la requête (modèle sémantique) : 1b a évité le piège. L'unité est maintenant explicite (voir `dp900-4c-model-design-yn`). **[clé]** si d'autres questions parlent encore de valeurs pré-agrégées.
- Alertes : « pas d'alertes sur les rapports » contre alertes Activator sur les visuels de rapport (4b).
- Nommage Lakeflow (4a) ; écarts de répartition par type dans 1a, 1b, 1c, 4a, 4b ; peu d'objets en 2.1.4, d'où un risque de tirer deux questions sur les index (2b).

### SC-900

**Fait non vérifié**
- C-sc-900-1 : chapitre 00 (descriptions courtes de produits), « report-only », association « risque de connexion → MFA, risque utilisateur → mot de passe » (non associée sur la page ID Protection).
- C-sc-900-2 : Safe Links « au moment du clic », Safe Attachments « avant la remise ».
- Q-sc-900-1b, 2b, 2c, 3a, 4b : explications de distracteurs écrites d'après le cours ou la connaissance générale (serveur membre, PHS/PTA, Password Protection, MITRE/NIST, Compliance Manager…).
- Q-sc-900-3c : `xdr-incident-alerts`, « leaked credentials » détecté par ID Protection, d'après le chapitre 24.
- Q-sc-900-4b : `rec-regulatory`, l'administrateur du site peut retirer l'étiquette d'un enregistrement verrouillé : à revérifier sur le tableau. **[clé]**
- Q-sc-900-4a : aucune page fr-fr lue (limite de requêtes atteinte), terminologie non vérifiée.

**Écart en-us/fr-fr**
- Zero Trust : fr-fr « Confiance nulle » / « Confiance Zéro », « Utiliser l'accès au privilège minimum », « Supposons la violation » (C-1, 1a).
- Report-only : fr-fr « mode rapport uniquement » contre « mode rapport seul » dans le cours (2b) ; rôles traduits sur fr-fr (2b).
- Arrivées/mutations/départs traduits automatiquement (« Déplaceur ») ; « Protection des ID Microsoft Entra » ; « Connexions risquées » (2c).
- Defender : fr-fr « chasse avancée », « règles d'analytique », « ERA » ; noms de produits laissés en anglais dans certaines unités (3c, 3d).
- Purview : « conservation » pour hold, « révision avant destruction », « info-bulle de stratégie », « plan de classement », « preuve de la disposition » (C-2, 4b).

**Terminologie française**
- Pas de glossaire SC-900 (C-2) ; noms de produits selon `objectives.yaml`.
- Forme du nom : « Microsoft Entra ID Protection » (3c, `objectives.yaml`) contre « Protection Microsoft Entra ID » (chapitre 24, 2c), à harmoniser.
- « approvisionnement » contre « provisionnement » (cours) ; « comptes d'utilisateur » contre « comptes d'utilisateurs » (1a) ; « approuver » contre « fait confiance à » (1b).
- « balise de service » contre « étiquette de service » (glossaire AZ-104) (3a) ; « réseaux virtuels reliés par peering » contre « appairés » (3b).
- « Degré de sécurisation Microsoft » contre « score de sécurité » (C-2, 3d) ; « repérage » contre « chasse » (3c, 3d).

**Référentiel / guide d'étude**
- Plan du 21/10/2026 (C-1, C-2).
- 3.4.7 Microsoft Threat Intelligence : l'unité enseigne encore Intel profiles et Intel projects, absents de la nouvelle documentation. Le cours les enseigne, la banque non (C-2, 3d). **[clé]** pour le cours.
- 4.1.2 : quatre principes de confidentialité (unité actuelle) contre six (ancienne liste) ; la banque suit les quatre (C-2, 4a). **[clé]** si l'examen n'est pas à jour.
- 2.1.3 : PHS, PTA et fédération ne sont plus dans l'unité, mais 6 questions de 2a les testent. Décision de périmètre nécessaire.
- « Require approved client app » retiré en mars 2026 : le chapitre 23 l'enseigne encore (2b). **[clé]** (cours à corriger).
- Anciennes stratégies de risque d'ID Protection retirées le 01/10/2026 ; Learn recommande « Require risk remediation », la banque garde « secure password change » (2c). **[clé]**
- « Conditional Access app control » (documentation, cours) contre « adaptive access control » (unité 3.4.4) (3c). **[clé]**
- Defender for Identity élargi à Entra ID et Okta (3c, 3d) ; emplacement de la gestion des vulnérabilités dans le portail (3d) ; modèle de score d'exposition en cours de remplacement (`mdvm-scores-direction`) (3d). **[clé]**
- Content explorer devenu « (classic) », remplacé par Data explorer (C-2, 4a) ; modèle de responsabilité partagée de l'IA et réponses au risque absents du cours (1a) ; identités d'agent (C-1, 1a) ; smart lockout absent de l'unité (2b).

**Autre (sources Learn contradictoires)**
- Responsabilité partagée : la matrice de la documentation (« Client devices = Shared » en SaaS) contredit l'unité ; `shared-retained-yn` s2 est exposé (C-1, 1a). **[clé]**
- IDPS : Standard et Premium (paragraphe Security Copilot de l'unité) contre Premium seul (reste des sources) ; `fw-tiers-yn` suit Premium (3a). **[clé]**
- Foundational CSPM gratuit par défaut (unité) contre pas de plan gratuit dans le portail Defender (documentation) ; `cspm-plans-complete`, `cspm-basics-yn` (3b). **[clé]**
- Conformité réglementaire : MCSB dans Foundational CSPM contre Defender CSPM seul (C-2, 3b) ; deux modèles de secure score (3b).
- Authenticator push méthode principale oui/non (C-1, 2a), aucune question n'en dépend ; catégories du portail Purview (C-2, 4a) ; Unified Catalog contre Data Catalog (4a).
- Connecteur RH devenu facultatif pour « Data theft by departing users », alors que le chapitre 44 dit qu'il est utilisé (4b) ; héritage d'étiquette par Copilot (`sl-copilot-inherit`) (4b).
- Bastion : « tiers » contre « SKU » (3b) ; casse des noms de règles NSG (3a) ; indices croisés au sein de 3a (`waf-complement-yn` aide pour `waf-front-door-global`) ; chevauchements 2b/1b et 4a/4b non comparés.

## 4. À trancher par le propriétaire

1. **Azure Functions en PaaS ou non (AZ-900)** : l'Architecture Center le classe en FaaS, à part du PaaS, et l'unité PaaS ne le cite pas. Décision à appliquer à `az900-1c-paas-control-statements`, `az900-1c-iaas-example-service`, `az900-1c-use-workloads-hotarea` et au chapitre 13.
2. **Limitation TPM (AI-901)** : suivre l'unité de formation (`max_tokens` consomme du TPM) ou la page de quota (seuls les jetons réels comptent). Concerne `ai901-2a-throttling-max-tokens` et `ai901-1c-throttling-remedies`.
3. **Unité de formation contre documentation, règle générale** : quand elles se contredisent (responsabilité partagée, IDPS, Foundational CSPM, réplication de Key Vault, API vidéo Sora, stratégies de risque), quelle source fait foi pour la banque ?
4. **Versions du référentiel** : DP-900 (guide du 21/07/2026), SC-900 (plan du 21/10/2026), AI-901 (2.2.2 sans unité Learn). Faut-il suivre l'unité Learn actuelle quand elle a changé (4 principes de confidentialité, Threat Intelligence, Content explorer, PHS/PTA retirés de 2.1.3, agrégation au moment de la requête en DP-900), au risque d'un examen en retard sur Learn ?
5. **Périmètre strict ou large** : questions au-delà du guide d'étude signalées par AI-901 1a/1b/1c/1d/2a/2d, DP-900 1c/4c et SC-900 2a/3c/3d. Lesquelles garder ?
6. **Libellés du portail en anglais dans le français** (toute la banque AI-901, les nœuds de portail SC-900).
7. **Noms des principes d'IA responsable** : « impartialité / inclusion / responsabilité » (guide d'étude) ou « équité / inclusivité » (Learn fr-fr). Et « API Responses » ou « API Réponses ».
8. **Glossaires DP-900 et SC-900 à créer**, avec en premier : « restauration à un point dans le temps » ou « à un moment donné », « serverless » ou « sans serveur », « Azure Data Lake Storage » avec ou sans « Gen2 », « Microsoft Entra ID Protection » ou « Protection Microsoft Entra ID », « mode rapport seul » ou « rapport uniquement », « approvisionnement » ou « provisionnement », « balise » ou « étiquette de service », et les termes Purview (mise en attente, ensemble de révision, révision de destruction, plan de fichiers, conseil de stratégie).
9. **AZ-900 sans rapport de production** : faut-il faire relever après coup les faits non vérifiés de ce lot avant la relecture humaine ?
