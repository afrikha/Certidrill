La supervision d'Azure Virtual Desktop combine deux sources de données dans Log Analytics : les **journaux du service** des objets Azure Virtual Desktop (pools d'hôtes, espaces de travail, groupes d'applications) et les **données invitées** des hôtes de session (compteurs de performances et journaux d'événements Windows). Azure Virtual Desktop Insights transforme les deux en workbooks, et la mise à l'échelle automatique ajuste la capacité en cours d'exécution. Les questions demandent quelle source de données répond à une question, quel rôle est le minimum et ce que fait un plan de mise à l'échelle à un moment donné.

<!-- section: log-collection | objectives: 4.1.1 -->
## Collecter les journaux d'Azure Virtual Desktop et des hôtes de session

| Données | Collectées par | Destination |
| --- | --- | --- |
| Connexions, erreurs, points de contrôle, flux, activité de gestion, inscription des hôtes, intégrité de l'agent | **Paramètres de diagnostic** sur chaque objet Azure Virtual Desktop | Tables `WVD*` (`WVDConnections`, `WVDErrors`, `WVDCheckpoints`...) |
| Processeur, mémoire, disque, délai d'entrée, journaux d'événements Windows des hôtes de session | **Agent Azure Monitor** (Azure Monitor Agent) sur chaque hôte de session + une **règle de collecte de données (DCR)** | Tables `Perf` et `Event` |

**Paramètres de diagnostic.** Ouvrez l'objet, puis *Paramètres de diagnostic > Ajouter un paramètre de diagnostic*, donnez-lui un nom sans espaces, sélectionnez les catégories et *Envoyer à l'espace de travail Log Analytics* (l'archivage dans un compte de stockage et la diffusion vers Event Hubs sont les autres destinations). Activez-le sur **chaque** objet à superviser ; les données n'existent qu'à partir de ce moment.

| Catégorie | Ce qu'elle enregistre |
| --- | --- |
| Management Activities | Les modifications des objets Azure Virtual Desktop par les API ou PowerShell, et leur réussite |
| Feed | Si les utilisateurs ont pu s'abonner à un espace de travail (télécharger leur liste d'applications et de bureaux) |
| Connections | Le début et la fin des connexions des utilisateurs |
| Host registration | Si un hôte de session s'est inscrit auprès du service |
| Errors | Les problèmes rencontrés par les utilisateurs pendant une activité |
| Checkpoints | Les étapes atteintes pendant une activité, comme le lancement d'une RemoteApp |
| Agent Health Status | L'intégrité de l'agent Azure Virtual Desktop sur chaque hôte de session |
| Network | Les données réseau moyennes des sessions, dont le temps d'aller-retour estimé |
| Connection Graphics | Les données de performances du flux graphique |
| Session Host Management Activity | L'activité de gestion sur les hôtes de session |
| Autoscale | Les opérations de mise à l'échelle |

Pour Insights, le pool d'hôtes a besoin de Management Activities, Feed, Connections, Errors, Checkpoints, HostRegistration et AgentHealthStatus ; l'espace de travail, de Management Activities, Feed, Errors et Checkpoints. Un groupe d'applications propose Checkpoints, Errors et Management.

Une connexion signale trois états : **Started** (l'utilisateur sélectionne une ressource dans le client), **Connected** (la session est établie sur l'hôte) et **Completed** (déconnexion). Dans `WVDErrors`, `ServiceError` = `false` signifie qu'un administrateur peut en général corriger la cause ; `true` signale un problème à remonter à Microsoft avec le *CorrelationId*.

```kusto
// Session duration per resource for one user
let Events = WVDConnections | where UserName == "ana@contoso.com";
Events
| where State == "Connected"
| project CorrelationId, UserName, ResourceAlias, StartTime = TimeGenerated
| join (Events | where State == "Completed" | project EndTime = TimeGenerated, CorrelationId) on CorrelationId
| project Duration = EndTime - StartTime, ResourceAlias
| sort by Duration asc
```

```kusto
// How many users hit the same error
WVDErrors
| where CodeSymbolic == "ErrorSymbolicCode"
| summarize count(UserName) by CodeSymbolic
```

**Données des hôtes de session.** L'agent Log Analytics est retiré : utilisez l'**agent Azure Monitor** (une extension de machine virtuelle), qui exige une **identité managée affectée par le système** sur la machine virtuelle, et une DCR qui définit les compteurs, les journaux d'événements et l'espace de travail de destination, associée à chaque hôte de session. Microsoft recommande un **espace de travail dédié** aux données des hôtes de session, pour ne collecter que des données Azure Virtual Desktop ; il peut être différent de celui des paramètres de diagnostic. Les données de journal apparaissent avec une latence pouvant atteindre environ 15 minutes.

> **Piège d'examen.** Les paramètres de diagnostic ne collectent jamais le processeur ou la mémoire des hôtes de session, et l'agent Azure Monitor ne collecte jamais les événements de connexion ou de flux : une question sur « pourquoi les utilisateurs ne voient pas leurs applications » demande la catégorie **Feed** de l'**espace de travail**, alors que « quel hôte a un délai d'entrée élevé » demande des **compteurs de performances** par une DCR.

<!-- section: azure-monitor-insights | objectives: 4.1.2 -->
## Superviser avec Azure Monitor et Azure Virtual Desktop Insights

**Azure Virtual Desktop Insights** est un ensemble de workbooks Azure Monitor (`https://aka.ms/avdi`, ou *Insights* sur un pool d'hôtes). La configuration passe par le **workbook de configuration** (*Workbooks > Check Configuration*, choisissez l'abonnement, le groupe de ressources et le pool d'hôtes) :

| Onglet | Ce qu'il déploie |
| --- | --- |
| Resource diagnostic settings | *Configure host pool* et *Configure workspace* : les paramètres de diagnostic vers l'espace de travail choisi |
| Session host data settings | *Create data collection rule* (après le choix de l'espace de travail et du groupe de ressources de la DCR), puis *Deploy association*, *Add extension* (agent Azure Monitor) et *Add system managed identity* ; ensuite *Configure performance counters* et *Configure Events* pour les éléments manquants |

Le déploiement automatisé depuis le workbook prend en charge jusqu'à 1 000 hôtes de session ; au-delà, installez l'agent à la création des hôtes de session, par exemple avec un modèle ARM.

**Rôles minimaux pour consulter Insights :** **Desktop Virtualization Reader** sur le groupe de ressources ou l'abonnement des pools d'hôtes, espaces de travail et hôtes de session, plus **Log Analytics Reader** sur chaque espace de travail.

Principaux rapports :

| Rapport | Affiche |
| --- | --- |
| Connection Reliability | Les déconnexions comparées aux connexions simultanées, par hôte, client, transport ou région de passerelle |
| Connection Performance | Le temps d'aller-retour (RTT) par utilisateur et par région de passerelle ; visez moins de 100 ms, la qualité se dégrade au-delà de 200 ms |
| Host Performance | Le délai d'entrée utilisateur par hôte (visez moins de 100 ms), les métriques de processeur, de mémoire et de disque |
| Host Diagnostics | Les compteurs par hôte : Available MBytes, Page Faults/sec, processeur, espace disque, Input Delay per Session |
| Utilization | L'historique des sessions (actives, inactives ou déconnectées) et le nombre d'hôtes de session actifs |
| Clients | Les versions des clients utilisées et les utilisateurs dont le client est peut-être obsolète |

**Alertes.** Insights ne crée pas d'alertes : créez des **règles d'alerte de recherche dans les journaux** sur les tables `WVD*` (par exemple un nombre de `WVDErrors` supérieur à un seuil) ou sur `Perf`, avec un groupe d'actions. Pour les incidents du service Azure Virtual Desktop lui-même, créez une alerte **Service Health** pour le service Azure Virtual Desktop dans vos régions.

> **Conseil d'examen.** « Donner au support un accès en lecture à Insights avec le moindre privilège » = Desktop Virtualization Reader sur les ressources Azure Virtual Desktop **et** Log Analytics Reader sur l'espace de travail. Aucun des deux rôles ne suffit seul.

<!-- section: customize-workbooks | objectives: 4.1.3 -->
## Personnaliser les workbooks d'Insights

Les workbooks d'Insights sont des modèles Microsoft. Pour les modifier, ouvrez le workbook, **enregistrez-en une copie** comme votre propre workbook, puis sélectionnez **Modifier** :

| Élément | Utilisation |
| --- | --- |
| Requête | Une requête KQL sur un espace de travail (ou un type de ressource), affichée en grille, graphique, vignettes ou carte |
| Métrique | Une métrique Azure Monitor des ressources sélectionnées, avec une agrégation |
| Paramètre | Une liste déroulante ou une valeur texte (abonnement, pool d'hôtes, intervalle de temps) réutilisée par les requêtes |
| Liens/onglets | Des onglets qui fixent la valeur d'un paramètre pour afficher ou masquer des groupes |
| Groupe | Plusieurs éléments chargés ensemble, modifiables ou issus d'un modèle |

Sélectionnez **Terminer la modification** (Done editing) pour chaque élément, puis enregistrez. La galerie (*Moniteur > Workbooks*) comporte les onglets *Workbooks* (workbooks enregistrés), *Modèles publics* (modèles Microsoft) et *Mes modèles* (vos modèles déployés).

| Action | Rôle |
| --- | --- |
| Consulter un workbook | Un accès en lecture aux données qu'il interroge (par exemple Monitoring Reader, Log Analytics Reader) |
| Enregistrer un workbook partagé | **Workbooks Contributor** ou **Monitoring Contributor** (`microsoft.insights/workbooks/write`) |

> **Piège d'examen.** Une copie personnalisée enregistrée **ne reçoit pas** les mises à jour que Microsoft publie dans le modèle Insights. Enregistrer ses paramètres favoris exige aussi une copie personnalisée.

<!-- section: capacity-performance | objectives: 4.1.4 -->
## Optimiser la capacité et les performances des hôtes de session

Les points de départ de Microsoft pour le dimensionnement **multisession** :

| Charge de travail | Utilisateurs maximum par vCPU | Minimum par machine virtuelle | Exemples de tailles |
| --- | --- | --- | --- |
| Légère (Light) | 6 | 8 vCPU, 16 Go de RAM, 32 Go de stockage système | D8s_v5, D16s_v5 |
| Moyenne (Medium) | 4 | 8 vCPU, 16 Go de RAM, 32 Go de stockage système | D8s_v5, D16s_v5 |
| Lourde (Heavy) | 2 | 8 vCPU, 16 Go de RAM, 32 Go de stockage système | D8s_v5, D16s_v5 |
| Intensive (Power) | 1 | 6 vCPU, 56 Go de RAM, 340 Go de stockage système | D16ds_v5, NV16as_v4 |

Prévoyez au moins 30 Go de stockage de profil par utilisateur. Dimensionnez les machines virtuelles entre 4 et 24 vCPU (sans dépasser 32) : les machines multisession à deux vCPU sont instables, et le gain diminue au-delà d'environ 16 cœurs, si bien que deux machines de 16 cœurs offrent une meilleure expérience qu'une machine de 32 cœurs. Validez avec un pilote ou une simulation de charge et gardez une marge pour les pics de connexion.

| Symptôme (Insights) | Action |
| --- | --- |
| Délai d'entrée ou processeur élevé sur tous les hôtes en pointe | Baissez la **limite maximale de sessions**, ajoutez des hôtes, ou baissez le seuil de capacité du plan de mise à l'échelle pour démarrer les hôtes plus tôt |
| Un hôte saturé pendant que les autres sont inactifs | Équilibrage **breadth-first** (largeur d'abord) pendant les heures de travail |
| Hôtes presque vides qui tournent le soir | Équilibrage **depth-first** (profondeur d'abord) et mise à l'échelle automatique pour arrêter les hôtes inutilisés |
| Pression mémoire (Available MBytes faible, Page Faults/sec élevé) | Une taille avec plus de mémoire ou moins de sessions par hôte |
| RTT élevé pour une région d'utilisateurs | Des hôtes de session plus proches des utilisateurs, RDP Shortpath (chapitre 11) |

La **limite maximale de sessions** d'un pool d'hôtes regroupé plafonne le nombre de sessions par hôte et sert de base à tous les calculs de capacité de la mise à l'échelle automatique. **Breadth-first** répartit les nouvelles sessions entre les hôtes disponibles ; **depth-first** remplit un hôte jusqu'à la limite avant d'utiliser le suivant.

> **Piège d'examen.** Depth-first avec la limite maximale de sessions par défaut, très élevée, place tous les utilisateurs sur le premier hôte. Fixez une limite maximale de sessions réaliste dès que vous utilisez depth-first ou la mise à l'échelle automatique.

<!-- section: autoscale | objectives: 4.1.5 -->
## Implémenter la mise à l'échelle automatique avec des plans de mise à l'échelle

Un **plan de mise à l'échelle** (scaling plan) démarre et arrête les hôtes de session selon un planning et selon la charge. Prérequis et règles :

| Règle | Détail |
| --- | --- |
| Autorisation | Rôle **Desktop Virtualization Power On Off Contributor** pour le principal de service Azure Virtual Desktop (ou une identité managée du pool d'hôtes), à l'étendue de l'**abonnement** des hôtes de session ; une étendue inférieure empêche la mise à l'échelle de fonctionner |
| Attribution | Un plan peut servir plusieurs pools d'hôtes **du même type** ; un pool d'hôtes a **un** plan au maximum |
| Région | Le plan est créé dans la même région Azure que l'objet pool d'hôtes ; les hôtes de session peuvent être ailleurs |
| Fuseau horaire | Un par plan ; les heures du planning sont lues dans ce fuseau |
| Prérequis en regroupé | Une **limite maximale de sessions** personnalisée sur le pool d'hôtes |
| Autres outils | Ne pas combiner avec le script de mise à l'échelle Azure Automation ni avec des outils tiers sur le même pool d'hôtes |
| Hôtes exclus | Les machines virtuelles portant l'**étiquette d'exclusion** du plan (par exemple `excludeFromScaling`) ne sont jamais démarrées, arrêtées ni drainées |

Chaque planning comporte quatre phases : **montée en charge (ramp-up)**, **pointe (peak)**, **baisse de charge (ramp-down)** et **heures creuses (off-peak)**.

| Paramètre (regroupé) | Effet |
| --- | --- |
| Pourcentage minimal d'hôtes | Hôtes maintenus en marche, arrondi au supérieur (10 % de 7 hôtes = 1 hôte) |
| Seuil de capacité | Capacité utilisée = sessions ÷ (hôtes disponibles × limite maximale de sessions). Au-delà du seuil, un hôte est démarré |
| Algorithme d'équilibrage de charge | Remplace le paramètre du pool d'hôtes pendant la phase : breadth-first recommandé pour la montée en charge, depth-first pour les heures creuses |
| Forcer la déconnexion (baisse de charge uniquement) | Draine les hôtes qui ont le moins de sessions, avertit les utilisateurs, les déconnecte après le délai d'attente, puis libère les machines. Sans cette option, choisissez d'arrêter les hôtes sans session active ni déconnectée, ou sans session active |

Exemple : 2 hôtes × 20 sessions = une capacité de 40 sessions. Avec un seuil de 75 %, un troisième hôte démarre quand les sessions dépassent 30. La mise à l'échelle automatique n'arrête jamais d'hôte pendant la montée en charge, et elle n'arrête un hôte que si la capacité restante reste sous le seuil.

**Pools d'hôtes personnels.** Pour chaque phase : démarrer les machines attribuées, les machines attribuées et non attribuées, ou aucune à l'heure de début ; **Démarrer la machine virtuelle à la connexion** (Start VM on Connect, fortement recommandé si les machines ne sont pas démarrées en montée en charge) ; et les actions après une déconnexion ou une fermeture de session (0 à 360 minutes) : **libérer**, **mettre en veille prolongée** ou rien. La veille prolongée n'est pas prise en charge avec FSLogix ni App attach.

**Méthodes de mise à l'échelle des pools regroupés :** la mise à l'échelle **par gestion de l'alimentation** (power management) démarre et arrête les hôtes existants ; la mise à l'échelle **dynamique** (préversion) crée et supprime aussi des hôtes, et exige un pool d'hôtes avec une **configuration d'hôte de session**.

Pour réduire la capacité utilisée, fermez les sessions déconnectées avec la stratégie *Set time limit for disconnected sessions* (*Remote Desktop Session Host > Session Time Limits*) par Intune ou par stratégie de groupe.

> **Piège d'examen.** Pour les pools d'hôtes regroupés, la mise à l'échelle automatique **écrase le mode drainage** : pour garder un hôte hors service pendant une maintenance, utilisez l'**étiquette d'exclusion**, pas le mode drainage. Et Démarrer la machine virtuelle à la connexion ne démarre une machine que lorsqu'un utilisateur se connecte ; il n'en arrête jamais.

<!-- section: sessions-app-groups | objectives: 4.1.6 -->
## Gérer les sessions actives et les groupes d'applications

Le **mode drainage** (*Pools d'hôtes > Hôtes de session > Activer le mode drainage*) bloque les nouvelles sessions sur un hôte, tandis que les sessions existantes continuent jusqu'à ce que les utilisateurs se déconnectent ou qu'un administrateur y mette fin ; les administrateurs peuvent toujours se connecter directement. Rôle requis : **Desktop Virtualization Session Host Operator**.

Depuis la liste des sessions d'un hôte, un administrateur peut **envoyer un message**, **déconnecter** une session (elle reste ouverte sur l'hôte) ou **fermer la session** d'un utilisateur (la session se termine, le travail non enregistré est perdu). Le rôle **Desktop Virtualization User Session Operator** permet ces actions sans gérer le pool d'hôtes.

```powershell
# Drain a session host
Update-AzWvdSessionHost -ResourceGroupName rg-avd -HostPoolName hp-sales -Name sh-0.contoso.com -AllowNewSession:$false
# List the sessions of the host pool
Get-AzWvdUserSession -ResourceGroupName rg-avd -HostPoolName hp-sales
# Warn the user of session 2, then sign it out
Send-AzWvdUserSessionMessage -ResourceGroupName rg-avd -HostPoolName hp-sales -SessionHostName sh-0.contoso.com -UserSessionId 2 -MessageTitle "Maintenance" -MessageBody "Save your work: sign-out in 10 minutes."
Remove-AzWvdUserSession -ResourceGroupName rg-avd -HostPoolName hp-sales -SessionHostName sh-0.contoso.com -Id 2 -Force
```

`Disconnect-AzWvdUserSession` déconnecte sans fermer la session.

**Groupes d'applications.** Suivez leur utilisation avec les paramètres de diagnostic du groupe d'applications (Checkpoints, Errors, Management) : `WVDCheckpoints` enregistre chaque RemoteApp ouverte par un utilisateur, alors que l'usage des applications dans un bureau complet n'y est pas suivi ; `ResourceAlias` dans `WVDConnections` n'indique que la première ressource d'une connexion. Les attributions se gèrent sur le groupe d'applications (*Attributions*) ; `Register-AzWvdApplicationGroup` l'inscrit dans un espace de travail. Un utilisateur qui ne voit pas une application attendue : vérifiez l'attribution, l'inscription dans l'espace de travail, puis les journaux **Feed** et **Errors**.

> **Conseil d'examen.** Le mode drainage est la première étape avant de corriger un hôte à la main ; ensuite, envoyez un message, attendez et fermez les sessions restantes. Dans un pool d'hôtes couvert par un plan de mise à l'échelle, ajoutez aussi l'étiquette d'exclusion.

<!-- section: key-points -->
## Points clés

- Journaux du service : paramètres de diagnostic sur les pools d'hôtes, espaces de travail et groupes d'applications vers les tables `WVD*`. Données des hôtes de session : agent Azure Monitor avec identité managée + DCR.
- Insights : le workbook de configuration déploie les deux ; la consultation exige Desktop Virtualization Reader + Log Analytics Reader.
- Workbooks personnalisés : enregistrer une copie, modifier ; les copies ne reçoivent pas les mises à jour du modèle ; l'enregistrement exige Workbooks Contributor ou Monitoring Contributor.
- Dimensionnement : 6 / 4 / 2 / 1 utilisateurs par vCPU pour les charges légère / moyenne / lourde / intensive ; préférez plusieurs hôtes de 4 à 24 vCPU ; fixez une vraie limite maximale de sessions.
- Plan de mise à l'échelle : Power On Off Contributor à l'étendue de l'abonnement, un plan par pool d'hôtes, même type, même région, quatre phases ; étiquette d'exclusion, pas mode drainage, pour la maintenance.
- Sessions : mode drainage, message, déconnexion, fermeture de session ; rôles Session Host Operator et User Session Operator.
