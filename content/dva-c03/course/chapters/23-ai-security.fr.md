Les questions de sécurité de l'IA décrivent une application qui envoie des données à un modèle ou laisse un agent appeler des outils, et un risque : une identité qui a trop d'accès, des invites qui quittent le VPC ou la zone géographique, des PII dans les invites, les réponses ou les journaux, une injection d'invite (prompt injection), ou un agent qui agit sans approbation. La réponse est un contrôle appliqué dans le code ou la configuration : conditions IAM et SCP, points de terminaison de VPC, Amazon Bedrock Guardrails, fonctionnalités d'Amazon Bedrock AgentCore, étapes d'approbation et protection des journaux. Concevoir des cadres de garde-fous ou choisir des modèles est hors du périmètre ; les appliquer en fait partie.

<!-- section: ai-access | objectives: 2.3.1 -->
## Demander et gérer l'accès aux services d'IA

Dans les Régions commerciales, la plupart des modèles serverless d'Amazon Bedrock sont **activés automatiquement** : il n'y a aucune demande d'accès. Le premier appel `InvokeModel` ou `Converse` démarre en arrière-plan un abonnement AWS Marketplace, qui peut mettre jusqu'à 15 minutes à se finaliser.

| Élément | Règle |
| --- | --- |
| Invoquer un modèle | `bedrock:InvokeModel` (utilisé aussi par `Converse`) et `bedrock:InvokeModelWithResponseStream` (streaming) sur l'ARN du modèle ou du profil d'inférence |
| Première utilisation d'un modèle tiers dans le compte | L'identité qui la déclenche a besoin de `aws-marketplace:Subscribe`, `aws-marketplace:Unsubscribe`, `aws-marketplace:ViewSubscriptions`, et le compte d'un moyen de paiement valide ; les appelants suivants n'ont besoin que des autorisations d'invocation |
| Modèles Anthropic antérieurs à Claude Opus 4.7 | Un formulaire de première utilisation unique par compte (ou une fois dans le compte de gestion de l'organisation) ; tant qu'il n'est pas `AVAILABLE`, les appels renvoient `AccessDeniedException` |
| Empêcher l'usage d'un modèle | Refuser `bedrock:InvokeModel` (ou `bedrock:*`) sur son ARN dans une SCP ou une politique IAM ; supprimer seulement l'accord du modèle ne le bloque pas |
| Profil d'inférence interrégional | Autoriser le profil et les Régions de destination ; une SCP qui refuse des Régions doit autoriser toutes les Régions d'un profil géographique |
| AWS GovCloud (US) | La page d'accès aux modèles sert encore à activer les modèles |

Préférez les rôles et SigV4 pour appeler Bedrock. Les **clés d'API Amazon Bedrock** existent pour les outils qui exigent un jeton porteur (`Authorization: Bearer`, ou la variable `AWS_BEARER_TOKEN_BEDROCK`) :

| Clé | Durée de vie | Usage |
| --- | --- | --- |
| Court terme | Jusqu'à 12 heures ou la durée de la session, dans une Région ; hérite des autorisations du principal qui la génère | Production quand un jeton porteur est exigé |
| Long terme | Jusqu'à sa date d'expiration ; attachée à un utilisateur IAM dédié | Exploration uniquement |

Contrôlez-les avec `iam:CreateServiceSpecificCredential` (avec `iam:ServiceSpecificCredentialAgeDays` pour plafonner l'ancienneté) et `bedrock:CallWithBearerToken` (refusez-le pour interdire les clés d'API ; `bedrock:bearerTokenType` cible un type). Les agents hébergés sur AgentCore s'invoquent avec `bedrock-agentcore:InvokeAgentRuntime`, les passerelles avec `bedrock-agentcore:InvokeGateway`, chacun limité à l'ARN de la ressource.

> **Piège d'examen.** « Demander l'accès au modèle sur la page Model access » est dépassé hors de GovCloud. Si un nouveau modèle renvoie `AccessDeniedException`, cherchez des autorisations Marketplace manquantes, le formulaire de cas d'usage Anthropic, un refus de SCP ou une condition IAM (`aws:SourceIp` est absent des requêtes qui passent par un point de terminaison de VPC).

<!-- section: ai-data-privacy | objectives: 2.3.2 -->
## La confidentialité des données envoyées aux services d'IA

Les engagements d'Amazon Bedrock répondent à « nos invites vont-elles entraîner le modèle ? » :

| Engagement | Détail |
| --- | --- |
| Pas d'entraînement sur vos données | Les entrées et sorties ne servent pas à entraîner ni à améliorer les modèles de base |
| Pas de partage avec les fournisseurs de modèles | Les modèles s'exécutent dans des comptes de déploiement de modèles détenus par l'équipe du service Bedrock ; les fournisseurs n'ont accès ni aux invites, ni aux réponses, ni aux journaux |
| Région | Le contenu est stocké au repos dans la Région de l'appel ; les modèles personnalisés restent dans cette Région |
| Chiffrement | Toujours en transit (TLS 1.2 exigé) et au repos ; clés KMS gérées par le client facultatives pour des ressources comme les modèles personnalisés |

La **connectivité privée** utilise des points de terminaison de VPC d'interface (AWS PrivateLink), pour que des instances sans IP publique, sans NAT ni passerelle Internet atteignent Bedrock :

| Service de point de terminaison `com.amazonaws.<region>.*` | API |
| --- | --- |
| `bedrock-runtime` | `InvokeModel`, `Converse`, `ApplyGuardrail` |
| `bedrock` | Plan de contrôle (créer des garde-fous, lister les modèles) |
| `bedrock-agent-runtime`, `bedrock-agent` | API des bases de connaissances et des agents |
| `bedrock-mantle` | Point de terminaison compatible OpenAI |

Avec le DNS privé activé, le SDK garde son nom de point de terminaison par défaut, sans changement de code. Une **politique de point de terminaison** limite ce qui passe par le point de terminaison (un ARN de modèle, une action), et une politique IAM avec `aws:SourceVpce` ou `aws:SourceVpc` rend Bedrock utilisable uniquement par le point de terminaison :

```json
{
  "Effect": "Deny",
  "Action": "bedrock:*",
  "Resource": "*",
  "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f67890" } }
}
```

**Résidence des données** : un profil d'inférence interrégional géographique (par exemple US ou EU) garde le traitement dans sa zone géographique ; un profil global peut router vers n'importe quelle Région commerciale prise en charge. Le trafic entre Régions reste sur le réseau AWS, chiffré. CloudTrail enregistre l'appel dans la Région source, avec la Région de traitement dans `additionalEventData.inferenceRegion`.

> **Piège d'examen.** « Les données des clients européens ne doivent être traitées que dans l'UE » exclut un profil d'inférence global : utilisez un ID de modèle dans la Région ou un profil géographique EU, et autorisez ses Régions dans la SCP.

<!-- section: ai-input-output-filtering | objectives: 2.3.3 -->
## Filtrer les entrées et les sorties des modèles

**Amazon Bedrock Guardrails** évalue les invites et les réponses avec des politiques configurables :

| Politique | Ce qu'elle fait | Actions |
| --- | --- | --- |
| Filtres de contenu | Haine, insultes, contenu sexuel, violence, inconduite, avec une intensité `NONE`, `LOW`, `MEDIUM`, `HIGH` par catégorie, en entrée et en sortie | Bloquer, ou seulement détecter |
| Attaque par invite (catégorie de filtre de contenu, entrée uniquement) | Jailbreaks, injection d'invite et fuite d'invite (niveau Standard) | Bloquer, ou seulement détecter |
| Sujets refusés (denied topics) | Sujets définis en langage naturel que l'application ne doit pas aborder | Bloquer |
| Filtres de mots | Mots et expressions exacts, liste gérée de grossièretés | Bloquer |
| Filtres d'informations sensibles | Types de PII (`EMAIL`, `NAME`, `US_SOCIAL_SECURITY_NUMBER`, `AWS_SECRET_KEY`...) et expressions régulières personnalisées, avec des actions distinctes en entrée et en sortie | `BLOCK`, `ANONYMIZE` (masquer en `{EMAIL}`), `NONE` (détecter) |
| Vérification de l'ancrage contextuel (contextual grounding) | Réponses non fondées sur la source ou hors sujet par rapport à la question | Bloquer ou signaler |
| Vérifications par raisonnement automatisé (Automated Reasoning checks) | Réponses contrôlées par rapport à des règles logiques que vous définissez | Valider |

Appliquez un garde-fou de trois façons :

| Méthode | Quand |
| --- | --- |
| `guardrailConfig` dans `Converse` (`guardrailIdentifier`, `guardrailVersion`, `trace`), ou en-têtes sur `InvokeModel` | Chaque appel de modèle ; vérifiez que `stopReason` vaut `guardrail_intervened` |
| `ApplyGuardrail` avec `source` à `INPUT` ou `OUTPUT` | Contrôler du texte sans invoquer de modèle Bedrock : un autre modèle, des documents récupérés, des résultats d'outils |
| Imposé par IAM : refuser `bedrock:InvokeModel` sauf si `bedrock:GuardrailIdentifier` vaut l'ARN du garde-fou approuvé | Les développeurs ne peuvent pas contourner le garde-fou |

Le **balisage des entrées** est indispensable à la détection des attaques par invite : encadrez l'entrée utilisateur par `guardContent` (Converse) ou par les balises `amazon-bedrock-guardrails-guardContent_xyz` (InvokeModel) pour que l'invite système du développeur ne soit pas signalée. Sans balises, les attaques par invite ne sont pas filtrées.

```python
# Python (boto3): check a tool result before giving it back to the model
check = runtime.apply_guardrail(
    guardrailIdentifier="gr-support", guardrailVersion="3",
    source="INPUT", content=[{"text": {"text": tool_output}}])
if check["action"] == "GUARDRAIL_INTERVENED":
    tool_output = check["outputs"][0]["text"]
```

> **Piège d'examen.** Les garde-fous n'évaluent ni les définitions d'outils ni les résultats d'outils (`toolResult`), et les filtres d'informations sensibles n'analysent pas l'entrée `toolUse`. Une injection d'invite indirecte par une page web ou un document renvoyé par un outil exige un appel explicite à `ApplyGuardrail` sur ce contenu, plus le moindre privilège sur les outils.

<!-- section: ai-agent-security | objectives: 2.3.4 -->
## Sécuriser les interactions des agents d'IA

**Amazon Bedrock AgentCore** héberge et encadre des agents construits avec n'importe quel framework. Ses contrôles de sécurité :

| Risque | Contrôle |
| --- | --- |
| Les données d'un utilisateur fuient dans la conversation d'un autre | AgentCore Runtime exécute chaque session dans une microVM dédiée (CPU, mémoire et système de fichiers isolés), arrêtée et nettoyée à la fin de la session ; utilisez un `runtimeSessionId` unique d'au moins 33 caractères par utilisateur ou par conversation |
| N'importe qui peut appeler les outils de l'agent | Autorisation entrante d'AgentCore Gateway : JWT (Cognito ou un autre IdP OIDC) ou IAM SigV4 avec `bedrock-agentcore:InvokeGateway` ; évitez `NONE` et `AUTHENTICATE_ONLY` en production |
| L'agent appelle un outil ou transmet des paramètres qu'il ne devrait pas | Policy dans AgentCore : règles déterministes en Cedar (ou rédigées en langage naturel puis converties) dans un moteur de politiques associé à la passerelle, évaluées à chaque appel d'outil en dehors du code de l'agent |
| Des identifiants d'API tierces dans le code de l'agent | AgentCore Identity : identités de charge de travail, fournisseurs d'informations d'identification (OAuth, clés d'API) et consentement de l'utilisateur, au lieu de secrets codés en dur ; échange de jeton pour le compte de l'utilisateur (on-behalf-of) plutôt que transmission du jeton (passthrough) |
| Un rôle d'agent qui peut tout faire | Un rôle d'exécution à moindre privilège par agent ou par outil ; les clés de contexte de session (`aws:AgentCoreRuntimeSourceSid`) limitent les autorisations à une session |

AgentCore n'associe pas les sessions aux utilisateurs à votre place : le backend doit savoir quels ID de session appartiennent à quel utilisateur. Une session devient inactive après 15 minutes sans activité par défaut et dure au plus 8 heures par défaut ; les données à conserver vont dans AgentCore Memory.

**Approbation avec intervention humaine (human-in-the-loop)** pour les actions sensibles (remboursements, suppressions, paiements) :

| Modèle | Comment |
| --- | --- |
| Suspendre un flux de travail jusqu'à l'approbation d'une personne | Tâche Step Functions `.waitForTaskToken` (flux de travail Standard uniquement) : envoyer `$$.Task.Token` à l'approbateur (lien par e-mail, file d'attente, ticket), reprendre avec `SendTaskSuccess` ou `SendTaskFailure` ; définir `HeartbeatSeconds` ou un délai d'expiration |
| Exiger une approbation préalable avant un appel d'outil | Une règle de Policy dans AgentCore qui refuse l'outil tant que la session ne montre pas l'approbation |
| Confirmer dans l'application | L'outil renvoie une action en attente à l'interface utilisateur ; l'action ne s'exécute qu'après une confirmation explicite |

> **Piège d'examen.** Amazon Bedrock Agents s'appelle désormais Bedrock Agents Classic, fermé aux nouveaux clients depuis le 30 juillet 2026 (ses fonctionnalités de retour de contrôle et de confirmation utilisateur restent réservées aux clients existants). Pour un nouvel agent, la réponse est AgentCore ; `.waitForTaskToken` n'existe pas dans les flux de travail Express.

<!-- section: ai-log-protection | objectives: 2.3.5 -->
## Protéger le contenu sensible dans les journaux

La **journalisation des invocations de modèles** est désactivée par défaut. Une fois activée pour la Région, elle enregistre les requêtes, réponses et métadonnées complètes de `InvokeModel`, `Converse` et de leurs versions en streaming sur le point de terminaison `bedrock-runtime`, vers CloudWatch Logs, S3 ou les deux, dans le même compte et la même Région. Les corps de plus de 100 Ko et les données binaires vont uniquement dans S3. Les appels sur `bedrock-mantle` ne sont pas journalisés.

Comme ces journaux contiennent les invites et les réponses, protégez-les comme les données elles-mêmes :

| Contrôle | Comment |
| --- | --- |
| Masquer les PII et les secrets dans le groupe de journaux | Politique de protection des données de CloudWatch Logs ; seuls les principaux disposant de `logs:Unmask` voient les valeurs |
| Restreindre les lecteurs | IAM sur `logs:GetLogEvents`, `logs:StartQuery`, `s3:GetObject` ; un compte ou un compartiment de journaux séparé |
| Chiffrer avec votre clé | Clé KMS sur le groupe de journaux ; SSE-KMS sur le compartiment, dont la politique de clé autorise `bedrock.amazonaws.com` à appeler `kms:GenerateDataKey` |
| Limiter la conservation | Paramètre de rétention du groupe de journaux, expiration S3 Lifecycle |
| Ne journaliser que le nécessaire | Choisir les modalités (texte, image, embedding, vidéo) ; garder les PII hors de `requestMetadata` et des instructions de journalisation de l'application |

Les journaux d'application demandent le même soin : journalisez les ID de requête, le nombre de jetons et les actions des garde-fous, pas les invites brutes, et laissez une politique de protection des données rattraper ce qui passe. Les traces d'AgentCore Observability (OpenTelemetry) peuvent aussi contenir le contenu des invites.

> **Piège d'examen.** Un garde-fou qui masque les PII change ce que le modèle reçoit et renvoie, mais les journaux d'invocation de modèles stockent toujours la requête d'origine. Ajoutez une politique de protection des données de CloudWatch Logs (ou désactivez la journalisation des invocations) pour garder les PII hors des journaux.

<!-- section: key-points -->
## Points clés

- Les modèles serverless de Bedrock s'activent à la première invocation ; autorisations Marketplace pour le premier appel, formulaire de première utilisation Anthropic pour les anciens modèles Claude ; bloquez avec un refus de SCP ou d'IAM.
- Préférez les rôles IAM ; clés d'API Bedrock à court terme pour les jetons porteurs, clés à long terme pour l'exploration seulement ; refusez `bedrock:CallWithBearerToken` pour les interdire.
- Bedrock n'entraîne pas de modèle sur les invites et ne les partage pas ; points de terminaison PrivateLink (`bedrock-runtime`) avec politiques de point de terminaison et `aws:SourceVpce`.
- Les profils d'inférence géographiques gardent le traitement dans une zone géographique ; les profils globaux non.
- Garde-fous : filtres de contenu, attaque par invite (exige le balisage des entrées), sujets refusés, filtres de mots, blocage ou masquage des PII, ancrage ; imposez-les avec `bedrock:GuardrailIdentifier` ; `ApplyGuardrail` pour les résultats d'outils et les autres modèles.
- AgentCore Runtime isole les sessions dans des microVM ; Gateway authentifie les appelants ; Policy autorise chaque appel d'outil ; Identity détient les identifiants tiers.
- Approbation humaine : Step Functions `.waitForTaskToken` (Standard), politiques AgentCore, confirmation dans l'application ; Bedrock Agents Classic est fermé aux nouveaux clients.
- La journalisation des invocations est désactivée par défaut et stocke les invites brutes : masquez avec la protection des données de CloudWatch Logs, chiffrez avec KMS, restreignez et faites expirer.
