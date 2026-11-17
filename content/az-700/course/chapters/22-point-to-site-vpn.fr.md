Un VPN de point à site (P2S) connecte des appareils individuels à un réseau virtuel à travers une passerelle VPN, sans aucun périphérique VPN côté utilisateur. L'examen demande de choisir la référence SKU de la passerelle, le type de tunnel et la méthode d'authentification adaptés à une liste de systèmes d'exploitation clients et de contraintes, puis de dépanner un client qui ne se connecte plus.

<!-- section: gateway-sku | objectives: 2.2.1 -->
## Choisir la référence SKU de la passerelle pour le point à site

Le P2S demande une passerelle de réseau virtuel de type **Vpn** avec un type de VPN **basé sur des routes** (route-based), déployée dans le sous-réseau nommé `GatewaySubnet`. Une passerelle basée sur des stratégies (policy-based) ne peut pas héberger de connexions P2S. La référence SKU fixe le nombre de connexions simultanées :

| SKU | Connexions SSTP | Connexions IKEv2/OpenVPN | Débit agrégé | Remarques |
| --- | --- | --- | --- | --- |
| Basic | 128 | IKEv2 uniquement, OpenVPN non pris en charge | 100 Mbit/s | Pas de RADIUS, pas d'IPv6, pas de BGP, non redondante interzone ; créée avec PowerShell ou Azure CLI uniquement ; dev-test |
| VpnGw1AZ | 128 | 250 | 650 Mbit/s | Generation1 |
| VpnGw2AZ | 128 | 500 | 1 Gbit/s (Generation1), 1,25 Gbit/s (Generation2) | |
| VpnGw3AZ | 128 | 1 000 | 1,25 Gbit/s (Generation1), 2,5 Gbit/s (Generation2) | |
| VpnGw4AZ | 128 | 5 000 | 5 Gbit/s | Generation2 uniquement |
| VpnGw5AZ | 128 | 10 000 | 10 Gbit/s | Generation2 uniquement |

Les règles qui décident de la réponse :

- Les limites SSTP et IKEv2/OpenVPN sont **distinctes** : une passerelle VpnGw1AZ accepte 128 connexions SSTP et 250 connexions IKEv2 en même temps.
- SSTP est plafonné à 128 connexions **quelle que soit la référence SKU**. Plus de 128 utilisateurs impose IKEv2 ou OpenVPN.
- Les références SKU redondantes interzones (`VpnGw1AZ` à `VpnGw5AZ`) sont celles à déployer aujourd'hui, avec une adresse IP publique de référence SKU Standard. Les références non AZ `VpnGw1` à `VpnGw5` ont les mêmes limites P2S mais sont en cours de migration et ne doivent plus servir pour de nouvelles passerelles.
- L'authentification Microsoft Entra ID, l'authentification RADIUS et OpenVPN excluent toutes la référence SKU Basic.
- Une passerelle **active-active** a besoin d'une adresse IP publique supplémentaire (la troisième) pour le P2S.

> **Piège d'examen.** Monter en référence SKU n'augmente jamais la limite SSTP. « 600 utilisateurs Windows en SSTP » n'a pas de réponse par la référence SKU : changez le type de tunnel pour IKEv2 ou OpenVPN et prenez VpnGw3AZ.

<!-- section: tunnel-types | objectives: 2.2.2 -->
## Sélectionner et configurer le type de tunnel

Le type de tunnel se règle sur la page **Configuration de point à site** de la passerelle, avec le **pool d'adresses** dans lequel les clients reçoivent leur adresse IP.

| Type de tunnel | Transport | Clients | À choisir quand |
| --- | --- | --- | --- |
| OpenVPN | TLS, TCP 443 sortant | Windows, macOS, Linux, iOS, Android | Appareils variés, pare-feu qui n'autorisent que HTTPS, authentification Microsoft Entra ID |
| SSTP | TLS, TCP 443 sortant | Windows uniquement | Anciens clients Windows derrière des pare-feu restrictifs |
| IKEv2 | IPsec, UDP 500 et 4500 sortants | Windows, macOS, Linux (strongSwan), iOS | Clients natifs basés sur des standards, VPN Always On |

À savoir :

- IKEv2 peut être bloqué par les pare-feu et proxys qui n'ouvrent que TCP 443 ; OpenVPN et SSTP passent.
- Le portail propose les combinaisons **IKEv2 et OpenVPN (SSL)** et **IKEv2 et SSTP (SSL)**. SSTP et OpenVPN ne peuvent pas être activés ensemble, car tous deux reposent sur TLS.
- Avec IKEv2 et SSTP, les clients Windows essaient d'abord IKEv2 puis se replient sur SSTP.
- IPv6 en P2S fonctionne avec IKEv2 et OpenVPN, pas avec SSTP.
- **SSTP est en cours de mise hors service** : activer SSTP sur une passerelle est bloqué depuis le 31 août 2026, et les connexions SSTP existantes cessent de fonctionner après le 31 mars 2027. Le remplaçant est IKEv2 ou OpenVPN.

Règles du pool d'adresses : une plage privée qui ne chevauche ni le réseau virtuel ni les réseaux locaux ; au minimum un /29 pour une passerelle active-passive et un /28 pour une passerelle active-active. Quand SSTP fait partie de plusieurs protocoles, le pool est réparti à parts égales entre les protocoles.

```powershell
$gw = Get-AzVirtualNetworkGateway -ResourceGroupName "RG1" -Name "VNet1GW"
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" -VpnClientProtocol "OpenVPN"
```

> **Conseil d'examen.** « Appareils Android », « seul TCP 443 est autorisé en sortie » ou « Microsoft Entra ID » désignent OpenVPN. « Client natif macOS » ou « tunnel d'appareil » désignent IKEv2.

<!-- section: authentication-methods | objectives: 2.2.3 -->
## Sélectionner la méthode d'authentification

| Méthode | Qui authentifie l'utilisateur | Types de tunnel | Besoin typique |
| --- | --- | --- | --- |
| Certificat Azure | La passerelle, d'après les certificats racines approuvés chargés | OpenVPN, SSTP, IKEv2 | Aucune infrastructure d'identité ; accès lié à l'appareil ; VPN Always On |
| Microsoft Entra ID | Microsoft Entra ID, à travers Azure VPN Client | OpenVPN uniquement | Identifiants Entra, accès conditionnel, authentification multifacteur |
| RADIUS | Un serveur RADIUS, en général intégré à Active Directory Domain Services | OpenVPN, SSTP, IKEv2 | Identifiants de domaine, système RADIUS ou MFA tiers existant |

**Authentification par certificat.** Chargez la clé publique du certificat racine (fichier `.cer` X.509 encodé en Base-64, collé sur une seule ligne continue) sur la page Configuration de point à site ; jusqu'à 20 certificats racines approuvés. Chaque client possède un certificat client généré à partir de cette racine, avec sa clé privée, dans `Current User\Personal`. Pour bloquer un appareil, ajoutez l'**empreinte numérique** (thumbprint) de son certificat client à la liste des certificats révoqués. Supprimer un certificat racine bloque tous les certificats clients qu'il a signés.

Plusieurs types d'authentification peuvent être sélectionnés sur une passerelle. Un client a alors besoin d'un type d'authentification pris en charge par l'un des types de tunnel configurés : avec « IKEv2 et OpenVPN » et « Microsoft Entra ID et RADIUS », les clients Entra ID n'utilisent qu'OpenVPN.

> **Piège d'examen.** Révoquer un certificat client se fait avec son empreinte numérique sur la passerelle, sans toucher au certificat racine. Supprimer le certificat racine déconnecte tous les clients qui en sont issus.

<!-- section: radius | objectives: 2.2.4 -->
## Configurer l'authentification RADIUS

Avec RADIUS, la passerelle relaie les messages d'authentification entre le client et un serveur RADIUS, par exemple Network Policy Server (NPS) joint au domaine Active Directory. Les utilisateurs se connectent avec leurs identifiants de domaine, et le serveur RADIUS peut appeler un système d'identité externe pour ajouter l'authentification multifacteur.

Exigences :

- Toute référence SKU de passerelle sauf Basic.
- La passerelle doit joindre le serveur RADIUS. Le serveur est soit dans le réseau virtuel, soit en local derrière une connexion **VPN de site à site**. Une connexion ExpressRoute ne peut pas servir à joindre un serveur RADIUS local.
- La passerelle reçoit l'adresse IP du serveur et le **secret partagé**, qui doit correspondre au secret déclaré sur le serveur RADIUS, où la passerelle est enregistrée comme client RADIUS.
- Deux serveurs RADIUS peuvent être configurés pour la haute disponibilité, chacun avec un score.
- Avec IKEv2, seule l'authentification basée sur EAP est prise en charge.

```powershell
$gw = Get-AzVirtualNetworkGateway -ResourceGroupName "RG1" -Name "VNet1GW"
$secret = Read-Host -AsSecureString -Prompt "RadiusSecret"
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" -VpnClientProtocol "IKEv2" `
  -RadiusServerAddress "10.51.0.15" -RadiusServerSecret $secret
```

Préférez l'adresse IP d'un serveur local à son nom : la passerelle peut être incapable de résoudre le nom.

> **Piège d'examen.** « Le serveur RADIUS est local et le site n'est connecté que par ExpressRoute » : l'authentification RADIUS échoue. Ajoutez une connexion VPN de site à site ou placez un serveur RADIUS dans le réseau virtuel.

<!-- section: entra-id | objectives: 2.2.5 -->
## Configurer l'authentification Microsoft Entra ID

L'authentification Microsoft Entra ID exige le type de tunnel **OpenVPN (SSL)**, une passerelle basée sur des routes qui n'est pas Basic, et **Azure VPN Client** sur les appareils (pris en charge sur Windows 11 et macOS ; le client Linux a été mis hors service le 31 août 2026). Sur la page Configuration de point à site, choisissez le type d'authentification **Microsoft Entra ID** et renseignez trois valeurs :

| Champ | Valeur |
| --- | --- |
| Tenant (Locataire) | `https://login.microsoftonline.com/{TenantID}` |
| Audience (Public) | `c632b3df-fb67-4d84-bdcf-b95ad541b5c8`, l'ID d'application Azure VPN Client inscrit par Microsoft, ou un ID d'application personnalisé |
| Issuer (Émetteur) | `https://sts.windows.net/{TenantID}/` |

Les détails qui font échouer un déploiement :

- La valeur Issuer doit se terminer par une **barre oblique finale**.
- Une passerelle ne prend en charge qu'**une** valeur Audience à la fois.
- Avec l'ID d'application inscrit par Microsoft, aucune étape de consentement administrateur n'est nécessaire. L'ancien ID d'application inscrit manuellement (`41b23e61-6c1e-4545-b367-cd054e0ed4b4` dans le cloud public Azure) exigeait d'accorder le consentement administrateur dans le locataire, et il sera mis hors service le 31 mars 2028 : migrez les passerelles et les clients vers la valeur inscrite par Microsoft.
- Pour restreindre l'accès à certains utilisateurs ou appliquer l'accès conditionnel à une passerelle précise, inscrivez une application personnalisée et utilisez son ID comme audience.

Sélectionnez ensuite **Télécharger le client VPN** : le package contient le dossier `AzureVPN` avec `azurevpnconfig.xml`, que les utilisateurs importent dans Azure VPN Client avant de se connecter avec leurs identifiants Entra.

> **Piège d'examen.** L'authentification Microsoft Entra ID ne se combine ni avec SSTP ni avec IKEv2 seul. Si la passerelle propose « IKEv2 et OpenVPN », les utilisateurs Entra ID se connectent quand même en OpenVPN.

<!-- section: client-configuration | objectives: 2.2.6 -->
## Implémenter le fichier de configuration du client VPN

Le **package de configuration du profil de client VPN** est un fichier zip généré par la passerelle (**Télécharger le client VPN** sur la page Configuration de point à site). Il ne contient pas de logiciel VPN pour OpenVPN : il contient les paramètres dont le client a besoin. Son contenu dépend des types de tunnel et d'authentification configurés :

| Dossier | Fichiers | Utilisé par |
| --- | --- | --- |
| `WindowsAmd64`, `WindowsX86` | Programme d'installation `VpnClientSetupAmd64`, `VpnClientSetupX86` | Client VPN natif de Windows, IKEv2 et SSTP |
| `Generic` | `VpnSettings.xml`, `VpnServerRoot.cer` | Client natif macOS et strongSwan sous Linux, IKEv2 |
| `AzureVPN` | `azurevpnconfig.xml` ou `azurevpnconfig_cert.xml` | Azure VPN Client, OpenVPN |
| `OpenVPN` | `vpnconfig.ovpn` | Clients OpenVPN, authentification par certificat |

Ordre des opérations pour l'authentification par certificat : générer les certificats racine et clients, charger la clé publique de la racine, configurer le pool d'adresses et le type de tunnel, enregistrer, télécharger le package, installer le certificat client et le profil sur chaque appareil.

Le package est un instantané de la configuration de la passerelle. **Générez-le et redistribuez-le après toute modification** de la configuration P2S, comme le type de tunnel ou le type d'authentification. Les clients Windows reçoivent aussi leurs routes du profil : après un changement de topologie tel qu'un nouveau peering de réseaux virtuels, téléchargez de nouveau le package pour que les clients obtiennent les nouvelles routes.

> **Conseil d'examen.** « Les utilisateurs se connectent mais n'atteignent pas le réseau virtuel nouvellement appairé » a pour réponse « télécharger et réinstaller le package de configuration du client VPN ».

<!-- section: troubleshooting | objectives: 2.2.7 -->
## Diagnostiquer les problèmes côté client et d'authentification

| Symptôme | Cause | Correction |
| --- | --- | --- |
| « A certificate could not be found that can be used with this Extensible Authentication Protocol » (erreur 798) | Le certificat client est absent de `Current User\Personal` | Installer le certificat client avec sa clé privée |
| « The message received was unexpected or badly formatted » (0x80090326) | La clé publique du certificat racine n'est pas chargée ou est endommagée, ou une route définie par l'utilisateur avec une route par défaut est appliquée à `GatewaySubnet` | Charger de nouveau le certificat racine ; retirer la route |
| « A certificate chain processed but terminated in a root certificate which is not trusted » | Certificats absents des magasins de racines de confiance | Réinstaller les certificats racines du client et de la passerelle |
| « File download error. Target URI is not specified » | Mauvais type de passerelle | Utiliser le type de passerelle VPN avec le type de VPN RouteBased |
| Erreur 812, connexion empêchée par une stratégie du serveur RAS/VPN | Serveur RADIUS mal configuré ou injoignable depuis la passerelle | Vérifier les paramètres RADIUS et la route vers le serveur |
| « The network connection between your computer and the VPN server could not be established » avec IKEv2 | UDP 500 et 4500 bloqués, ou mise à jour de fragmentation IKE absente sur d'anciennes versions de Windows | Ouvrir les ports ou utiliser OpenVPN |
| Connecté, mais ressources Azure injoignables après l'ajout d'un peering | Le client n'a pas les nouvelles routes | Télécharger de nouveau le package client |
| « Your authentication with Microsoft Entra has expired » | Jeton d'actualisation expiré ou révoqué | Se reconnecter pour déclencher une connexion interactive ; consulter les journaux de connexion Entra |

Pour les échecs Entra ID, vérifiez d'abord les trois valeurs de la passerelle (tenant, audience, issuer avec sa barre oblique finale), puis que le profil importé dans Azure VPN Client a été généré après la dernière modification.

<!-- section: always-on-and-network-adapter | objectives: 2.2.8, 2.2.9 -->
## Exigences Azure pour le VPN Always On et Azure Network Adapter

Le **VPN Always On** est une fonctionnalité de Windows : la connexion VPN s'établit automatiquement, sans action de l'utilisateur. Deux tunnels existent et peuvent fonctionner en même temps :

| | Tunnel d'appareil | Tunnel utilisateur |
| --- | --- | --- |
| Se connecte | Avant la connexion de l'utilisateur | Après la connexion de l'utilisateur |
| Usage | Connectivité avant ouverture de session, gestion des appareils | Accès aux ressources de l'organisation |
| Client | Appareil joint au domaine, Windows Entreprise ou Éducation, 1809 ou ultérieur | Windows 10 ou ultérieur |
| Certificat | Certificat d'ordinateur, dans le magasin Ordinateur local | Certificat utilisateur, dans le magasin Utilisateur actuel |
| Profil | `DeviceTunnel` à `true`, installé dans le contexte LOCAL SYSTEM | `AlwaysOn` à `true`, installé avec PowerShell, Configuration Manager ou Intune |

Côté Azure, les deux demandent la même chose : une passerelle VPN basée sur des routes dont la configuration P2S utilise **IKEv2** et l'**authentification par certificat**. Le profil est un document ProfileXML poussé par le CSP VPNv2 ; le nom du serveur vient de `VpnSettings.xml` dans le dossier `Generic` du package client. Un seul tunnel d'appareil peut être configuré par appareil, et il ne fonctionne qu'avec le client VPN intégré à Windows.

**Azure Network Adapter** (Carte réseau Azure) est une fonctionnalité de Windows Admin Center qui connecte un serveur Windows Server local à un réseau virtuel par un VPN P2S en une seule opération : elle configure la passerelle et le client VPN sur le serveur. Exigences :

- Un abonnement Azure et un **réseau virtuel existant**.
- Windows Admin Center inscrit auprès d'Azure, dans sa dernière version.
- Un accès Internet depuis le serveur cible.
- Si le réseau virtuel n'a pas de passerelle, Windows Admin Center crée le `GatewaySubnet` et la passerelle VPN avec la référence SKU choisie (jusqu'à 25 minutes environ), avec l'authentification par certificat.
- Un espace d'adressage client qui ne chevauche ni le réseau virtuel ni le réseau local.

Elle convient à quelques serveurs d'une succursale qui n'a ni périphérique VPN ni adresse IP publique ; de nombreux serveurs ou un site entier relèvent d'un VPN de site à site.

> **Piège d'examen.** Un tunnel d'appareil ne peut utiliser ni l'authentification Microsoft Entra ID ou RADIUS, ni OpenVPN : certificat d'ordinateur et IKEv2 uniquement.

<!-- section: key-points -->
## Points clés

- Le P2S exige une passerelle VPN basée sur des routes ; la référence SKU fixe la limite de connexions (250, 500, 1 000, 5 000, 10 000 de VpnGw1AZ à VpnGw5AZ), et SSTP reste à 128.
- OpenVPN : TCP 443, toutes les plateformes, seul tunnel pour Microsoft Entra ID. IKEv2 : UDP 500/4500, clients natifs. SSTP : Windows uniquement, en cours de mise hors service.
- Référence SKU Basic : ni RADIUS ni OpenVPN, donc pas d'authentification Entra ID.
- Un serveur RADIUS local doit être joint par un VPN de site à site, jamais par ExpressRoute.
- Entra ID : URL du tenant, audience `c632b3df-fb67-4d84-bdcf-b95ad541b5c8`, issuer avec barre oblique finale, Azure VPN Client.
- Toute modification de la configuration P2S ou de la topologie routée impose de générer et redistribuer le package client.
- VPN Always On : IKEv2 et certificats ; le tunnel d'appareil demande un appareil Entreprise ou Éducation joint au domaine.
- Azure Network Adapter : Windows Admin Center, un réseau virtuel existant, un VPN P2S créé pour un seul serveur.
