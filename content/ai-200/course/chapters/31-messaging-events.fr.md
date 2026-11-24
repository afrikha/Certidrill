Les back-ends IA font rarement leur travail lourd dans la requête HTTP : ils le mettent en file d'attente. Azure Service Bus transporte des **messages**, des commandes qu'un récepteur doit traiter exactement comme convenu (résumer ce document, indexer ce lot), avec des verrous, des nouvelles tentatives et une file d'attente de lettres mortes. Azure Event Grid achemine des **événements**, des notifications que quelque chose s'est produit (un objet blob a été chargé, une évaluation est terminée), vers les gestionnaires abonnés, avec des filtres et des nouvelles tentatives. Les questions d'examen montrent du code du SDK Python, une commande `az` ou une définition d'abonnement et demandent quel paramètre répond à une exigence de fiabilité ou de routage.

<!-- section: service-bus-entities | objectives: 3.1.1 -->
## Files d'attente, rubriques et messages Service Bus

Un espace de noms (`<namespace>.servicebus.windows.net`) contient les entités :

| Entité | Remise | Usage |
| --- | --- | --- |
| File d'attente | Chaque message à **un seul** récepteur parmi des consommateurs concurrents | Répartition du travail et nivellement de charge : un pool de workers GPU lit les tâches à son rythme |
| Rubrique (topic) avec abonnements | Une copie à **chaque** abonnement dont les règles correspondent ; chaque abonnement se lit comme une file d'attente | Plusieurs consommateurs indépendants du même message (indexeur, auditeur, notificateur) |

| Niveau | Ajoute |
| --- | --- |
| Basic | Files d'attente uniquement |
| Standard | Rubriques et abonnements, sessions, transactions, détection des doublons ; messages jusqu'à 256 Ko |
| Premium | Capacité dédiée, messages jusqu'à 100 Mo, points de terminaison privés |

Le code s'authentifie avec Microsoft Entra ID : `DefaultAzureCredential` plus un rôle de données sur l'espace de noms ou l'entité, **Azure Service Bus Data Sender** pour envoyer, **Data Receiver** pour recevoir, **Data Owner** pour les deux.

```text
import json
from azure.identity import DefaultAzureCredential
from azure.servicebus import ServiceBusClient, ServiceBusMessage

client = ServiceBusClient(
    fully_qualified_namespace="contoso-ai.servicebus.windows.net",
    credential=DefaultAzureCredential(),
)

with client.get_queue_sender(queue_name="summarize-jobs") as sender:
    batch = sender.create_message_batch()
    for doc in documents:
        batch.add_message(ServiceBusMessage(
            json.dumps({"documentId": doc.id}),
            message_id=doc.id,                      # duplicate detection key
            session_id=doc.customer_id,             # FIFO per customer (session-enabled queue)
            application_properties={"priority": doc.priority},
            content_type="application/json",
        ))
    sender.send_messages(batch)
```

| Propriété du message | Rôle |
| --- | --- |
| `message_id` | Identifie le message ; la détection des doublons écarte un second message de même ID dans la fenêtre de détection |
| `session_id` | Regroupe des messages liés ; un récepteur de session les reçoit dans l'ordre, un seul récepteur par session à la fois |
| `correlation_id`, `subject`, `application_properties` | Métadonnées lues par les filtres d'abonnement ; les filtres ne lisent jamais le corps |
| `time_to_live` | Expiration du message |
| `scheduled_enqueue_time_utc` ou `sender.schedule_messages()` | Remise différée |

`add_message` lève `ValueError` quand le lot créé par `create_message_batch()` est plein : envoyez-le et commencez-en un nouveau. Les sessions (file d'attente ou abonnement) et la détection des doublons (file d'attente ou rubrique) ne s'activent qu'à la création de l'entité, sans modification possible ensuite ; la fenêtre de détection des doublons (10 minutes par défaut, de 20 secondes à 7 jours) peut être modifiée plus tard.

> **Piège d'examen.** « Traiter les étapes de chaque conversation dans l'ordre » exige une entité **avec sessions activées** et un `session_id` sur chaque message, en Standard ou Premium. Une simple file d'attente avec des consommateurs concurrents ne préserve pas l'ordre.

<!-- section: service-bus-receive | objectives: 3.1.1 -->
## Recevoir et régler les messages

| Mode de réception | Comportement | Garantie |
| --- | --- | --- |
| `ServiceBusReceiveMode.PEEK_LOCK` (défaut) | Le message est verrouillé pour ce récepteur ; le code le règle après le traitement | Au moins une fois : un plantage ou un verrou expiré le remet |
| `ServiceBusReceiveMode.RECEIVE_AND_DELETE` | Le message est supprimé dès qu'il est envoyé au récepteur | Au plus une fois : un plantage le perd |

```text
from azure.servicebus import AutoLockRenewer

renewer = AutoLockRenewer()
with client.get_queue_receiver(queue_name="summarize-jobs", max_wait_time=30) as receiver:
    for msg in receiver:
        renewer.register(receiver, msg, max_lock_renewal_duration=600)   # long model call
        try:
            job = json.loads(str(msg))
            summarize(job["documentId"])
            receiver.complete_message(msg)                   # done: remove
        except InvalidPayload as err:
            receiver.dead_letter_message(msg, reason="InvalidPayload",
                                         error_description=str(err))
        except TransientError:
            receiver.abandon_message(msg)                    # retry now; delivery count + 1
```

| Règlement | Effet |
| --- | --- |
| `complete_message` | Le traitement a réussi ; le message est supprimé |
| `abandon_message` | Libère le verrou : le message est remis et son nombre de remises augmente |
| `dead_letter_message` | Le déplace vers la file d'attente de lettres mortes avec une raison et une description |
| `defer_message` | Le met de côté ; lisez-le plus tard avec `receive_deferred_messages` et son numéro de séquence |

La **durée du verrou** est une propriété de la file d'attente ou de l'abonnement : 1 minute par défaut, 5 minutes au plus. Fixez-la au-dessus du temps de traitement normal, et renouvelez le verrou (`AutoLockRenewer`) pour un travail plus long. Comme la remise est « au moins une fois », rendez le gestionnaire **idempotent**, par exemple en enregistrant le `message_id` des messages traités. Réglez chaque message avant de fermer le récepteur ou le client, et créez un client par processus.

> **Piège d'examen.** Un message jamais terminé n'est pas perdu en mode peek-lock : quand son verrou expire, il revient avec un nombre de remises plus élevé, et le récepteur doit gérer le doublon.

<!-- section: dead-letter | objectives: 3.1.1 -->
## Gérer la file d'attente de lettres mortes

Chaque file d'attente et chaque abonnement possède une sous-file de lettres mortes (DLQ), créée automatiquement ; une rubrique n'en a pas en propre. Les messages y restent jusqu'à ce qu'un récepteur les lise et les termine : la DLQ n'applique aucune durée de vie et rien n'est nettoyé à votre place.

| Raison (`dead_letter_reason`) | Cause |
| --- | --- |
| `MaxDeliveryCountExceeded` | Remis plus de fois que **MaxDeliveryCount** (10 par défaut) : abandons ou verrous expirés |
| `HeaderSizeExceeded` | Le quota de taille du flux du message a été dépassé |
| `TTLExpiredException` | Le message a expiré et les lettres mortes à l'expiration des messages sont activées sur l'entité |
| `Session ID is null` | Un message sans `session_id` envoyé à une entité avec sessions activées |
| `MaxTransferHopCountExceeded` | Plus de quatre sauts de transfert automatique |
| Votre propre raison | L'application a appelé `dead_letter_message` (message incohérent, validation échouée) |

Un abonnement peut aussi placer en lettres mortes les messages dont l'évaluation du filtre lève une exception, si cette option est activée. Les messages expirés sont simplement supprimés quand les lettres mortes à l'expiration sont désactivées. Les messages différés qui expirent ne sont pas déplacés vers la DLQ.

```text
from azure.servicebus import ServiceBusSubQueue

with client.get_queue_receiver(queue_name="summarize-jobs",
                               sub_queue=ServiceBusSubQueue.DEAD_LETTER) as dlq:
    for msg in dlq.receive_messages(max_message_count=50, max_wait_time=5):
        log_failure(msg.dead_letter_reason, msg.dead_letter_error_description)
        if can_be_fixed(msg):
            with client.get_queue_sender("summarize-jobs") as sender:
                sender.send_messages(ServiceBusMessage(fix(msg)))   # resubmit a new message
        dlq.complete_message(msg)                                    # remove from the DLQ
```

Pour un abonnement, utilisez `get_subscription_receiver(topic_name, subscription_name, sub_queue=ServiceBusSubQueue.DEAD_LETTER)`. Le chemin vu dans les outils est `<queue>/$deadletterqueue` ou `<topic>/Subscriptions/<subscription>/$deadletterqueue`. Service Bus Explorer, dans le portail, permet aussi de lire et de renvoyer les messages en lettres mortes.

```bash
az servicebus queue create --resource-group rg-ai --namespace-name contoso-ai \
  --name summarize-jobs --max-delivery-count 5 --lock-duration PT2M \
  --enable-dead-lettering-on-message-expiration true
```

> **Piège d'examen.** Un message ne peut pas être placé en lettres mortes depuis la DLQ, et la DLQ ne réessaie rien d'elle-même. Un message ne revient au traitement que lorsque votre code (ou Service Bus Explorer) envoie une nouvelle copie dans la file d'attente.

<!-- section: topics-filters | objectives: 3.1.1 -->
## Rubriques, abonnements et filtres

Chaque abonnement a des règles ; chaque règle a un filtre et, pour les filtres SQL, une action facultative. Un nouvel abonnement a une règle par défaut (`$Default`) avec un filtre vrai qui accepte tous les messages : supprimez-la ou remplacez-la quand vous ajoutez votre propre filtre, sinon l'abonnement reçoit encore tout.

| Filtre | Teste | Remarques |
| --- | --- | --- |
| Filtre de corrélation | Égalité sur `correlation_id`, `subject`, `message_id`, `session_id`, `reply_to`, `to`, `content_type` et les propriétés d'application (toutes doivent correspondre) | Le plus efficace : à privilégier dès qu'un test d'égalité suffit |
| Filtre SQL | Expression de type SQL sur les propriétés d'application et les propriétés système (préfixe `sys.`) : `AND`, `OR`, `NOT`, comparaisons, `LIKE`, `EXISTS`, `IS NULL` | Réduit le débit ; peut porter une action (`SET priority = 'high'`) |
| Filtre booléen | `TrueFilter` (tous), `FalseFilter` (aucun) | `TrueFilter` équivaut au filtre SQL `1=1` |

Plusieurs règles correspondantes **sans** action produisent une seule copie dans l'abonnement ; chaque règle correspondante **avec** action produit sa propre copie.

```bash
az servicebus topic subscription rule create --resource-group rg-ai \
  --namespace-name contoso-ai --topic-name model-results \
  --subscription-name low-confidence --name below-threshold \
  --filter-sql-expression "confidence < 0.6 AND language = 'fr'"

az servicebus topic subscription rule delete --resource-group rg-ai \
  --namespace-name contoso-ai --topic-name model-results \
  --subscription-name low-confidence --name '$Default'
```

> **Conseil d'examen.** « Acheminer chaque message vers une file de relecture selon une propriété, avec le moins d'impact sur le débit » désigne un filtre de corrélation. Il n'existe pas de filtre qui teste le contenu du corps : copiez la valeur dans une propriété d'application à l'envoi.

<!-- section: event-grid-custom | objectives: 3.1.2 -->
## Rubriques Event Grid et événements personnalisés

Event Grid pousse les événements des **rubriques** vers des **abonnements aux événements**, qui les remettent à des gestionnaires : Azure Functions, webhooks, files d'attente et rubriques Service Bus, Event Hubs, files d'attente Stockage. La remise est « au moins une fois » et sans ordre.

| Type de rubrique | Source |
| --- | --- |
| Rubrique système | Événements d'un service Azure (Stockage Blob, Resource Manager...) |
| Rubrique personnalisée | Votre application publie ses propres événements vers le point de terminaison de la rubrique (`https://...eventgrid.azure.net/api/events`) |
| Rubrique d'espace de noms | Espaces de noms Event Grid : CloudEvents uniquement, remise push ou **pull**, où le consommateur reçoit, acquitte, libère ou rejette |

Un événement au schéma **CloudEvents 1.0** porte `id`, `source`, `type`, `subject`, `time` et `data` ; le **schéma Event Grid** porte `id`, `topic`, `subject`, `eventType`, `eventTime`, `dataVersion` et `data`. Le schéma d'entrée se choisit à la création de la rubrique personnalisée.

```text
from azure.identity import DefaultAzureCredential
from azure.core.messaging import CloudEvent
from azure.eventgrid import EventGridPublisherClient

client = EventGridPublisherClient(
    "https://eval-events.westeurope-1.eventgrid.azure.net/api/events",
    DefaultAzureCredential(),            # identity holds EventGrid Data Sender
)

client.send([
    CloudEvent(
        source="/contoso/evaluations",
        type="Contoso.Evaluation.Completed",
        subject="/models/claims-classifier/runs/4512",
        data={"runId": 4512, "score": 0.91},
    ),
])
```

| Besoin | Paramètre |
| --- | --- |
| Authentifier l'éditeur | Microsoft Entra ID avec **EventGrid Data Sender**, ou la clé d'accès de la rubrique (`AzureKeyCredential`) |
| Schéma Event Grid au lieu de CloudEvents | `EventGridEvent(subject=..., event_type=..., data=..., data_version="1.0")` |
| Meilleur débit | Envoyer une liste d'événements en un appel plutôt qu'un appel par événement |
| Gestionnaire webhook | Doit répondre à la négociation de validation de l'abonnement ; le déclencheur Event Grid d'Azure Functions le fait pour vous |

> **Piège d'examen.** Event Grid n'est pas une file d'attente : il ne conserve pas de travail pour un consommateur qui lit à son rythme (sauf la remise pull des espaces de noms), et il ne garantit aucun ordre. Quand le gestionnaire a besoin de nivellement de charge, remettez l'événement à une file d'attente Service Bus et traitez-le depuis celle-ci.

<!-- section: event-grid-filters | objectives: 3.1.2 -->
## Filtrer les événements

Un abonnement aux événements filtre sur trois niveaux, combinés par ET :

| Filtre | Exemple |
| --- | --- |
| Types d'événements | `includedEventTypes` : seulement `Microsoft.Storage.BlobCreated` (par défaut : tous les types de la source) |
| Objet (subject) | `subjectBeginsWith` `/blobServices/default/containers/uploads/` et `subjectEndsWith` `.pdf` |
| Filtres avancés | Opérateurs sur une clé de l'événement : `NumberGreaterThan`, `NumberInRange`, `StringContains`, `StringBeginsWith`, `StringIn`, `BoolEquals`, `IsNotNull`... |

```json
{
  "filter": {
    "includedEventTypes": [ "Contoso.Evaluation.Completed" ],
    "subjectBeginsWith": "/models/claims-classifier/",
    "advancedFilters": [
      { "operatorType": "NumberLessThan", "key": "data.score", "value": 0.8 },
      { "operatorType": "StringIn", "key": "data.region", "values": [ "emea", "apac" ] }
    ]
  }
}
```

Règles à retenir :

- Plusieurs valeurs dans un filtre avancé se combinent par **OU** ; plusieurs filtres par **ET**.
- Les clés utilisent la notation pointée dans `data` (`data.appEventTypeDetail.action`) ; les clés qui contiennent un point ne sont pas prises en charge. Les tableaux exigent `enableAdvancedFilteringOnArrays`.
- Les comparaisons de chaînes ne respectent pas la casse. Une clé absente ne correspond pas, sauf pour `NumberNotIn` et `StringNotIn`.
- Limites : 25 filtres avancés et 25 valeurs de filtre au total par abonnement, 512 caractères par valeur de chaîne.
- Concevez les objets personnalisés comme des chemins (`/models/<model>/runs/<id>`) pour que les abonnés puissent filtrer par préfixe.

> **Conseil d'examen.** Filtrez sur l'abonnement aux événements plutôt que dans le gestionnaire : les événements qui ne correspondent pas ne sont jamais remis, vous ne payez donc aucune exécution.

<!-- section: event-grid-retries | objectives: 3.1.2 -->
## Nouvelles tentatives et lettres mortes dans Event Grid

Event Grid attend une réponse pendant 30 secondes ; 200 à 204 signifie succès. Il réessaie les échecs avec un backoff exponentiel (10 secondes, 30 secondes, 1 minute, 5 minutes... puis toutes les 12 heures) jusqu'à la fin de la **stratégie de nouvelle tentative** :

| Paramètre | Plage | Défaut |
| --- | --- | --- |
| Nombre maximal de tentatives de remise | 1–30 | 30 |
| Durée de vie de l'événement | 1–1 440 minutes | 1 440 (24 heures) |

La première limite atteinte met fin à la remise. Certaines réponses ne sont pas réessayées : 400 (requête incorrecte), 403 (interdit) et 413 (charge utile trop grande) pour tous les points de terminaison, plus 401 pour les webhooks (un 401 d'un point de terminaison de ressource Azure est réessayé après 5 minutes ou plus) ; 400 et 413 placent immédiatement l'événement en lettres mortes. Les lettres mortes sont **désactivées par défaut** : sans elles, les événements impossibles à remettre sont supprimés. Activez-les avec un conteneur d'objets blob : l'événement y arrive 5 minutes après la dernière tentative, et il est supprimé si le conteneur reste indisponible pendant 4 heures. L'événement en lettres mortes ajoute `deadLetterReason`, `deliveryAttempts` et `lastDeliveryOutcome`.

```bash
az eventgrid event-subscription create --name low-scores \
  --source-resource-id "$TOPIC_ID" \
  --endpoint-type servicebusqueue --endpoint "$QUEUE_ID" \
  --included-event-types Contoso.Evaluation.Completed \
  --advanced-filter data.score NumberLessThan 0.8 \
  --max-delivery-attempts 10 --event-ttl 120 \
  --deadletter-endpoint "$STORAGE_ID/blobServices/default/containers/eg-deadletter"
```

Le traitement par lots (désactivé par défaut) regroupe jusqu'à 5 000 événements par requête ; un lot réussit ou échoue en entier, donc ne demandez que ce que le gestionnaire traite en 30 secondes.

| Exigence | Service |
| --- | --- |
| Une commande à traiter une fois, avec des nouvelles tentatives que vous contrôlez et une file de lettres mortes | File d'attente Service Bus |
| Le même message vers plusieurs consommateurs avec des filtres sur les propriétés | Rubrique Service Bus |
| Réagir à un changement d'état, diffuser vers des gestionnaires, payer par événement | Event Grid |
| Réagir à un événement, puis le traiter avec nivellement de charge | Abonnement Event Grid qui remet à une file d'attente Service Bus |

> **Piège d'examen.** Une durée de vie de 30 minutes avec 30 tentatives ne donne pas 30 tentatives : le backoff n'atteint qu'environ six tentatives en 30 minutes, puis l'événement est placé en lettres mortes ou supprimé.

<!-- section: key-points -->
## Points clés

- File d'attente : un récepteur par message. Rubrique : une copie par abonnement correspondant. Standard ou Premium pour les rubriques, les sessions et la détection des doublons.
- Peek-lock (défaut) est « au moins une fois » : `complete`, `abandon`, `dead_letter`, `defer` ; verrou de 1 minute par défaut, 5 au plus, à renouveler pour un long travail ; gestionnaires idempotents.
- Une DLQ par file d'attente et par abonnement ; `MaxDeliveryCountExceeded` après 10 remises par défaut ; lisez-la avec `sub_queue=ServiceBusSubQueue.DEAD_LETTER` et renvoyez un nouveau message.
- `$Default` accepte tout tant qu'elle n'est pas supprimée ; les filtres de corrélation sont les moins coûteux ; les filtres lisent les propriétés, jamais le corps.
- Event Grid : rubriques personnalisées, schéma CloudEvents ou Event Grid, EventGrid Data Sender, « au moins une fois », sans ordre.
- Filtres : types d'événements, préfixe ou suffixe de l'objet, filtres avancés (valeurs en OU, filtres en ET, limite de 25).
- Nouvelles tentatives : 30 tentatives et 24 heures par défaut, la première limite l'emporte ; les lettres mortes vers un conteneur d'objets blob sont désactivées par défaut.
