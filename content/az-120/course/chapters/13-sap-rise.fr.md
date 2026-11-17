Avec RISE with SAP (SAP Enterprise Cloud Services, S/4HANA Cloud Private Edition) sur Azure, SAP exploite le paysage SAP dans un abonnement et un locataire Azure qui appartiennent à SAP. Le travail du client passe de l'exploitation des machines virtuelles SAP à l'intégration avec elles : connectivité réseau et DNS, services Azure qui échangent des données avec SAP, archivage, identité et supervision de la sécurité. Les questions d'examen vérifient ce que le client peut et ne peut pas faire, et quelle option de connectivité ou d'intégration convient.

<!-- section: responsibilities | objectives: 1.3.1, 1.3.3 -->
## Qui fait quoi avec RISE

| Domaine | SAP (RISE/ECS) | Client |
| --- | --- | --- |
| Paysage SAP (machines virtuelles, stockage, HANA, OS) | Le décide, le déploie et l'exploite dans l'abonnement de SAP ; seul SAP voit ces ressources | Aucun accès aux ressources Azure de l'environnement SAP |
| Réseau virtuel SAP | Le possède, le protège avec des NSG, ouvre les ports convenus | Protège ses propres réseaux virtuels avec des NSG, des pare-feu et le routage |
| Connectivité | Approuve la demande de peering ; fournit un ExpressRoute ou un VPN dédié uniquement pour atteindre le réseau SAP | Crée le peering ou le VPN depuis son hub ; possède l'ExpressRoute vers le site local et le routage central |
| Entrée depuis internet (par exemple Fiori) | L'expose via une passerelle d'application avec WAF gérée par SAP, sur demande | La planifie avec SAP |
| Services Azure qui utilisent les données SAP | Ouvre les chemins de communication sur demande | Les déploie et les exploite dans ses propres abonnements |
| Support Azure | Traite les problèmes des ressources des abonnements de SAP | N'ouvre des demandes de support Azure que pour ses propres abonnements |

Documentez chaque point de transfert (espaces d'adressage, pare-feu et routage, partages de fichiers, services Azure, DNS, propriétaire de chaque interface) pour que chaque partie puisse dépanner sa propre part : il n'y a pas de responsabilités croisées.

> **Piège d'examen.** Le Centre Azure pour les solutions SAP et Azure Monitor pour solutions SAP ne sont pas pris en charge avec RISE : le client n'a pas accès aux machines virtuelles de l'abonnement de SAP. Supervision et rapports viennent de ce que prévoit la description de service SAP.

<!-- section: network-design | objectives: 1.3.1 -->
## Concevoir la mise en réseau pour RISE

| Option | Quand l'utiliser | Limites |
| --- | --- | --- |
| **Peering de réseaux virtuels** (préféré) | Par défaut : le plus performant, latence la plus faible, débit le plus élevé ; entre locataires, celui de SAP et le vôtre | Des frais de peering s'appliquent ; les espaces d'adressage ne peuvent pas se chevaucher |
| Peering de réseaux virtuels mondial | RISE et vos charges de travail dans des régions différentes | Latence et coût plus élevés ; préférez la même région que vos charges de travail |
| VPN de réseau virtuel à réseau virtuel | Une équipe centrale veut un point d'entrée unique et sécurisé dans le réseau du client | Débit limité par la référence SKU de passerelle des deux côtés ; utilisez des passerelles redondantes interzones |
| Peering de sous-réseaux avec le service de pare-feu managé de SAP | Service facultatif : un sous-réseau RISE relié à un sous-réseau du client à travers des pare-feu | Seuls les sous-réseaux choisis communiquent ; pas de peering de réseaux virtuels |

**Hub-and-spoke.** Le réseau virtuel RISE devient un spoke du hub du client (ou d'un hub Virtual WAN que le client déploie et gère). Les utilisateurs locaux atteignent SAP par la passerelle ExpressRoute ou VPN existante du client dans le hub : le peering utilise le **transit par passerelle**, le hub offrant sa passerelle et le réseau RISE utilisant la passerelle distante. Un réseau virtuel n'a qu'une seule passerelle, locale ou distante : aucune passerelle ne peut donc être ajoutée dans le réseau RISE dans cette conception.

- L'ExpressRoute ou le VPN dédié que SAP peut fournir n'atteint que le réseau géré par SAP ; il ne permet pas d'atteindre les réseaux virtuels Azure du client.
- Concevez ExpressRoute pour la résilience (modèles de résilience élevée ou maximale).
- Pour un paysage mondial, construisez un réseau multirégion dans votre propre environnement et appairez RISE localement dans chaque zone géographique au hub régional.
- Dimensionnez la connectivité aussi pour les phases de migration et de réplication de base de données, pas seulement pour le trafic de production.

**Internet et SAP BTP.**

- L'accès internet vers et depuis RISE est désactivé par défaut ; activer un accès entrant (par exemple Fiori pour des utilisateurs externes) passe par la passerelle d'application avec WAF de SAP.
- Vos propres applications atteignent internet par vos propres services (Pare-feu Azure, passerelle NAT).
- SAP BTP s'atteint par des points de terminaison publics ; quand BTP et RISE s'exécutent tous deux dans Azure, le trafic reste sur le réseau principal d'Azure. **SAP Private Link Service** relie en privé les services BTP à votre réseau Azure, pour les requêtes émises par BTP.
- SAP ne propose en général pas de points de terminaison privés vers les charges de travail RISE.

> **Conseil d'examen.** « Les utilisateurs locaux doivent atteindre S/4HANA dans RISE par le circuit ExpressRoute existant » signifie un peering depuis le hub avec transit par passerelle, pas un nouvel ExpressRoute dans le réseau SAP.

<!-- section: network-implement | objectives: 1.3.2 -->
## Implémenter la mise en réseau pour RISE

Le peering traverse deux locataires Microsoft Entra et deux abonnements :

1. Convenez avec SAP d'espaces d'adressage sans chevauchement et des ports à ouvrir.
2. Obtenez l'**ID de ressource Azure du réseau virtuel fourni par SAP**.
3. Pour un peering entre locataires, ajoutez un utilisateur de l'autre locataire comme invité, acceptez l'invitation et accordez les autorisations réseau que le peering exige.
4. Créez le peering de votre hub vers le réseau RISE ; SAP approuve le peering de son côté.
5. Mettez à jour les NSG et le routage de votre côté et testez les ports ouverts.

```bash
az network vnet peering create \
  --resource-group rg-hub-weu \
  --vnet-name vnet-hub-weu \
  --name peer-hub-to-rise \
  --remote-vnet "/subscriptions/<sap-subscription-id>/resourceGroups/<sap-rg>/providers/Microsoft.Network/virtualNetworks/<rise-vnet>" \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit
```

Par la connexion privée, les ports ouverts couvrent RFC (BAPI, IDoc), HTTPS (OData, REST, SOAP) et, quand SAP accepte l'accès direct à la base de données, ODBC/JDBC vers HANA. Tout service Azure qui a accès à votre réseau virtuel peut alors atteindre le paysage SAP sur ces ports.

**Intégration DNS.**

| Élément | Propriétaire | Rôle |
| --- | --- | --- |
| Sous-domaine délégué (par exemple `ecs.contoso.com`) | Client | Fourni et délégué à SAP |
| Deux machines virtuelles serveurs DNS dans le réseau RISE | SAP | Principal (master) de la zone déléguée |
| Serveurs DNS du hub (AD DS ou BIND) | Client | Reçoivent la zone par **transfert de zone** depuis SAP ; vos réseaux virtuels pointent vers eux |
| Redirecteur DNS facultatif | Client | Transmet les requêtes de la zone déléguée aux serveurs DNS de SAP |

> **Piège d'examen.** Le DNS fourni par Azure et les zones DNS privées Azure ne prennent pas en charge le transfert de zone, et SAP ne prend généralement pas en charge de fournisseur DNS externe pour la zone déléguée. Le côté client a besoin de serveurs DNS sur des machines virtuelles, comme AD DS ou BIND, dans le hub.

<!-- section: azure-services | objectives: 1.3.3 -->
## Les services Azure de calcul, de réseau et de stockage avec RISE

Chaque service Azure qui s'intègre à RISE s'exécute dans l'abonnement du client, généralement sur un calcul que vous déployez dans un réseau virtuel appairé à RISE :

| Composant du client | S'exécute sur | Atteint SAP par |
| --- | --- | --- |
| **Runtime d'intégration auto-hébergé** d'Azure Data Factory ou de Synapse | Machines virtuelles du client dans Azure ou en local | Le peering, en adresses IP privées ; les NSG limitent ce qui peut se connecter |
| **Runtime d'intégration Azure** d'Azure Data Factory | Géré par Microsoft | HTTPS vers une adresse IP publique que RISE expose par sa passerelle d'application |
| **Passerelle de données locale** (Power BI, Power Apps, Logic Apps) | Machine virtuelle du client dans Azure ou en local | Le connecteur SAP .NET en RFC, BAPI et IDoc, par peering ou VPN site à site ; ou REST par la passerelle d'application RISE |
| **SAP Cloud Connector** pour vos propres intégrations vers BTP | Machines virtuelles du client (quand la connectivité de réseau virtuel existe) | Connexion privée vers SAP ; sortie vers BTP |
| Agent du connecteur de données Microsoft Sentinel | Machine virtuelle ou conteneur du client | Connexion privée vers la couche application SAP |
| Azure API Management | Abonnement du client | Gouverne les appels de Power Apps, Power BI, Functions et App Service vers SAP, avec limitation, quotas et propagation du principal SAP |

Les services réseau restent aussi du côté du client : Pare-feu Azure ou NVA dans le hub, passerelle NAT pour le trafic sortant, NSG sur vos sous-réseaux. Dans SAP, l'ABAP SDK for Azure et le Microsoft AI SDK for SAP ABAP permettent au code ABAP d'appeler directement des services Azure ; leur installation exige abapGit.

> **Piège d'examen.** Un runtime d'intégration auto-hébergé ne peut pas s'installer sur les serveurs d'applications RISE : vous n'y avez pas accès. Déployez-le sur une machine virtuelle de votre propre réseau virtuel, appairé à RISE.

<!-- section: data-management | objectives: 1.3.4 -->
## Intégrer les services de gestion des données et l'archivage

**Intégration des données.** Le connecteur détermine le runtime et le chemin réseau :

| Connecteur | Runtime | Remarques |
| --- | --- | --- |
| SAP ECC | Runtime d'intégration Azure ou auto-hébergé | L'un ou l'autre chemin |
| SAP table, SAP BW, SAP Open Hub | Runtime d'intégration auto-hébergé | Connecteur SAP .NET et modules fonction en RFC |
| SAP HANA (ODBC/JDBC) | Runtime d'intégration auto-hébergé | Uniquement si SAP a accepté l'accès direct à la base de données et ouvert l'utilisateur et le chemin |

La capture des changements de données de SAP vers Microsoft Fabric (OneLake) avec Azure Data Factory, et les analyses Microsoft Purview des sources SAP ECC, utilisent les mêmes runtimes. Contactez SAP pour les chemins de communication à ouvrir et leurs implications de licence.

**Archivage.** SAP Information Lifecycle Management (ILM) gère les volumes de données, la rétention et la mise hors service des systèmes anciens. Son **ILM Store** peut conserver les fichiers d'archive et les pièces jointes de S/4HANA dans le **Stockage Blob Azure**, via WebDAV, en appliquant les règles de rétention ILM :

1. Inscrivez une application dans Microsoft Entra ID avec un secret client ; SAP ILM s'authentifie comme ce principal de service.
2. Créez un compte de Stockage Blob (manuellement ou avec le modèle de démarrage rapide `sap-ilm-store`).
3. Attribuez **Storage Blob Data Contributor** (ou un rôle personnalisé) à cette application sur le compte.
4. Renforcez le compte : transfert sécurisé obligatoire, accès public aux objets blob désactivé, TLS 1.2 minimum, **accès par clé de compte de stockage désactivé**, et aucun autre principal ayant accès au compte.

L'archivage et la gestion des volumes de données sortent les données froides de la base HANA, ce qui maîtrise la mémoire, donc la taille et le coût de la machine virtuelle.

> **Conseil d'examen.** Quand l'énoncé dit « archiver des données S/4HANA dans Azure avec des règles de rétention », pensez à l'ILM Store SAP sur le Stockage Blob Azure, accédé par une application Microsoft Entra avec un rôle de données, avec l'accès par clé partagée désactivé.

<!-- section: identity-security | objectives: 1.3.5 -->
## Les services d'identité et de sécurité avec RISE

L'authentification unique fonctionne comme pour un système SAP autogéré, avec des limites propres à RISE :

| Scénario | Mécanisme | Configuré par |
| --- | --- | --- |
| SAP Fiori, Web GUI, Portal, HANA | SAML ou OAuth avec Microsoft Entra ID | Client |
| SAP GUI | SNC avec Microsoft Entra ID | Client |
| Web GUI, SAP Enterprise Portal | SPNEGO avec Active Directory | Client et SAP |
| SAP GUI avec AD/Kerberos | SAP SSO Secure Login Client sur les postes des utilisateurs ; les systèmes Windows RISE ne sont pas joints à votre domaine, le jeton est lu sur le client | Client, avec SAP pour tout changement |
| Produits d'authentification unique tiers | Peuvent exiger des modifications sur les systèmes RISE | Client et SAP |

- Utilisez **Microsoft Entra ID comme fournisseur d'identité** pour RISE.
- **Microsoft Entra ID Governance**, avec son intégration à SAP Cloud Identity Services, gère le cycle de vie des utilisateurs SAP et leurs autorisations ; SAP recommande de migrer de SAP Identity Management, retiré d'ici 2027, vers Microsoft Entra.

**Solution Microsoft Sentinel pour les applications SAP.**

- Déployée et gérée entièrement par le client dans son propre abonnement Azure, pas par SAP.
- Couvre uniquement la **couche application SAP** (par exemple journal d'audit, connexions, transactions sensibles). La collecte utilise un agent de connecteur de données sur une machine virtuelle ou un conteneur de votre abonnement, ou le connecteur sans agent via SAP Integration Suite.
- Les journaux d'infrastructure et d'OS de RISE ne sont disponibles que par le service facultatif **SAP LogServ**, qui s'intègre à Microsoft Sentinel.
- La solution Microsoft Sentinel pour SAP BTP ajoute BTP par les API du journal d'audit.
- Des playbooks peuvent, par exemple, bloquer un utilisateur suspect dans SAP, BTP ou Microsoft Entra ID ; Microsoft Defender XDR et Security Copilot utilisent les mêmes données.

> **Piège d'examen.** Avec RISE, le client ne peut pas installer d'agents sur les machines virtuelles de SAP. La supervision de la sécurité de RISE part de la couche application SAP (connecteur de données Sentinel), plus LogServ pour les journaux d'infrastructure.

<!-- section: key-points -->
## Points clés

- SAP possède et exploite l'abonnement et les machines virtuelles RISE ; le client s'intègre depuis ses propres abonnements et n'ouvre de demandes de support Azure que pour eux.
- Le peering de réseaux virtuels (entre locataires, même région de préférence) est le choix par défaut ; le VPN de réseau virtuel à réseau virtuel quand un point d'entrée unique est exigé.
- L'accès local passe par le hub du client avec transit par passerelle ; l'ExpressRoute propre à SAP n'atteint que le réseau SAP.
- DNS : déléguez un sous-domaine à SAP et recevez-le par transfert de zone sur des serveurs DNS hébergés sur des machines virtuelles ; les zones DNS privées Azure ne font pas de transfert de zone.
- Runtimes d'intégration, passerelles de données, Cloud Connector et collecteurs Sentinel s'exécutent sur des machines virtuelles du client dans des réseaux appairés.
- Archivez avec l'ILM Store SAP sur le Stockage Blob Azure, accédé par une application Microsoft Entra avec Storage Blob Data Contributor et clé partagée désactivée.
- Le Centre Azure pour les solutions SAP et Azure Monitor pour solutions SAP ne s'appliquent pas à RISE.
