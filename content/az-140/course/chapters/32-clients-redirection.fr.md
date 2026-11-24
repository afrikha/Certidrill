Les utilisateurs accèdent à Azure Virtual Desktop par une application cliente, et ce qu'ils peuvent utiliser dans la session (Presse-papiers, lecteurs, webcams, imprimantes, vidéo) dépend des paramètres de redirection à trois niveaux. Les questions demandent quel client convient à une exigence de plateforme ou de fonctionnalité, comment le déployer et le mettre à jour, quelle propriété RDP ou quelle stratégie active ou bloque une redirection, et comment imprimer sans rediriger les imprimantes locales.

<!-- section: choose-client | objectives: 3.2.1 -->
## Choisir un client Azure Virtual Desktop

**Windows App** est le client d'Azure Virtual Desktop sur toutes les plateformes. Il remplace les clients Bureau à distance :

| Client | Statut |
| --- | --- |
| Windows App (Windows, macOS, iOS/iPadOS, Android/Chrome OS, navigateur web, Meta Quest) | Client actuel |
| Client Bureau à distance pour Windows (MSI, « Remote Desktop ») | Plus pris en charge dans le cloud public depuis le 27 mars 2026 |
| Client web Bureau à distance | Plus pris en charge dans le cloud public depuis le 27 mars 2026 ; remplacé par Windows App dans un navigateur |
| Application Bureau à distance pour Windows (Microsoft Store) | Fin de support atteinte en septembre 2025, n'est plus disponible |
| Bureau à distance pour macOS et iOS/iPadOS | Remplacé par Windows App |

Windows App se connecte avec un compte professionnel ou scolaire Microsoft (Microsoft Entra ID) ; un compte Microsoft personnel n'est pas accepté. La version web s'exécute sur `https://windows.cloud.microsoft` dans une version récente de Microsoft Edge, Google Chrome, Safari (macOS) ou Firefox, sans installation, mais les navigateurs mobiles ne sont pas pris en charge.

Les fonctionnalités diffèrent selon la plateforme. Celles qui décident des réponses d'examen :

| Fonctionnalité | Windows | macOS | iOS/iPadOS | Android/Chrome OS | Navigateur web |
| --- | --- | --- | --- | --- | --- |
| Plusieurs moniteurs | Oui | Oui | Non | ChromeOS uniquement | Non |
| Redirection multimédia (lecture vidéo et appels) | Oui | Non | Non | Non | Non |
| Optimisation multimédia de Teams (WebRTC) | Oui | Oui | Oui | Oui | Non |
| Redirection USB et des ports série | Oui | Non | Non | Non | Non |
| Redirection d'imprimantes | Oui | Oui (pilote Publisher Imagesetter uniquement) | Non | Non | Oui |
| Redirection de scanners (TWAIN, préversion) | Oui | Non | Non | Non | Non |
| RDP Shortpath pour les réseaux managés | Oui | Oui | Oui | Oui | Non |
| RDP Shortpath pour les réseaux publics (STUN/TURN) | Oui | Application bêta uniquement | Non | Oui | Non |
| RDP Multipath | Oui | Application bêta uniquement | Non | Non | Non |
| Private Link | Oui | Oui | Oui | Oui | Non |
| Lecteurs | Oui | Oui | Oui | Oui | Chargement et téléchargement uniquement |

Encore en préversion sur certaines plateformes : la redirection de caméras dans un navigateur web, la redirection de carte à puce sur iOS/iPadOS (YubiKey uniquement) et la redirection WebAuthn sur macOS, iOS/iPadOS et Android. « Application bêta uniquement » désigne la version bêta de Windows App pour macOS, pas l'application publiée.

> **Piège d'examen.** Une exigence de lecture vidéo redirigée, d'un périphérique USB ou d'un port COM impose Windows App sur **Windows**. Le navigateur web n'a ni RDP Shortpath ni Private Link, et il ne fait que charger et télécharger des fichiers au lieu de rediriger les lecteurs.

> **Conseil d'examen.** Windows App sur Windows ne se connecte pas aux services Bureau à distance (RDS) locaux ; il se connecte à Azure Virtual Desktop, Windows 365, Microsoft Dev Box et aux PC distants.

<!-- section: deploy-client | objectives: 3.2.2, 3.2.3 -->
## Déployer les clients et résoudre leurs problèmes

Méthodes de déploiement de Windows App sur Windows (Windows 11, Windows 10 1809 ou version ultérieure, Windows Server 2019 ou version ultérieure) :

| Méthode | Quand l'utiliser |
| --- | --- |
| Microsoft Store | Par défaut. Les mises à jour viennent du Store ; une tâche en arrière-plan vérifie toutes les 8 heures et installe quand l'application est fermée |
| Package MSIX autonome | Store bloqué, outil de déploiement d'entreprise, images. Les mises à jour viennent par défaut d'un CDN Microsoft |
| `winget download --id 9N1F85V9T8BN` puis `Add-AppxPackage` | Appareil hors connexion ou Store désactivé par stratégie : installez d'abord les dépendances de framework (VCLibs, Windows App Runtime), puis le package Windows App |
| Intune, Configuration Manager ou un autre outil de déploiement | Pousser l'application du Store ou le package MSIX vers les appareils managés |
| Navigateur web | Aucune installation possible (kiosque, appareil non managé ou Linux) |
| Magasins d'applications (Apple App Store, Google Play) | macOS, iOS/iPadOS, Android/Chrome OS |

Le comportement des mises à jour se définit sur l'appareil local par une valeur de Registre, que vous pouvez déployer avec Intune, Configuration Manager ou une stratégie de groupe :

```powershell
# 0 = updates enabled (default), 1 = disable all, 2 = disable Store updates, 3 = disable CDN updates
$path = "HKLM:\SOFTWARE\Microsoft\WindowsApp"
If (!(Test-Path $path)) { New-Item -Path $path -Force }
New-ItemProperty -Path $path -Name DisableAutomaticUpdates -PropertyType DWORD -Value 1 -Force
```

Les mises à jour automatiques ne peuvent être désactivées que pour une installation MSIX ; une installation depuis le Store suit les paramètres de mise à jour du Store. Microsoft ne recommande pas de désactiver les mises à jour et peut bloquer les versions de client obsolètes.

Liste de contrôle de dépannage :

| Symptôme | Cause et correction |
| --- | --- |
| « Votre administrateur système n'a pas encore configuré de ressources » | L'utilisateur n'est affecté à aucun groupe d'applications, ou le groupe d'applications n'est pas inscrit dans un espace de travail |
| Flux vide, ou la connexion au compte fonctionne mais la session échoue derrière un proxy ou un pare-feu | L'appareil de l'utilisateur ne joint pas les FQDN et points de terminaison Azure Virtual Desktop requis pour les appareils des utilisateurs finaux |
| Un utilisateur ne peut pas se connecter avec un compte personnel | Seuls les comptes professionnels ou scolaires sont pris en charge |
| L'application ne s'ouvre pas ou se comporte mal | Mettez-la à jour, puis utilisez **Réparer** ou **Réinitialiser** dans les Paramètres Windows (Applications) ; testez avec Windows App dans un navigateur pour isoler l'appareil |
| Sessions lentes ou instables | Vérifiez le temps d'aller-retour avec Azure Virtual Desktop Experience Estimator et le transport (RDP Shortpath) dans les informations de connexion |
| Nouvelle propriété RDP non appliquée | Les utilisateurs doivent actualiser leurs ressources (ou se reconnecter) pour recevoir le fichier `.rdp` mis à jour |

<!-- section: device-redirection | objectives: 3.2.4 -->
## Configurer la redirection des appareils

La redirection se contrôle à trois endroits, et **le paramètre le plus restrictif l'emporte**, où qu'il soit configuré :

| Point de contrôle | Outil | Exemple |
| --- | --- | --- |
| Hôte de session (côté serveur) | Catalogue de paramètres Intune ou stratégie de groupe : **Modèles d'administration > Composants Windows > Services Bureau à distance > Hôte de session Bureau à distance > Redirection de périphérique et de ressource** (et **Redirection de l'imprimante**) | **Do not allow Clipboard redirection** = Activé la bloque, quelle que soit la propriété RDP |
| Pool d'hôtes | Propriétés RDP (portail : pool d'hôtes > **Propriétés RDP**, onglets Informations de connexion, Comportement de session, Redirection de périphérique, Paramètres d'affichage, Avancé) | `redirectclipboard:i:1` |
| Appareil local | Registre `HKLM\Software\Microsoft\Terminal Server Client` (`DisableClipboardRedirection`, `DisablePrinterRedirection` = 1), ou protection des applications Intune sur iOS/iPadOS, Android et Edge | Bloque un appareil pendant que les autres gardent la redirection |

Microsoft recommande d'autoriser la redirection sur les hôtes de session, puis de la contrôler avec les propriétés RDP du pool d'hôtes. La redirection du Presse-papiers, des imprimantes et des lecteurs est désactivée dans les propriétés RDP des **pools d'hôtes nouvellement créés**.

| Redirection | Propriété RDP | Valeurs |
| --- | --- | --- |
| Presse-papiers | `redirectclipboard:i:` | 0 désactivé, 1 activé |
| Lecteurs locaux, amovibles et réseau | `drivestoredirect:s:` | vide aucun, `*` tous, `DynamicDrives` lecteurs connectés plus tard, `C:\;E:\;` lecteurs listés |
| Microphone | `audiocapturemode:i:` | 0 désactivé (par défaut), 1 activé |
| Sortie audio | `audiomode:i:` | 0 appareil local (par défaut), 1 session distante, 2 aucune |
| Caméras | `camerastoredirect:s:` | `*` toutes, une liste de chemins de périphérique, préfixe `-` pour exclure |
| Périphériques MTP/PTP (appareils photo numériques, lecteurs multimédias) | `devicestoredirect:s:` | `*` tous, `DynamicDevices` |
| Imprimantes | `redirectprinters:i:` | 0 désactivé, 1 activé |
| Cartes à puce | `redirectsmartcards:i:` | 1 activé (par défaut) |
| Ports série/COM | `redirectcomports:i:` | 0 désactivé, 1 activé |
| USB (bas niveau opaque) | `usbdevicestoredirect:s:` | vide aucun, `*`, GUID de classe, chemin d'instance |
| Emplacement | `redirectlocation:i:` | 0 emplacement de l'hôte de session (par défaut), 1 emplacement de l'appareil local |
| WebAuthn (Windows Hello, clés de sécurité dans la session) | `redirectwebauthn:i:` | 1 activé (par défaut) |

```powershell
# Replaces the custom RDP properties of the host pool (an empty string removes them all)
Update-AzWvdHostPool -Name hp-sales -ResourceGroupName rg-avd `
  -CustomRdpProperty "redirectclipboard:i:0;drivestoredirect:s:;usbdevicestoredirect:s:;audiocapturemode:i:1;camerastoredirect:s:*"
```

La **redirection de haut niveau** (la plupart des classes : clavier, Presse-papiers, lecteurs, caméras, microphones, imprimantes, cartes à puce) utilise un protocole optimisé, n'a besoin du pilote que sur l'appareil local, et le périphérique reste utilisable localement. La **redirection de bas niveau opaque** (`usbdevicestoredirect`, ports série, imprimantes/scanners tout-en-un, lecteurs biométriques, casques VoIP) transmet le trafic USB brut : le pilote doit être installé **sur l'hôte de session**, et le périphérique n'est plus disponible localement pendant la redirection. Les cartes réseau USB et les écrans USB ne peuvent jamais être redirigés.

```text
usbdevicestoredirect:s:*;{<DeviceClassGUID>};<USBInstanceID>;<-USBInstanceID>
```

Les valeurs sont traitées dans cet ordre : `*`, GUID de classe, chemins d'instance à inclure, puis chemins d'instance préfixés par `-` à exclure.

> **Piège d'examen.** Si la redirection des lecteurs est bloquée sur l'hôte de session par stratégie, les utilisateurs ne peuvent plus copier de **fichiers** par le Presse-papiers ; le texte et les images fonctionnent toujours.

> **Piège d'examen.** Autoriser une redirection dans les propriétés RDP du pool d'hôtes ne suffit pas quand la stratégie de l'hôte de session la bloque. Vérifiez d'abord le point le plus restrictif.

<!-- section: multimedia-redirection | objectives: 3.2.5 -->
## Configurer la redirection multimédia

La redirection multimédia (MMR) décharge du travail de l'hôte de session vers l'appareil local :

| Fonction | Effet |
| --- | --- |
| Redirection de la lecture vidéo | Le navigateur de la session récupère la vidéo, le flux binaire est décodé et affiché sur l'appareil local (YouTube, Microsoft Stream, LinkedIn Learning et d'autres sites listés). Le contenu protégé n'est pas pris en charge |
| Redirection des appels | Les appels WebRTC des applications d'appel dans le navigateur (applications de centre de contact comme Genesys, Five9, Twilio Flex) sont déchargés vers l'appareil local |

Prérequis et mise en place :

1. Hôtes de session avec la dernière version de Microsoft Edge ou de Google Chrome et Microsoft Visual C++ Redistributable 2015-2022 (14.32.31332.0 ou version ultérieure), aussi sur les appareils Windows locaux.
2. Les utilisateurs se connectent avec **Windows App sur Windows** (2.0.297.0 ou version ultérieure).
3. Installez le MSI unique (`https://aka.ms/avdmmr/msi`) sur les hôtes de session, navigateurs fermés : il installe le service **Remote Desktop Multimedia Redirection Service** et l'extension de navigateur. `msiexec /i <file> /qn` pour un déploiement silencieux. Le service ne se met pas à jour seul ; l'extension, si.
4. Les utilisateurs sont invités à activer l'extension, ou vous l'installez de force avec la stratégie de navigateur **Configure extension management settings** (catalogue de paramètres Intune, stratégie de groupe ou service de gestion Microsoft Edge).

```json
{
  "joeclbldhdmoijbaagobkhlpfjglcihd": {
    "installation_mode": "force_installed",
    "update_url": "https://edge.microsoft.com/extensionwebstorebase/v1/crx"
  }
}
```

Les sites supplémentaires s'ajoutent avec les valeurs de Registre `AllowedVideoRedirectionSites` et `AllowedCallRedirectionSites` sous la clé de stratégie de l'extension ; `runtime_blocked_hosts` dans les paramètres d'extension bloque l'extension sur les domaines choisis. L'icône de l'extension indique si la page est redirigée.

> **Piège d'examen.** La redirection multimédia n'est pas l'optimisation de Teams. Microsoft Teams utilise sa propre optimisation multimédia (service WebRTC Redirector ou SlimCore) ; MMR concerne la vidéo et les appels **dans un navigateur**.

<!-- section: printing | objectives: 3.2.6 -->
## Configurer l'impression et l'impression universelle

Deux façons d'imprimer depuis une session :

| Approche | Fonctionnement | À choisir quand |
| --- | --- | --- |
| Redirection d'imprimantes | `redirectprinters:i:1` : chaque imprimante de l'appareil local apparaît dans la session sous la forme *Nom de l'imprimante (redirected n)* avec le pilote **Remote Desktop Easy Print**. Le vrai pilote n'est nécessaire que sur l'appareil local | Les utilisateurs impriment sur des imprimantes reliées ou installées sur leur propre appareil |
| Impression universelle (Universal Print) | Service d'impression cloud de Microsoft 365 : les imprimantes sont inscrites dans Universal Print (directement ou par le connecteur Universal Print), partagées, et l'accès est accordé aux utilisateurs. Les utilisateurs se connectent avec Microsoft Entra ID et installent les imprimantes partagées dans la session | Pas de serveur d'impression, imprimantes du bureau quel que soit l'appareil client, clients mobiles ou navigateur qui ne peuvent pas rediriger les imprimantes |

Détails de la redirection d'imprimantes :

- Toutes les imprimantes locales sont redirigées, jamais une sélection ; l'imprimante par défaut locale devient l'imprimante par défaut de la session.
- Bloquez-la sur l'hôte de session avec **Do not allow client printer redirection** (catalogue de paramètres Intune ou stratégie de groupe, sous **Hôte de session Bureau à distance > Redirection de l'imprimante**), sur le pool d'hôtes avec `redirectprinters:i:0`, ou sur un appareil avec `DisablePrinterRedirection`.
- `SmartRawPrinters:s:*` (ou un préfixe de nom de pilote) active l'impression RAW pour les imprimantes redirigées dont les travaux ne sont pas compatibles XPS ; la redirection d'imprimantes doit être activée.
- Vérifiez dans la session avec `Get-Printer | ? DriverName -eq "Remote Desktop Easy Print"`.

Universal Print sur les hôtes multisession (Windows 11 Entreprise multisession 22H2 ou version ultérieure) : les imprimantes s'installent **par utilisateur** et non pour toute la machine, suivent le profil FSLogix vers les autres hôtes de session, et la recherche par emplacement peut utiliser l'emplacement de l'appareil client si **Services de localisation** et **Autoriser le remplacement de l'emplacement** sont activés sur les hôtes de session.

> **Conseil d'examen.** « Les utilisateurs se connectent depuis des iPad et doivent imprimer sur les imprimantes du bureau sans serveur d'impression » désigne Universal Print : Windows App sur iOS/iPadOS ne redirige pas les imprimantes.

<!-- section: key-points -->
## Points clés

- Windows App est le client partout ; le client MSI et le client web ne sont plus pris en charge dans le cloud public depuis le 27 mars 2026.
- Seul Windows App sur Windows offre la redirection multimédia, la redirection USB et des ports COM et RDP Multipath (sur macOS, seulement dans l'application bêta) ; iOS/iPadOS n'a RDP Shortpath que pour les réseaux managés ; le navigateur n'a ni RDP Shortpath ni Private Link.
- Les installations depuis le Store se mettent à jour par le Store ; les installations MSIX se contrôlent avec `DisableAutomaticUpdates`.
- Redirection = stratégie de l'hôte de session + propriété RDP du pool d'hôtes + appareil local : le plus restrictif l'emporte ; les nouveaux pools d'hôtes désactivent la redirection du Presse-papiers, des imprimantes et des lecteurs.
- La redirection USB de bas niveau opaque exige le pilote dans la session ; la redirection de haut niveau l'exige localement.
- MMR = un MSI sur les hôtes de session + une extension de navigateur, clients Windows uniquement.
- La redirection d'imprimantes utilise Remote Desktop Easy Print ; Universal Print est l'alternative cloud, avec des imprimantes par utilisateur sur Windows 11 multisession.
