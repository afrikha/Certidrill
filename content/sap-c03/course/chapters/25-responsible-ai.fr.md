Les applications d'IA générative et agentique ajoutent trois questions de sécurité à une architecture : quel contenu peut entrer dans le modèle et en sortir, quelle identité un agent utilise quand il appelle des outils et des API tierces pour le compte d'un utilisateur, et quelles actions exigent une décision humaine avant de s'exécuter. Ce chapitre couvre le filtrage du contenu et les contrôles de conformité avec Amazon Bedrock Guardrails et leur application entre comptes, le contrôle d'accès des agents avec Amazon Bedrock AgentCore Identity et Policy, et les flux d'approbation humaine avec AWS Step Functions.

<!-- section: guardrails | objectives: 2.5.1 -->
## Filtrage du contenu et contrôles de conformité pour l'IA générative

Un **garde-fou** (guardrail) est une ressource Bedrock régionale et versionnée qui évalue les invites et les réponses avec une ou plusieurs politiques :

| Politique | Détecte | Action |
| --- | --- | --- |
| Filtres de contenu | Haine, insultes, contenu sexuel, violence, conduite répréhensible (misconduct), avec une intensité par catégorie ; texte et images | Bloquer |
| Attaques par invite (catégorie des filtres de contenu) | Jailbreaks, injection d'invite, fuite d'invite (niveau Standard) | Bloquer |
| Sujets refusés | Sujets que vous définissez en langage naturel (conseil en investissement, concurrents) | Bloquer |
| Filtres de mots | Mots et expressions exacts, liste gérée de grossièretés | Bloquer |
| Filtres d'informations sensibles | Types de PII et entités regex personnalisées dans les entrées et les sorties | Bloquer ou masquer |
| Vérifications d'ancrage contextuel (contextual grounding) | Réponses non ancrées dans la source récupérée, ou sans rapport avec la requête | Bloquer ou signaler |
| Vérifications Automated Reasoning | Conformité des réponses à des règles écrites sous forme de politique logique | Résultats de validation |

Le niveau Standard étend la détection au code (commentaires, identifiants, chaînes littérales) et ajoute la détection des fuites d'invite. Chaque garde-fou exige un message pour les entrées et sorties bloquées.

**Où s'exécute un garde-fou**

| Intégration | Usage |
| --- | --- |
| Dans l'appel d'inférence (`InvokeModel`, `Converse` et leurs formes en streaming) | Bedrock évalue l'invite avant le modèle et la réponse après lui |
| API `ApplyGuardrail` | Évaluer n'importe quel texte sans appeler de modèle Bedrock : modèles autohébergés, points de terminaison SageMaker AI, modèles tiers, ou étapes intermédiaires d'un agent |
| Bases de connaissances et agents | Vérifications d'ancrage contextuel par rapport aux passages récupérés pour réduire les hallucinations des réponses RAG |

**Rendre le garde-fou obligatoire**

| Portée | Mécanisme |
| --- | --- |
| Un rôle ou une application | Politique IAM avec la condition `bedrock:GuardrailIdentifier` : autoriser l'inférence uniquement avec la version de garde-fou approuvée, refus explicite sinon |
| Chaque appel dans un compte et une Région | Configuration de garde-fou appliqué au niveau du compte (`PutEnforcedGuardrailConfiguration`) |
| Chaque compte d'une OU ou de l'organisation | Politique Amazon Bedrock d'AWS Organizations (`BEDROCK_POLICY`) qui référence une version numérotée du garde-fou dans le compte de gestion, avec une politique basée sur la ressource sur le garde-fou qui accorde `bedrock:ApplyGuardrail` à l'organisation |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInferenceWithoutApprovedGuardrail",
      "Effect": "Deny",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:eu-west-1::foundation-model/*",
      "Condition": {
        "StringNotEquals": {
          "bedrock:GuardrailIdentifier": "arn:aws:bedrock:eu-west-1:111122223333:guardrail/gr-claims-assistant:3"
        }
      }
    }
  ]
}
```

Les garde-fous appliqués au niveau de l'organisation, du compte et de la requête s'appliquent tous : l'effet est une union dans laquelle le contrôle le plus restrictif l'emporte. Les politiques d'organisation se configurent par Région (un garde-fou par Région), peuvent inclure ou exclure des modèles (par exemple des modèles d'embedding), et ne prennent pas en charge les politiques Automated Reasoning. Les garde-fous utilisés par une application obligatoire ne peuvent pas être supprimés par défaut.

> **Piège d'examen.** Les garde-fous sont régionaux. Une entreprise qui sert ses utilisateurs depuis deux Régions a besoin d'un garde-fou et d'une entrée d'application dans chaque Région ; un garde-fou créé dans us-east-1 ne protège pas les appels faits dans eu-west-1.

> **Conseil d'examen.** Le contenu bloqué est écrit en clair dans les journaux d'invocation de modèles quand la journalisation est activée. Un énoncé qui exige « aucun contenu nuisible stocké dans les journaux » doit restreindre et chiffrer la destination des journaux, ou exclure ces journaux, et pas seulement ajouter des filtres.

<!-- section: agent-access | objectives: 2.5.2 -->
## Contrôles d'accès pour les applications d'IA générative et agentique

Un agent agit avec deux identités : l'utilisateur qui a fait la demande, et la charge de travail qui exécute l'agent. **AgentCore Identity** donne à chaque agent une identité de charge de travail (workload identity) dans un annuaire et gère les deux sens de l'authentification.

| Sens | Options | Choix de conception |
| --- | --- | --- |
| Entrant (qui peut invoquer l'agent sur AgentCore Runtime ou une Gateway) | IAM SigV4 (par défaut), ou un mécanisme d'autorisation JWT : URL de découverte OIDC, audiences, clients, portées et revendications personnalisées exigées (Cognito, Okta, Microsoft Entra ID ou tout fournisseur OIDC) | Un seul type entrant par version de runtime ; JWT quand les utilisateurs finaux se connectent à un fournisseur d'identité, SigV4 pour les charges de travail AWS |
| Sortant (ce que l'agent peut appeler) | Fournisseurs d'informations d'identification : OAuth 2.0 client credentials (2LO, sans utilisateur), authorization code avec consentement de l'utilisateur (3LO), clés d'API | 3LO quand l'agent lit des données propres à l'utilisateur (messagerie, stockage, CRM) ; 2LO pour les appels de système à système |
| Stockage des informations d'identification | Coffre de jetons (token vault), chiffré avec des clés KMS gérées par le service ou par le client, jetons liés à l'identité de charge de travail et à l'ID utilisateur | Aucun secret dans le code de l'agent ni dans les variables d'environnement |

Avec un mécanisme d'autorisation JWT, le runtime valide le jeton de l'utilisateur, l'échange contre un **jeton d'accès de charge de travail** (`GetWorkloadAccessTokenForJWT`) transmis à l'agent, puis l'agent appelle `GetResourceOauth2Token`. Si aucun jeton valide n'est en cache pour cet utilisateur, celui-ci reçoit une URL d'autorisation, donne son consentement chez le fournisseur, et les appels suivants réutilisent le jeton en cache jusqu'à son expiration. Un ID utilisateur passé dans un en-tête de requête au lieu d'un JWT n'est pas vérifié par rapport à une identité authentifiée : AWS recommande donc JWT en production.

**AgentCore Policy** ajoute une autorisation déterministe au niveau de la Gateway, hors du code de l'agent, pour qu'une invite manipulée ne puisse pas la contourner. Des politiques en Cedar (ou écrites en langage naturel puis converties en Cedar, et vérifiées par raisonnement automatisé contre les règles trop permissives ou insatisfiables) décident selon le principal, l'outil, les paramètres d'entrée et l'historique de la session, par exemple « remboursements au-delà de 500 réservés au groupe des superviseurs » ou « pas plus de trois virements par session ».

| Exigence | Contrôle |
| --- | --- |
| Seuls les modèles de fondation approuvés peuvent être utilisés dans l'organisation | SCP qui refuse `bedrock:InvokeModel` sauf sur les ARN des modèles ou profils d'inférence approuvés |
| Un agent ne peut appeler que les outils dont son rôle a besoin, avec des limites sur les arguments | AgentCore Gateway avec AgentCore Policy |
| L'agent lit l'agenda de chaque utilisateur avec les autorisations de cet utilisateur | Fournisseur d'informations d'identification 3LO d'AgentCore Identity, coffre de jetons par utilisateur |
| Autorisations fines dans l'application (sur quels documents un utilisateur peut poser des questions) | Amazon Verified Permissions avec des politiques Cedar, ou filtres de métadonnées sur la récupération de la base de connaissances liés aux attributs de l'appelant |
| Les autorisations AWS de l'agent lui-même | Rôle d'exécution au moindre privilège, limite d'autorisations, aucune clé à long terme |

> **Piège d'examen.** Donner au rôle d'exécution de l'agent un accès large aux données de tous les locataires et compter sur l'invite pour « ne répondre que pour l'utilisateur courant » n'est pas un contrôle d'accès. La décision doit être appliquée hors du modèle : jetons limités à l'utilisateur, filtres de récupération ou politiques évaluées au niveau de la Gateway.

<!-- section: human-oversight | objectives: 2.5.3 -->
## Supervision humaine et flux d'approbation pour les opérations d'IA

Les actions à fort impact proposées par un modèle (paiements, modifications de comptes, déploiements en production, messages aux clients) doivent attendre une décision humaine. **AWS Step Functions** met en œuvre cette pause avec le modèle **attente d'un rappel** (wait for callback) :

1. Un état Task avec le suffixe `.waitForTaskToken` envoie le jeton de tâche (`$$.Task.Token`) et l'action proposée vers un canal d'approbation : une fonction Lambda qui notifie un outil de tickets, une file SQS ou une rubrique SNS.
2. Le flux attend, sans frais de calcul, qu'un principal du même compte appelle `SendTaskSuccess` (approuvé, avec la décision en sortie) ou `SendTaskFailure` (rejeté).
3. L'état suivant exécute l'action, et un `Catch` envoie un rejet ou une expiration vers une étape de compensation ; la décision, l'approbateur et l'heure sont enregistrés dans l'historique d'exécution et dans CloudTrail.

```json
{
  "Comment": "Human approval before an AI agent executes a refund",
  "StartAt": "RequestApproval",
  "States": {
    "RequestApproval": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "notify-approvers",
        "Payload": { "taskToken.$": "$$.Task.Token", "proposal.$": "$.proposal" }
      },
      "TimeoutSeconds": 172800,
      "ResultPath": "$.approval",
      "Catch": [{ "ErrorEquals": ["States.Timeout", "States.TaskFailed"], "Next": "RecordRejection" }],
      "Next": "ApplyRefund"
    },
    "ApplyRefund": { "Type": "Task", "Resource": "arn:aws:states:::lambda:invoke", "Parameters": { "FunctionName": "apply-refund", "Payload.$": "$" }, "End": true },
    "RecordRejection": { "Type": "Pass", "End": true }
  }
}
```

| Fait de conception | Conséquence |
| --- | --- |
| Le rappel (`.waitForTaskToken`) et `.sync` ne fonctionnent que dans les flux Standard | Les flux Express (5 minutes au maximum) ne peuvent pas attendre un approbateur |
| Une tâche de rappel peut attendre jusqu'à la limite d'un an des flux Standard | Fixez `TimeoutSeconds` (et `HeartbeatSeconds` seulement si le système d'approbation envoie `SendTaskHeartbeat`) pour qu'une approbation oubliée échoue ou soit escaladée au lieu de rester bloquée |
| Une tâche de rappel relancée reçoit un nouveau jeton | Les approbations envoyées avec l'ancien jeton échouent ; l'outil d'approbation doit utiliser le dernier jeton |
| Les jetons ne sont acceptés que de principaux du compte du flux | Un outil d'approbation d'un autre compte passe par un rôle de ce compte |

Autres points d'approbation :

| Situation | Mécanisme |
| --- | --- |
| Un agent Bedrock doit demander à l'utilisateur final avant d'exécuter une fonction de groupe d'actions | Confirmation de l'utilisateur sur la fonction, ou retour de contrôle (return of control) pour que l'application exécute elle-même l'action |
| Logique d'agent de longue durée dans le code, avec une pause pour une décision externe | Lambda durable functions : étapes et attentes avec points de contrôle, une exécution peut durer jusqu'à un an, sans frais pendant l'attente |
| Appels d'outils qui ne doivent jamais s'exécuter sans approbation | AgentCore Policy qui refuse l'outil à l'agent, pour que l'action ne puisse être exécutée que par le flux d'approbation |
| Revue de la qualité des sorties du modèle dans le temps | Échantillons de journaux d'invocation envoyés à des relecteurs, interventions des garde-fous surveillées dans CloudWatch |

> **Conseil d'examen.** « L'agent doit attendre jusqu'à 48 heures l'approbation d'un responsable, avec le moins de charge opérationnelle et une piste d'audit complète » correspond à un flux Standard avec `.waitForTaskToken`, un délai d'expiration et un chemin de rejet ; interroger une table de statut DynamoDB depuis une fonction Lambda planifiée est la charge que le qualificatif rejette.

<!-- section: key-points -->
## Points clés

- Politiques de garde-fou : filtres de contenu, attaques par invite, sujets refusés, filtres de mots, informations sensibles (bloquer ou masquer), ancrage contextuel, Automated Reasoning.
- `ApplyGuardrail` protège les modèles hors de Bedrock et les étapes intermédiaires des agents.
- Imposez les garde-fous avec la condition `bedrock:GuardrailIdentifier`, l'application au niveau du compte ou les politiques Bedrock d'Organizations ; tous les niveaux s'appliquent et le plus restrictif l'emporte.
- Les garde-fous et leur application obligatoire sont régionaux ; référencez des versions numérotées.
- AgentCore Identity : entrant SigV4 ou JWT, sortant 2LO, 3LO ou clés d'API, coffre de jetons par identité de charge de travail et par utilisateur.
- AgentCore Policy applique des règles Cedar aux appels d'outils au niveau de la Gateway, hors du code de l'agent.
- Approbation humaine : Step Functions Standard avec `.waitForTaskToken`, `SendTaskSuccess` ou `SendTaskFailure`, délais d'expiration et chemin de rejet ; Express ne peut pas attendre.
