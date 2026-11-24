Les questions de supervision donnent un symptôme et une liste d'outils : vous choisissez celui qui répond exactement à la question. Network Watcher diagnostique un flux ou une passerelle, les journaux de flux et traffic analytics enregistrent ce qui s'est passé, Network Insights d'Azure Monitor montre l'état de tout le réseau, la télémétrie de DDoS Protection dit si vous êtes attaqué, et Microsoft Defender for Cloud classe les faiblesses réseau par risque.

<!-- section: network-watcher-configuration | objectives: 1.4.1 -->
## Configurer la supervision, les diagnostics et les journaux de Network Watcher

Network Watcher est **régional**. Il est activé automatiquement dans une région quand vous y créez ou mettez à jour un réseau virtuel, sous la forme d'une instance nommée `NetworkWatcher_<region>` dans le groupe de ressources **NetworkWatcherRG** ; une instance par région et par abonnement. Si l'abonnement a refusé l'activation automatique, créez l'instance vous-même avant d'utiliser un outil dans cette région. Supprimer une instance supprime ses journaux de flux, ses moniteurs de connexion et ses captures de paquets dans la région.

```bash
az network watcher configure --resource-group NetworkWatcherRG --locations westeurope --enabled
```

Les **journaux de flux** enregistrent les flux IP (5-tuple, sens, état, octets et paquets) chaque minute, en JSON, dans un compte de stockage :

| | Journaux de flux de réseau virtuel | Journaux de flux NSG |
| --- | --- | --- |
| Statut | Actuels | Mis hors service le 30 septembre 2027 ; il n'est plus possible d'en créer. Migrez |
| Cible | Réseau virtuel, sous-réseau ou interface réseau (priorité : interface réseau, puis sous-réseau, puis réseau virtuel) | Un groupe de sécurité réseau |
| Contenu | Tous les flux de la portée, autorisés ou refusés par les règles NSG ou les règles d'administration de la sécurité de Virtual Network Manager ; état de chiffrement | Les flux évalués par ce NSG |

Règles du compte de stockage : **même région** que la cible, même abonnement ou abonnement du même locataire Microsoft Entra, performances **Standard** (pas Premium). La rotation d'une clé gérée par le client sur le compte arrête la journalisation jusqu'à ce que vous désactiviez puis réactiviez le journal de flux.

**Traffic analytics** traite les journaux de flux dans un **espace de travail Log Analytics** (table `NTANetAnalytics` pour les journaux de flux de réseau virtuel) et y ajoute le contexte géographique, topologique et de sécurité : principaux interlocuteurs, ports ouverts, adresses IP malveillantes. Intervalle de traitement : **toutes les 60 minutes** (par défaut) ou **toutes les 10 minutes**.

```bash
az network watcher flow-log create --location westeurope --resource-group RG1 --name fl-vnet1 \
  --vnet VNet1 --storage-account stflowlogs01 \
  --traffic-analytics true --workspace law-network --interval 10
```

Le **Moniteur de connexion** teste en continu l'accessibilité et la latence (pourcentage de vérifications en échec, durée d'aller-retour) entre des sources et des destinations :

- Sources : VM et groupes de machines virtuelles identiques Azure dotés de l'**extension Network Watcher** (installée pour vous par le portail), et machines locales activées avec **Azure Arc** et l'**agent Azure Monitor**. Le portail active les extensions de surveillance, mais vous activez vous-même l'agent Arc sur chaque hôte local, et la solution **Network Performance Monitoring** doit être activée dans l'espace de travail Log Analytics (**+ Enable Non-Azure**). L'agent Log Analytics n'est plus pris en charge.
- Destinations : VM, URL, FQDN, adresses IP, URL Microsoft 365 ; aucun agent nécessaire.
- Structure : un moniteur de connexion régional contient des **groupes de tests** ; chaque groupe de tests a des sources, des destinations et des **configurations de test** (TCP, HTTP ou ICMP, port, fréquence, seuils). Chaque combinaison source × destination × configuration est un test.
- Limites par région et par abonnement : 100 moniteurs de connexion ; par moniteur : 20 groupes de tests, 100 sources et destinations, 20 configurations de test.

Les journaux de ressources et les métriques des ressources réseau (passerelle VPN, équilibreur de charge, passerelle d'application, IP publique) se collectent avec un **paramètre de diagnostic** vers un espace de travail Log Analytics, un compte de stockage ou un hub d'événements.

<!-- section: network-watcher-troubleshooting | objectives: 1.4.2 -->
## Dépanner avec Network Watcher

| Question posée | Outil |
| --- | --- |
| Le trafic TCP/UDP entre VM1 et une adresse est-il autorisé, et quelle règle décide ? | **Vérification des flux IP** (règles NSG et règles d'administration de Virtual Network Manager d'une interface réseau de VM) |
| Même question pour ICMP, pour un groupe de machines virtuelles identiques ou une passerelle d'application v2, ou pour une étiquette de service ou un préfixe | **Diagnostics NSG** (peut aussi ajouter une règle de priorité supérieure) |
| Quelles règles s'appliquent à une interface réseau (NSG du sous-réseau + NSG de l'interface, agrégés) ? | **Règles de sécurité effectives** |
| Où va le trafic vers cette adresse ? | **Tronçon suivant** (type, IP, table de routage) |
| VM1 peut-elle joindre ce FQDN sur le port 1433 maintenant, et qu'est-ce qui bloque ? | **Résolution des problèmes de connexion** (test ponctuel ; latence, tronçons, NSG, UDR, pare-feu invité, processeur) |
| L'accessibilité et la latence doivent-elles être suivies dans le temps avec des alertes ? | **Moniteur de connexion** |
| Que passe-t-il exactement sur le réseau ? | **Capture de paquets** |
| Pourquoi un tunnel de site à site est-il tombé ? | **Résolution des problèmes de VPN** |
| Qu'est-ce qui est relié à quoi ? | **Topologie** |

```bash
az network watcher test-ip-flow --resource-group RG1 --vm VM1 --nic vm1-nic \
  --direction Outbound --protocol TCP --local 10.1.0.4:60000 --remote 13.107.21.200:80
az network watcher troubleshooting start --resource-group RG1 --resource VNet1toSite1 \
  --resource-type vpnConnection --storage-account $storageId \
  --storage-path https://stdiag01.blob.core.windows.net/vpnts
```

Détails qui décident des réponses :

- La **capture de paquets** exige l'extension de VM `AzureNetworkWatcherExtension`. Sortie sur le disque de la VM ou dans un blob de stockage ; filtres par IP, port et protocole ; limite de durée par défaut de 18 000 secondes (5 heures) ; la capture **continue** utilise un tampon circulaire de fichiers pendant sept jours au plus. Jusqu'à 10 000 sessions par région et par abonnement.
- La **résolution des problèmes de VPN** prend en charge les passerelles VPN basées sur des routes et les connexions IPsec ou de réseau virtuel à réseau virtuel, pas ExpressRoute, les passerelles basées sur des stratégies ni les connexions point à site. Elle écrit ses journaux dans un compte de stockage et renvoie des types d'erreur comme `Authentication` (clé prépartagée différente), `PeerReachability` et `IkePolicyMismatch`. Une seule opération à la fois par abonnement. Avec Azure CLI, la passerelle et le compte de stockage doivent être dans le même groupe de ressources ; sinon, utilisez PowerShell ou le portail.
- La **résolution des problèmes de connexion** part d'une VM, d'un groupe de machines virtuelles identiques, d'un hôte Azure Bastion ou d'une passerelle d'application v2 ; son mode sans agent (préversion) n'exige pas l'extension.
- Chaque outil exige une instance Network Watcher dans la région de la ressource.

> **Piège d'examen.** La vérification des flux IP répond **Accès autorisé** et pourtant la connexion échoue : le problème ne vient pas d'un NSG. Vérifiez la route avec le tronçon suivant, puis le pare-feu invité et l'application avec la résolution des problèmes de connexion.

<!-- section: azure-monitor-network-insights | objectives: 1.4.3 -->
## Superviser les réseaux avec Network Insights d'Azure Monitor

**Network Insights** d'Azure Monitor (Azure Monitor > Réseaux) est une vue prête à l'emploi de toutes les ressources réseau des abonnements sélectionnés, **sans aucune configuration** :

| Zone | Ce qu'elle apporte |
| --- | --- |
| Topologie | Carte interactive des réseaux virtuels et des ressources connectées, entre abonnements, régions et groupes de ressources ; exploration d'une ressource |
| Intégrité et métriques du réseau | Une vignette par type de ressource avec le nombre d'instances et l'état Resource Health (par exemple 4 connexions VPN et ExpressRoute saines sur 6), les alertes et les liens vers les métriques |
| Vue de la ressource | Pour les ressources intégrées (passerelle d'application, par exemple) : liaison entre front-ends, écouteurs, règles et pools de back-ends, avec l'intégrité des back-ends |
| Connectivité | Résultats de tous les tests du Moniteur de connexion : accessibilité selon vos seuils de pourcentage de vérifications en échec et de durée d'aller-retour |
| Trafic | Configuration des journaux de flux et de traffic analytics par région ; recherche des NSG qui s'appliquent à une adresse IP |
| Boîte à outils de diagnostic | Raccourcis vers la capture de paquets, la résolution des problèmes de VPN, la résolution des problèmes de connexion, le tronçon suivant et la vérification des flux IP |

Réponses types : « trouver toutes les connexions VPN défaillantes dans cinq abonnements » relève de l'intégrité du réseau ; « voir quel pool de back-ends rend une passerelle d'application défaillante » relève de la vue de la ressource ; « alerter quand la latence d'une connexion dépasse un seuil » utilise les métriques du Moniteur de connexion avec une règle d'alerte Azure Monitor.

<!-- section: ddos-protection | objectives: 1.4.4 -->
## Activer et superviser la protection DDoS

Chaque adresse IP publique Azure bénéficie de la **protection DDoS d'infrastructure**, gratuite et sans configuration. Azure DDoS Protection ajoute une atténuation de couche 3 et 4 adaptée à votre trafic, de la télémétrie et des alertes. Les attaques de couche 7 exigent un WAF (Application Gateway ou Azure Front Door).

| | DDoS Network Protection | DDoS IP Protection |
| --- | --- | --- |
| Activée sur | Un **plan de protection DDoS** lié à des réseaux virtuels : chaque adresse IP publique des ressources de ces réseaux est protégée | Chaque adresse IP publique, sans plan |
| Portée | Un plan pour le locataire ; des réseaux virtuels de n'importe quel abonnement du même locataire Microsoft Entra | Par IP |
| Tarification | Par plan, couvrant 100 adresses IP publiques | Par IP protégée |
| DDoS Rapid Response, protection des coûts, remise WAF | Oui | Non |
| IP publique Basic | Protégée | Non prise en charge |

Communs aux deux : surveillance permanente, trois stratégies d'atténuation ajustées automatiquement par IP publique (TCP SYN, TCP, UDP), métriques, alertes, rapports et journaux de flux d'atténuation. Une stratégie personnalisée DDoS Protection (préversion) peut fixer des seuils de détection par protocole sur les adresses IP frontales d'un Standard Load Balancer. Une IP publique attachée à une passerelle NAT ne peut pas être protégée ; la protection DDoS des IP publiques d'une passerelle NAT StandardV2 est en préversion.

```bash
az network ddos-protection create --resource-group RG1 --name ddos-plan-contoso
az network vnet update --resource-group RG1 --name VNet1 \
  --ddos-protection-plan ddos-plan-contoso --ddos-protection true
az network public-ip update --resource-group RG1 --name app-pip --ddos-protection-mode Enabled
```

La supervision se fait sur la ressource **adresse IP publique** :

| Signal | Usage |
| --- | --- |
| Métrique **Under DDoS attack or not** | 0 = pas d'attaque, 1 = attaque. Règle d'alerte : Maximum, supérieur ou égal à 1 |
| Métriques **Inbound packets dropped DDoS**, **Inbound packets forwarded DDoS**, **Inbound packets DDoS** | Trafic nettoyé, transmis et total pendant l'atténuation |
| Journal `DDoSProtectionNotifications` | Début et fin de l'atténuation |
| Journal `DDoSMitigationFlowLogs` | Flux abandonnés et transmis pendant une attaque, pour Microsoft Sentinel ou un SIEM |
| Journal `DDoSMitigationReports` | Rapports d'attaque par tranches de cinq minutes ; en cours de mise hors service : Learn donne mi-août 2026 pour la fin de cette catégorie et septembre 2026 pour l'ancien pipeline (dates approximatives), reconstruisez donc ces rapports à partir de `DDoSMitigationFlowLogs`, dont les noms de colonnes changent aussi |

Les journaux exigent un **paramètre de diagnostic** sur l'adresse IP publique. La télémétrie et les alertes n'existent que tant qu'une IP publique est protégée.

> **Piège d'examen.** « Être aidé par des experts Microsoft pendant une attaque et obtenir des crédits pour les coûts de montée en charge qu'elle provoque » : DDoS **Network** Protection. IP Protection offre la même atténuation, mais ni Rapid Response ni protection des coûts.

<!-- section: defender-secure-score | objectives: 1.4.5 -->
## Évaluer les recommandations réseau du degré de sécurisation

Microsoft Defender for Cloud évalue les ressources par rapport au **benchmark de sécurité cloud Microsoft** (MCSB) et liste des **recommandations**. Le plan gratuit **Foundational CSPM** comprend déjà le degré de sécurisation, les recommandations et l'inventaire des ressources.

Comment évolue le degré de sécurisation classique (portail Azure) :

- Les recommandations sont regroupées en **contrôles de sécurité**, chacun avec un **score maximal**. Points par ressource = score maximal ÷ (ressources saines + ressources non saines).
- Un contrôle ne donne tous ses points que lorsque **chaque** recommandation qu'il contient est corrigée sur chaque ressource. L'**augmentation potentielle du score** indique le gain.
- Les recommandations marquées **Preview (Préversion)** ne comptent pas tant qu'elles ne sont pas en disponibilité générale.
- Les scores sont recalculés environ toutes les huit heures.
- Sur plusieurs abonnements, le score global est une somme pondérée, pas une moyenne des pourcentages par abonnement. Le portail Microsoft Defender affiche un autre modèle, le **Cloud Secure Score** basé sur les risques ; le score classique reste dans le portail Azure (**Recommandations** > **Switch to classic view**).

| Contrôle réseau (score maximal) | Correction qui rapporte ses points |
| --- | --- |
| Sécuriser les ports de gestion (8) | Accès juste-à-temps aux VM et groupes de sécurité réseau |
| Restreindre l'accès réseau non autorisé (4) | Groupes de sécurité réseau, Azure Private Link pour les services PaaS, Pare-feu Azure sur les réseaux virtuels |
| Protéger les applications contre les attaques DDoS (2) | Azure DDoS Protection et un pare-feu d'applications web |

| Recommandation réseau | Gravité |
| --- | --- |
| Internet-facing virtual machines should be protected with network security groups | Élevée |
| All network ports should be restricted on network security groups associated to your virtual machine | Élevée |
| Management ports of virtual machines should be protected with just-in-time network access control | Élevée |
| Management ports should be closed on your virtual machines | Moyenne |
| IP forwarding on your virtual machine should be disabled | Moyenne |
| Azure DDoS Protection Standard should be enabled | Moyenne |
| Non-internet-facing virtual machines should be protected with network security groups | Faible |
| (Enable if required) Subnets should be associated with a network security group | Faible |

Pour faire monter le score : corrigez (manuellement ou avec **Corriger** (Fix) quand c'est proposé), et utilisez **Appliquer** (Enforce) ou **Refuser** (Deny) pour que les nouvelles ressources soient conformes.

> **Conseil d'examen.** Le gain le plus rapide vient du contrôle dont l'augmentation potentielle est la plus forte, pas de la recommandation qui compte le plus de ressources non saines : un contrôle ne rapporte que lorsque toutes ses recommandations sont corrigées.

<!-- section: attack-path-analysis | objectives: 1.4.6 -->
## Évaluer les risques réseau avec l'analyse du chemin d'attaque

L'analyse du chemin d'attaque cherche dans le **graphique de sécurité cloud** des chemins exploitables qui partent de l'**extérieur** de l'organisation (une VM vulnérable exposée à Internet, par exemple), suivent un mouvement latéral (connexions réseau, identités attachées et leurs autorisations) et atteignent une **cible critique** comme une base de données contenant des données sensibles.

| Exigence | Détail |
| --- | --- |
| Plan | **Defender CSPM** (pas inclus dans Foundational CSPM) |
| Données | Analyse sans agent des VM, ou évaluation des vulnérabilités de Defender for Servers |
| Rôles | Security Reader, Security Admin, Reader, Contributor ou Owner |

Traiter un chemin dans le portail Azure : **Defender for Cloud** > **Analyse du chemin d'attaque** > sélectionnez un chemin (triés par risque) > sélectionnez un nœud pour voir son onglet **Insight** et ses **Recommandations**, ou ouvrez **Correction** (Remediation) :

- Les **recommandations** coupent le chemin ; les **recommandations supplémentaires** (Additional recommendations) réduisent le risque sans le couper entièrement. Corrigez d'abord les premières.
- Coupures réseau typiques : fermer le port de gestion exposé ou restreindre la règle NSG, retirer l'adresse IP publique, placer la ressource derrière un pare-feu ou un point de terminaison privé.
- Un chemin résolu peut mettre jusqu'à 24 heures à quitter la liste. Une liste vide est possible : seuls les chemins réels, exploitables depuis l'extérieur, sont affichés.

<!-- section: cloud-security-explorer | objectives: 1.4.7 -->
## Trouver les ressources réseau avec l'explorateur de sécurité du cloud

L'explorateur de sécurité du cloud exécute des requêtes de graphe sur le même graphique de sécurité cloud pour trouver des ressources de manière proactive, avant qu'un chemin d'attaque n'existe : inventaire, exposition à Internet, autorisations, mouvement latéral, sur Azure, AWS et GCP.

- Exige **Defender CSPM** (et l'analyse sans agent) ; avec seulement Defender for Servers Plan 2, vous pouvez rechercher des clés et des secrets, mais pas utiliser tout l'explorateur. Mêmes rôles que l'analyse du chemin d'attaque. Les données de configuration sont actualisées chaque jour.
- **Defender for Cloud** > **Cloud Security Explorer** : sélectionnez un type de ressource, sélectionnez **+** pour ajouter des conditions et des sous-filtres (par exemple sur l'exposition à Internet ou les connexions à d'autres ressources), puis **Rechercher** (Search).
- Les **modèles de requête** en bas de la page fournissent des questions toutes faites ; ouvrez-en un, ajustez-le, exécutez-le.
- **Share query link** copie la requête ; **Download CSV report** exporte les résultats.

| Besoin | Outil |
| --- | --- |
| Score et liste priorisée de mauvaises configurations | Degré de sécurisation et recommandations (Foundational CSPM) |
| Quelles expositions mènent réellement à une ressource critique ? | Analyse du chemin d'attaque (Defender CSPM) |
| Question ponctuelle : « quelles VM sont exposées à Internet et peuvent joindre un compte de stockage contenant des données sensibles ? » | Explorateur de sécurité du cloud (Defender CSPM) |

<!-- section: key-points -->
## Points clés

- Network Watcher : une instance par région (`NetworkWatcher_<region>`, NetworkWatcherRG) ; chaque outil l'exige dans la région de la ressource.
- Les journaux de flux de réseau virtuel remplacent les journaux de flux NSG (mis hors service le 30 septembre 2027) ; compte de stockage dans la même région, Standard ; traffic analytics dans Log Analytics toutes les 10 ou 60 minutes.
- Vérification des flux IP pour une VM et TCP/UDP ; diagnostics NSG pour ICMP, les groupes de machines virtuelles identiques et les étiquettes de service ; tronçon suivant pour le routage ; résolution des problèmes de connexion pour l'instant présent, Moniteur de connexion dans la durée ; la résolution des problèmes de VPN exige un compte de stockage.
- Network Insights : vues d'intégrité, de topologie, de connectivité et de trafic sans configuration.
- DDoS Network Protection = plan par locataire lié à des réseaux virtuels, avec Rapid Response et protection des coûts ; IP Protection = par IP publique. Alertez sur **Under DDoS attack or not**.
- Le degré de sécurisation et les recommandations sont gratuits ; l'analyse du chemin d'attaque et l'explorateur de sécurité du cloud exigent Defender CSPM.
