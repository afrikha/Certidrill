Ce chapitre couvre les outils qui enregistrent, testent et imposent le filtrage du trafic au-delà d'un seul NSG : les journaux de flux du réseau virtuel et leur lecture, la vérification du flux IP, les règles NSG dont Azure Bastion a besoin, et les règles d'administration de sécurité déployées par Azure Virtual Network Manager. Les questions d'examen donnent un extrait de journal, un ensemble de règles ou une exigence de gouvernance, et demandent ce qui est arrivé à un flux ou ce qu'il faut configurer.

<!-- section: vnet-flow-logs | objectives: 5.1.6 -->
## Implémenter les journaux de flux du réseau virtuel

Les **journaux de flux du réseau virtuel** (virtual network flow logs) sont une fonctionnalité de Network Watcher qui enregistre les flux IP traversant un réseau virtuel (couche 4 : 5-tuple, direction, état, autorisé ou refusé, octets et paquets). Ils remplacent les **journaux de flux NSG** : ceux-ci n'acceptent plus de nouvelle création et sont mis hors service le **30 septembre 2027**, date à laquelle Azure supprime les ressources de journaux de flux NSG restantes (les objets blob de journaux existants restent dans le stockage).

| | Journaux de flux NSG (en cours de retrait) | Journaux de flux du réseau virtuel |
| --- | --- | --- |
| Activés sur | Un groupe de sécurité réseau | Un réseau virtuel, un sous-réseau ou une interface réseau |
| Enregistrent les décisions | Des règles NSG | Des règles NSG **et** des règles d'administration de sécurité de Virtual Network Manager |
| État du chiffrement (chiffrement de réseau virtuel) | Non | Oui |
| Trafic des passerelles VPN, ExpressRoute et d'Application Gateway | Non | Oui |
| Nouvelle création | Plus prise en charge | Oui |

Prérequis et règles à connaître :

- Le fournisseur de ressources **Microsoft.Insights** doit être inscrit dans l'abonnement.
- Le journal de flux est une ressource enfant du Network Watcher régional (portail : **Network Watcher > Journaux > Journaux de flux > Créer**, type de journal de flux **Réseau virtuel**, puis sélection d'un réseau virtuel, d'un sous-réseau ou d'une interface réseau comme cible).
- Le **compte de stockage** doit être dans la **même région** que le réseau virtuel, dans le même abonnement ou dans un abonnement associé au même locataire Microsoft Entra, et en performance **Standard** (Premium n'est pas pris en charge). Toute redondance convient (LRS, ZRS, GRS, GZRS).
- La **rétention (jours)** n'est disponible qu'avec les comptes Standard v2 universels ; **0** conserve les journaux jusqu'à ce que vous les supprimiez.
- Si vous activez les journaux de flux à plusieurs niveaux, le plus spécifique s'applique : **carte réseau > sous-réseau > réseau virtuel**.
- La rotation de la clé gérée par le client du compte de stockage arrête les journaux de flux : désactivez-les puis réactivez-les.
- L'**analyse du trafic** (traffic analytics, facultative, onglet **Analytique**) traite les journaux dans un espace de travail Log Analytics toutes les **10 minutes** ou toutes les **heures** (par défaut). La collecte des journaux de flux comprend une offre gratuite de 5 Go par mois et par abonnement ; l'analyse du trafic n'en a pas.
- Les flux des machines virtuelles vers un circuit ExpressRoute ne sont pas enregistrés si la journalisation n'est activée que sur le sous-réseau de la passerelle (et le trafic FastPath contourne la passerelle) : journalisez plutôt le sous-réseau ou la carte réseau de la machine virtuelle.
- Certains services ne prennent pas en charge les journaux de flux du réseau virtuel, par exemple App Service, Azure Functions, Logic Apps, Azure Container Instances, Azure Container Apps, Azure DNS Private Resolver et Azure SQL Managed Instance.

```bash
az provider register --namespace Microsoft.Insights

az network watcher flow-log create --location westeurope \
  --resource-group RG-Net --name fl-vnet-hub \
  --vnet VNet-Hub --storage-account stflowlogsweu \
  --traffic-analytics true --workspace law-network --interval 10
```

À grande échelle, utilisez les définitions Azure Policy intégrées : **Audit flow logs configuration for every virtual network** (audit seulement) et **Deploy a flow log resource with target virtual network** (DeployIfNotExists, avec une identité managée et une tâche de correction pour les réseaux virtuels existants).

> **Piège d'examen.** L'exigence « commencer à journaliser les flux du NSG de Subnet1 » se traite par un journal de flux du réseau virtuel sur le sous-réseau (ou le réseau virtuel), pas par un nouveau journal de flux NSG. Désactivez tout journal de flux NSG restant sur les mêmes charges de travail pour éviter les doublons.

<!-- section: interpret-flow-logs | objectives: 5.1.7 -->
## Interpréter les journaux de flux du réseau virtuel

Les enregistrements sont collectés chaque minute et écrits en JSON dans des objets blob de blocs (un objet blob par heure) du compte de stockage. Chaque enregistrement porte la ressource cible, l'adresse MAC de l'interface réseau et une hiérarchie : `flowRecords` > `flows` (une entrée par ACL évaluatrice, identifiée par `aclID` : un NSG ou Virtual Network Manager) > `flowGroups` (un par `rule`) > `flowTuples`.

Un tuple de flux en version 2 comporte 13 champs séparés par des virgules :

| Position | Champ | Valeurs |
| --- | --- | --- |
| 1 | Horodatage | Époque UNIX |
| 2–3 | IP source, IP de destination | |
| 4–5 | Port source, port de destination | |
| 6 | Protocole | Numéro IANA : 6 = TCP, 17 = UDP, 1 = ICMP |
| 7 | Direction | `I` entrant, `O` sortant |
| 8 | État du flux | `B` début, `C` continuation, `E` fin, `D` refus |
| 9 | Chiffrement | `X` chiffré, `NX` non chiffré (par défaut), `NX_...` motifs |
| 10–13 | Paquets envoyés, octets envoyés, paquets reçus, octets reçus | De la source vers la destination, puis de la destination vers la source |

Exemple d'enregistrements dans un groupe de flux dont la `rule` est `UserRule_Deny-RDP-Internet` :

```text
1763372400,203.0.113.50,10.1.2.4,51234,3389,6,I,D,NX,0,0,0,0
1763372410,10.1.2.4,198.51.100.20,40100,443,6,O,B,NX,0,0,0,0
1763372470,10.1.2.4,198.51.100.20,40100,443,6,O,E,NX,12,1830,10,9620
```

Lecture :

- Ligne 1 : une connexion TCP entrante depuis Internet vers le port 3389 de 10.1.2.4 a été **refusée** (`D`) par la règle nommée dans le groupe de flux. Les flux refusés ont des compteurs à zéro.
- Lignes 2–3 : un flux HTTPS sortant de 10.1.2.4 a été autorisé : `B` l'ouvre, `E` le ferme, et l'enregistrement de fin compte ce qui a été échangé depuis l'enregistrement précédent de ce flux (des enregistrements `C` apparaissent pour les flux longs ; additionnez les compteurs des enregistrements `C` et `E` pour obtenir le total).
- Les noms de règles indiquent l'origine de la décision : les règles NSG apparaissent sous la forme `UserRule_` ou `DefaultRule_` suivi du nom de la règle (par exemple `DefaultRule_DenyAllInBound`), les règles d'administration de sécurité sous leur propre nom avec la configuration Virtual Network Manager comme `aclID`, et une **règle de plateforme** signale un trafic que la plateforme traite sans règle configurée (à titre informatif).

Avec l'analyse du trafic, interrogez la table `NTANetAnalytics` (elle remplace `AzureNetworkAnalytics_CL` utilisée par les journaux de flux NSG) :

```kusto
NTANetAnalytics
| where SubType == "FlowLog" and FlowStatus == "D"
| summarize DeniedFlows = count() by SrcIp, DestIp, DestPort, AclRule
| top 10 by DeniedFlows
```

> **Conseil d'examen.** Pour savoir « quelle règle a bloqué le trafic », lisez la `rule` du groupe de flux qui contient le tuple `D`. Pour savoir « combien de données ont été transférées », additionnez les compteurs d'octets des tuples `C` et `E` du même 5-tuple.

<!-- section: ip-flow-verify | objectives: 5.1.8 -->
## Vérifier le flux IP

La **vérification du flux IP** (IP flow verify, Network Watcher) teste si un paquet est autorisé ou refusé à destination ou en provenance d'une machine virtuelle. Vous indiquez la machine virtuelle (et sa carte réseau si elle en a plusieurs), la **direction**, le **protocole** (TCP ou UDP), l'**IP et le port locaux** et l'**IP et le port distants**. Elle évalue les règles effectives de tous les NSG de la carte réseau et de son sous-réseau, ainsi que les règles d'administration de sécurité de Virtual Network Manager appliquées au réseau virtuel, et renvoie **Accès autorisé** ou **Accès refusé** avec le nom de la règle (et un lien vers le NSG, sauf pour les règles par défaut).

Contraintes :

- Une instance Network Watcher doit exister dans l'abonnement et la région de la machine virtuelle.
- La machine virtuelle doit être **en cours d'exécution** (les machines arrêtées ne peuvent pas être sélectionnées).
- TCP et UDP uniquement. Pour ICMP, les instances de groupes de machines virtuelles identiques ou Application Gateway v2, utilisez les **diagnostics NSG** (NSG diagnostics).
- Elle ne vérifie que les règles de sécurité, pas le routage : un itinéraire défini par l'utilisateur qui envoie le trafic vers une appliance ne change pas sa réponse.

```bash
az network watcher test-ip-flow --resource-group RG-App --vm VM1 \
  --direction Inbound --protocol TCP \
  --local 10.1.2.4:3389 --remote 203.0.113.50:60000
```

| Question | Outil Network Watcher |
| --- | --- |
| Ce flux est-il autorisé ou refusé, et par quelle règle ? | Vérification du flux IP |
| Même question pour ICMP, un groupe identique ou une passerelle d'application | Diagnostics NSG |
| Quelles règles s'appliquent à cette carte réseau une fois fusionnés les NSG du sous-réseau et de la carte ? | Règles de sécurité effectives |
| Où part un paquet (type et IP du tronçon suivant) ? | Tronçon suivant (Next hop) |
| VM1 peut-elle joindre cette adresse et ce port de bout en bout, avec quelle latence ? | Résolution des problèmes de connexion (Connection troubleshoot) |
| Quels flux ont eu lieu dans le temps ? | Journaux de flux du réseau virtuel |

> **Piège d'examen.** Si la vérification du flux IP répond « autorisé » alors que la connexion échoue toujours, cherchez du côté du routage (itinéraire défini par l'utilisateur, appliance) ou du pare-feu du système d'exploitation invité, pas d'un NSG.

<!-- section: bastion-nsg | objectives: 5.1.9 -->
## Configurer les NSG pour l'administration à distance avec Azure Bastion

Azure Bastion permet aux administrateurs d'ouvrir des sessions RDP et SSH vers les machines virtuelles via TLS depuis le portail ou un client natif : les machines virtuelles n'ont pas besoin d'IP publique et les ports 3389 ou 22 ne sont jamais exposés à Internet. Toutes les références SKU sauf **Developer** se déploient dans un sous-réseau dédié nommé **AzureBastionSubnet**, de taille **/26 ou plus**, qui ne contient rien d'autre.

Un NSG sur AzureBastionSubnet est facultatif, mais si vous en associez un, il doit contenir **toutes** les règles suivantes (une règle manquante coupe la connectivité ou les mises à jour de la plateforme) :

| Direction | Source | Destination | Ports | Rôle |
| --- | --- | --- | --- | --- |
| Entrant | Internet (ou des IP publiques précises) | Any | TCP 443 | Sessions des utilisateurs |
| Entrant | GatewayManager | Any | TCP 443 | Plan de contrôle |
| Entrant | AzureLoadBalancer | Any | TCP 443 | Sondes d'intégrité |
| Entrant | VirtualNetwork | VirtualNetwork | 8080, 5701 | Communication entre composants Bastion |
| Sortant | Any | VirtualNetwork | 22, 3389 | Sessions vers les machines virtuelles cibles |
| Sortant | Any | AzureCloud | TCP 443 | Diagnostics et mesure |
| Sortant | VirtualNetwork | VirtualNetwork | 8080, 5701 | Communication entre composants Bastion |
| Sortant | Any | Internet | 80 | Validation des sessions et des certificats |

Sur le NSG du **sous-réseau des machines virtuelles cibles** (ou de leur carte réseau), autorisez en entrée le port 3389 ou 22 (ou le port personnalisé utilisé avec la référence SKU Standard ou Premium) depuis la **plage d'adresses d'AzureBastionSubnet**. Aucune règle entrante depuis Internet n'est nécessaire côté machine virtuelle. Avec la fonctionnalité de port personnalisé, le NSG d'AzureBastionSubnet doit aussi laisser sortir les sessions sur les ports personnalisés : autorisez la sortie vers l'étiquette de service **VirtualNetwork** plutôt que les seuls ports 22 et 3389 vers les sous-réseaux des machines virtuelles.

L'**accès juste-à-temps (JIT) aux machines virtuelles** (Microsoft Defender pour serveurs Plan 2) est l'autre modèle fondé sur les NSG : Defender pour le cloud ajoute des règles *refuser tout le trafic entrant* sur les ports d'administration sélectionnés et, pour une demande approuvée, autorise temporairement l'IP du demandeur pendant la durée choisie, puis restaure le NSG. Le JIT ne prend pas en charge les pare-feu gérés par Firewall Manager (règles classiques uniquement).

> **Piège d'examen.** Les ports 3389 ou 22 ne sont pas nécessaires en entrée sur AzureBastionSubnet : les utilisateurs joignent Bastion sur le port 443. Et la règle côté machine virtuelle doit autoriser la plage du sous-réseau Bastion, pas l'IP publique de l'utilisateur, car la session arrive sur la machine virtuelle depuis l'IP privée de Bastion.

<!-- section: avnm-security-admin | objectives: 5.1.10 -->
## Imposer la sécurité avec Azure Virtual Network Manager

**Azure Virtual Network Manager** gère de façon centralisée les réseaux virtuels de plusieurs abonnements. Son **étendue** est une liste de groupes d'administration et/ou d'abonnements ; vous activez des **fonctionnalités** (types de configuration) : Connectivity, **Security admin**, Routing. Des gestionnaires de réseaux virtuels aux étendues qui se chevauchent ne sont autorisés qu'avec des fonctionnalités différentes ; en cas de conflit, celui dont l'étendue est la plus haute l'emporte.

Les éléments de base :

1. **Groupe réseau** : un ensemble global de réseaux virtuels. L'appartenance est **statique** (vous choisissez les réseaux virtuels) ou **dynamique** (des conditions comme une étiquette ou un nom, évaluées par une définition **Azure Policy** que le groupe réseau crée).
2. **Configuration d'administration de sécurité** : elle contient des **regroupements de règles**, chacun ciblant un ou plusieurs groupes réseau et contenant des **règles d'administration de sécurité**.
3. **Déploiement** : rien ne s'applique tant que vous n'avez pas déployé la configuration dans des **régions** choisies. Une **seule configuration d'administration de sécurité par région** à la fois (utilisez plusieurs regroupements de règles à l'intérieur). Le déploiement fixe l'état cible de la région : déployer un nouvel ensemble remplace le précédent, et déployer **None** les retire. Modifier des règles impose de redéployer ; un réseau virtuel qui rejoint un groupe plus tard (statique ou dynamique) reçoit automatiquement les règles déjà déployées.

Une règle d'administration de sécurité a une **priorité** (de 1 à 4 096, la plus basse d'abord), une **action**, une direction, un protocole (TCP, UDP, ICMP, ESP, AH ou Any) et, en option, des sources, des destinations (préfixes IP ou étiquettes de service) et des ports. Les règles d'administration de sécurité sont évaluées **avant les règles NSG** :

| Action | Effet |
| --- | --- |
| Autoriser (Allow) | Le trafic passe à l'évaluation des NSG, qui peuvent encore le refuser |
| Refuser (Deny) | Le trafic est abandonné ; les NSG ne sont pas évalués |
| Toujours autoriser (Always Allow) | Le trafic est remis ; les NSG ne peuvent pas le refuser |

Modèle typique : une règle **Deny** sur les ports à haut risque (par exemple 22 et 3389 depuis Internet) pour un groupe « tous les réseaux virtuels », plus une règle **Always Allow** de priorité plus haute pour les réseaux virtuels qui ont besoin d'une exception. Les équipes d'application gardent leurs NSG pour leur propre filtrage mais ne peuvent pas ouvrir ce que la gouvernance ferme.

Les règles d'administration de sécurité s'appliquent au niveau du réseau virtuel, avec des exceptions : par défaut, elles ne s'appliquent pas aux réseaux virtuels contenant Azure SQL Managed Instance ou Azure Databricks (avec `AllowRulesOnly` défini dans la configuration d'administration de sécurité, seules ses règles Allow y sont appliquées), elles ne s'appliquent pas aux points de terminaison privés d'un réseau virtuel managé, et elles ne s'appliquent pas aux sous-réseaux d'Application Gateway (sans isolation réseau), d'Azure Bastion, du Pare-feu Azure, d'Azure Route Server, de VPN Gateway, de Virtual WAN et des passerelles ExpressRoute. Les règles arrivent selon un **modèle de cohérence éventuel** (court délai) ; sur la page **Mise en réseau** d'une machine virtuelle, elles apparaissent sous les règles NSG.

> **Piège d'examen.** « Garantir qu'aucune équipe ne puisse ouvrir le port 3389 depuis Internet, même en modifiant son NSG » se traite par une règle d'administration de sécurité **Deny**, pas par une stratégie Azure Policy sur les NSG ni par un NSG géré de façon centralisée. « Garantir que le trafic de supervision atteint toujours les machines virtuelles quoi que disent les NSG » correspond à **Always Allow**.

<!-- section: key-points -->
## Points clés

- Créez des journaux de flux du réseau virtuel (réseau virtuel, sous-réseau ou carte réseau ; la carte réseau l'emporte sur le sous-réseau, qui l'emporte sur le réseau virtuel) ; les journaux de flux NSG ne peuvent plus être créés et sont mis hors service le 30 septembre 2027.
- Stockage des journaux de flux : même région, même locataire, performance Standard ; la rétention exige un compte v2 universel ; analyse du trafic toutes les 10 ou 60 minutes dans `NTANetAnalytics`.
- Tuple : heure, IP, ports, protocole (6 TCP, 17 UDP), `I`/`O`, état `B`/`C`/`E`/`D`, chiffrement, puis compteurs ; la `rule` du groupe de flux indique la règle qui a décidé.
- Vérification du flux IP : machine virtuelle en cours d'exécution, TCP/UDP, règles NSG et règles d'administration de sécurité, réponse autorisé ou refusé avec la règle ; elle ignore le routage.
- Bastion : AzureBastionSubnet /26 ou plus ; son NSG exige 443 depuis Internet, GatewayManager et AzureLoadBalancer, 8080/5701 au sein de VirtualNetwork, et en sortie 22/3389, 443 vers AzureCloud, 80 vers Internet ; les sous-réseaux des machines virtuelles autorisent 22/3389 depuis le sous-réseau Bastion.
- Les règles d'administration de sécurité (Virtual Network Manager) sont évaluées avant les NSG : Deny et Always Allow sont définitives, Allow laisse décider les NSG ; une configuration par région, effective seulement après déploiement.
