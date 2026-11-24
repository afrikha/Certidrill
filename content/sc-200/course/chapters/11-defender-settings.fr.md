Avant qu'un SOC puisse répondre, le portail Defender doit être configuré : qui est prévenu des incidents et des actions de réponse, quelles alertes sont du bruit, comment les alertes sont regroupées en incidents, quelles fonctionnalités de Defender for Endpoint sont actives pour tout le locataire, quelles règles et quels indicateurs s'appliquent aux appareils, quelle télémétrie supplémentaire est collectée sur les points de terminaison et quelles règles de réduction de la surface d'attaque (ASR) bloquent les techniques des attaquants. La plupart de ces paramètres se trouvent sous **Paramètres** dans le portail Microsoft Defender (security.microsoft.com) ; l'examen demande quelle page ouvrir et quelle option sélectionner.

<!-- section: email-notifications | objectives: 1.1.1 -->
## Notifications par e-mail des incidents, des actions et de l'analytique des menaces

Les trois types de règles de notification se trouvent sous **Paramètres > Microsoft Defender XDR > Général > Notifications par e-mail**, un onglet chacun :

| Onglet | Notifie | Paramètres principaux |
| --- | --- | --- |
| Incidents | Les nouveaux incidents | Gravité des alertes, sources de service et de détection, étendue des groupes d'appareils, **Send only one notification per incident** (une seule notification par incident), inclure le nom de l'organisation, inclure un lien vers le portail propre au locataire |
| Actions | Les actions de réponse manuelles ou automatisées | Source de l'action (manuelle, automatisée ou les deux), les actions à surveiller, étendue des groupes d'appareils, statut de l'action (terminée, échouée ou les deux) |
| Analytique des menaces | Les rapports d'analytique des menaces nouveaux ou mis à jour | Tous les rapports, ou seulement ceux d'un type ou d'une étiquette donnés (par exemple Ransomware) |

Chaque règle est un court assistant : nom et description, paramètres de notification, destinataires (une ou plusieurs adresses e-mail, avec **Send test email**), vérification, création. La suppression d'une règle est définitive.

| Autorisation | Règle |
| --- | --- |
| Configurer les règles de notification | Autorisation **Manage security settings** ; avec les autorisations de base, Security Administrator ou plus |
| Avec RBAC et groupes d'appareils | Vous ne créez, modifiez, supprimez et recevez des notifications que pour les groupes d'appareils que vous êtes autorisé à gérer |

Les points que l'examen apprécie :

- Une notification d'incident contient le nom, la gravité et les catégories de l'incident, avec un lien vers celui-ci. Un destinataire ajouté plus tard n'est notifié que des incidents qui arrivent après son ajout.
- Vous pouvez fixer les gravités par source : par exemple Moyenne et Élevée pour les détections des points de terminaison, toutes les gravités pour une autre source.
- L'onglet **Actions** couvre les actions de l'enquête automatisée et de l'interruption automatique des attaques quand la source **automatisée** est sélectionnée. Il ne prend pas en charge les détections personnalisées qui contiennent des actions de réponse.
- Supprimer un groupe d'appareils le retire des règles de notification qui l'utilisent ; une règle dont c'était le seul groupe est supprimée aussi.

> **Piège d'examen.** L'exigence « prévenir le responsable du SOC uniquement quand un appareil du groupe Finance est isolé » est une règle de notification **Actions** (action : isoler l'appareil, étendue : le groupe d'appareils Finance), pas une règle de notification d'incident.

<!-- section: alert-tuning | objectives: 1.1.2 -->
## Réglage, suppression et corrélation des alertes

Le **réglage des alertes** (alert tuning, anciennement suppression des alertes) traite les alertes dont vous savez qu'elles sont bénignes. Créez une règle dans **Paramètres > Microsoft Defender XDR > Alert tuning > Add new rule**, ou directement depuis la page d'une alerte.

| Élément de la règle | Valeurs |
| --- | --- |
| Sources de service | Les services Defender (et, en préversion, les sources de détection) auxquels la règle s'applique ; seuls les services sur lesquels vous avez des autorisations sont listés |
| Conditions | Déclencheurs de l'alerte (IOC) comme fichier, processus, tâche planifiée, script AMSI ou événement WMI, combinés avec **AND**, **OR** et des regroupements ; jusqu'à 200 conditions ; valeurs non sensibles à la casse, certaines acceptent des caractères génériques |
| Action | **Hide alert**, **Resolve alert** ou **Set as behavior** |

| Action | Effet | Limites |
| --- | --- | --- |
| Hide alert | L'alerte est supprimée et aucun incident n'est créé ; elle reste dans `AlertInfo` et `AlertEvidence` | Alertes Defender for Endpoint uniquement |
| Resolve alert | Les alertes correspondantes et leurs incidents sont créés déjà résolus | |
| Set as behavior | Les signaux deviennent des comportements, visibles dans `BehaviorInfo` et `BehaviorEntities` (tables en préversion) pour la chasse, jamais dans la file d'alertes | Pas pour les alertes Defender for Cloud ni Defender for Office 365 |

Defender fournit aussi des **règles de réglage intégrées** pour les activités bénignes courantes. Elles n'affectent ni les enquêtes automatisées ni les notifications par e-mail, et une alerte qu'elles ont supprimée est réactivée si une enquête trouve une activité malveillante. Vous en désactivez une depuis son volet de détails. Les règles intégrées ne s'appliquent pas aux alertes des détections personnalisées ni du renseignement sur les menaces personnalisé.

**Corrélation.** Defender XDR regroupe les alertes liées en incidents avec sa propre logique de corrélation, et fusionne les incidents qui partagent des entités, des artefacts, des périodes ou une séquence d'attaque. L'incident source est fermé avec une étiquette `Redirected` et ses alertes, étiquettes et entités passent dans l'incident cible. Les incidents ne sont **pas** fusionnés quand :

- l'un d'eux est fermé ;
- ils sont attribués à deux personnes différentes ;
- ils ont des classifications ou des déterminations différentes ;
- la fusion dépasserait le nombre maximal d'entités ;
- ils contiennent des appareils de groupes d'appareils différents, une condition désactivée par défaut.

Vous pouvez fusionner jusqu'à cinq incidents manuellement, ou déplacer une alerte vers un autre incident. Les incidents candidats à une fusion manuelle doivent avoir les mêmes valeurs, ou des valeurs nulles, pour **Assigned to**, **Classification** et **Determination**, et c'est Defender qui décide quel incident est la cible. Seul l'espace de travail Microsoft Sentinel **principal** voit ses alertes corrélées avec celles de Defender XDR ; les espaces secondaires sont corrélés séparément.

> **Piège d'examen.** Le réglage et la suppression agissent sur les **alertes à leur création** dans Defender XDR. Une règle d'automatisation Sentinel qui ferme des incidents agit **après** la création de l'incident. Quand la question dit « l'alerte ne doit pas créer d'incident », la réponse est une règle de réglage des alertes.

<!-- section: advanced-features | objectives: 1.1.3 -->
## Les fonctionnalités avancées de Defender for Endpoint

**Paramètres > Points de terminaison > Général > Fonctionnalités avancées** regroupe des interrupteurs valables pour tout le locataire. Activez ou désactivez une fonctionnalité, puis **Save preferences**.

| Exigence | Fonctionnalité avancée |
| --- | --- |
| Bloquer les artefacts malveillants même quand un autre antivirus est principal | **Enable EDR in block mode** (fonctionne avec l'Antivirus Microsoft Defender en mode passif) |
| Bloquer le hachage d'un fichier depuis la page du fichier | **Allow or block file** (exige l'Antivirus Defender actif et la protection cloud) |
| Créer des indicateurs d'adresse IP, de domaine ou d'URL | **Custom network indicators** |
| Empêcher applications et utilisateurs de modifier les paramètres de sécurité de l'Antivirus Defender | **Tamper protection** (protection contre les falsifications) |
| Fermer les alertes quand aucune menace n'est trouvée ou que la menace a été corrigée | **Automatically resolve alerts** (les alertes passées manuellement à En cours ou Résolue ne sont pas écrasées) |
| Exécuter des commandes à distance sur un appareil | **Live response**, et séparément **Live response for servers** |
| Exécuter des scripts non signés en réponse dynamique | **Live response unsigned script execution** |
| Trouver les appareils non gérés du réseau | **Device discovery** |
| Télécharger un fichier mis en quarantaine pour l'analyser | **Download quarantined files** (activé par défaut) |
| Accès conditionnel basé sur le risque de l'appareil | **Microsoft Intune connection** (à activer aussi dans Intune) |
| Envoyer les signaux des points de terminaison à Defender for Cloud Apps | **Microsoft Defender for Cloud Apps** |
| Bloquer des sites web par catégorie | **Web content filtering**, puis une stratégie de filtrage du contenu web |
| Les SOC locaux ne voient les incidents que pour leurs groupes d'appareils | **Restrict correlation to within scoped device groups** (s'applique aux corrélations futures ; déconseillé sauf nécessité) |
| Empêcher la télémétrie usurpée | **Enable authenticated telemetry** |

> **Piège d'examen.** La réponse dynamique demande deux choses : la fonctionnalité avancée **Live response** (plus **Live response for servers** pour les serveurs) et un rôle doté des autorisations de réponse dynamique. Un rôle Defender for Endpoint seul ne l'active pas.

<!-- section: rules-settings | objectives: 1.1.4 -->
## Les paramètres des règles de Defender for Endpoint

La section **Paramètres > Points de terminaison > Règles** regroupe les règles qui s'appliquent aux appareils :

| Page | Rôle |
| --- | --- |
| Indicateurs | Autoriser, auditer, avertir ou bloquer des fichiers, certificats, adresses IP, URL et domaines |
| Web content filtering | Stratégies qui bloquent des catégories de sites web pour des groupes d'appareils |
| Automation uploads | Analyse du contenu : extensions de fichiers envoyées au cloud pour inspection pendant l'enquête automatisée |
| Automation folder exclusions | Dossiers que l'enquête automatisée ignore |
| Asset rule management | Règles qui appliquent des **étiquettes dynamiques** aux appareils |
| Custom data collection | Règles de télémétrie supplémentaire, voir la section suivante |

Le filtrage du contenu web utilise SmartScreen dans Microsoft Edge et exige la **protection réseau en mode blocage** pour Chrome, Firefox, Brave et Opera sous Windows.

**Indicateurs.** Jusqu'à 15 000 par locataire. Chacun a une action, une expiration et une étendue (tous les appareils ou des groupes d'appareils).

| Type d'indicateur | Actions |
| --- | --- |
| Hachage de fichier | Allow, Audit, Warn, Block execution, Block and remediate |
| Adresse IP, URL ou domaine | Allow, Audit, Warn, Block execution |
| Certificat (.cer ou .pem) | Allow, Block and remediate |

Les règles à retenir :

- Les indicateurs de fichier exigent l'Antivirus Defender en mode **actif**, la protection cloud, le calcul du hachage des fichiers (`EnableFileHashComputation`) et la fonctionnalité avancée **Allow or block file**. Sous Windows, ils s'appliquent aux fichiers PE (.exe, .dll). Les indicateurs ne sont pas pris en charge en mode passif.
- Les indicateurs d'IP et d'URL s'appuient sur SmartScreen dans Microsoft Edge et sur la protection réseau en **mode blocage** dans les autres navigateurs et processus. Un indicateur de domaine couvre aussi ses sous-domaines ; les chemins HTTPS ne sont reconnus que dans Microsoft Edge. Les plages d'IP et les caractères génériques ne sont pas pris en charge.
- Entre indicateurs de fichier en conflit, le hachage le plus long l'emporte (SHA-256, puis SHA-1, puis MD5), et un indicateur de groupe d'appareils l'emporte sur un indicateur « tous les appareils ».
- **Allow** ne crée pas d'alerte, **Audit** crée une alerte avec votre gravité, **Block** et **Warn** ne créent que des alertes informatives.
- Les fichiers signés par Microsoft ne peuvent pas être bloqués, et les indicateurs de fichier ne l'emportent pas sur les exclusions de l'Antivirus Defender.
- Un indicateur de fichier prend en général effet en 15 minutes (30 en moyenne), jusqu'à 2 heures. Un indicateur d'IP ou d'URL prend en général effet en moins de deux heures, mais peut demander jusqu'à 48 heures.

Les **exclusions de dossiers d'automatisation** s'appliquent à tous les appareils intégrés et uniquement à l'enquête automatisée : les fichiers exclus restent analysés par l'antivirus. Champs : dossier (obligatoire, sous-dossiers inclus, caractère générique final accepté), extensions, noms de fichiers, description (obligatoire).

> **Piège d'examen.** Pour empêcher l'enquête automatisée d'agir sur un dossier de build, utilisez une **exclusion de dossier d'automatisation**. Une exclusion de l'Antivirus Defender arrêterait aussi l'analyse, ce que l'exigence permet rarement.

<!-- section: custom-data-collection | objectives: 1.1.5 -->
## La collecte de données personnalisée

La télémétrie par défaut de Defender for Endpoint est filtrée. La **collecte de données personnalisée** ajoute des règles qui collectent des événements supplémentaires des points de terminaison avec vos propres filtres et les envoient à l'**espace de travail Microsoft Sentinel**, en plus de la télémétrie par défaut (elle ne la remplace pas).

| Élément | Règle |
| --- | --- |
| Emplacement | **Paramètres > Points de terminaison > Règles > Custom Data Collection** |
| Licence | Defender for Endpoint Plan 2 ; l'ingestion dans Sentinel est facturée normalement |
| Espace de travail | Un espace de travail Sentinel connecté, sélectionné sur la page **Workspace scope** ; un seul espace par locataire |
| Ciblage | Tous les appareils, ou les appareils portant des **étiquettes dynamiques** d'Asset rule management (étiquettes manuelles non prises en charge) |
| Systèmes pris en charge | Windows 10 et 11 (Windows 10 avec ESU), Windows Server 2019 et versions ultérieures |
| Limite | 75 000 événements par règle et par appareil sur 24 heures glissantes ; la règle s'arrête alors sur cet appareil jusqu'à la fin de la fenêtre |
| Déploiement | En général 20 minutes à 1 heure après la création ou la modification |

Assistant de règle : informations générales (nom, description), puis **Table**, **Action** et **Conditions**, puis étendue de la règle, puis **Submit**. Les données arrivent dans cinq tables :

| Table | Événements |
| --- | --- |
| `DeviceCustomProcessEvents` | Création et arrêt de processus |
| `DeviceCustomFileEvents` | Création, modification, suppression, accès aux fichiers |
| `DeviceCustomNetworkEvents` | Connexions réseau |
| `DeviceCustomImageLoadEvents` | Chargements de DLL et d'images |
| `DeviceCustomScriptEvents` | Exécution de scripts |

```kusto
search in (DeviceCustomFileEvents, DeviceCustomNetworkEvents, DeviceCustomProcessEvents) "a1b2c3d4e5"
| where DeviceId == "a1b2c3d4e5"
| summarize EventCount = count() by RuleName, $table
```

> **Piège d'examen.** Désactiver une règle arrête la collecte au prochain contact de l'agent ; la supprimer est définitif, mais les données déjà dans Sentinel restent. Une règle qui collecte tous les événements d'une table atteint vite la limite de 75 000 événements : filtrez-la et testez-la sur un petit groupe étiqueté.

<!-- section: asr-rules | objectives: 1.1.6 -->
## Les stratégies de sécurité et les règles de réduction de la surface d'attaque

Les règles ASR bloquent les comportements qu'exploitent les programmes malveillants : applications Office qui créent des processus enfants, scripts qui lancent des téléchargements, vol d'identifiants dans LSASS. Chaque règle a un GUID et un mode :

| Mode | Valeur | PowerShell |
| --- | --- | --- |
| Désactivé (Off) | 0 | `Disabled` |
| Bloquer (Block) | 1 | `Enabled` |
| Audit | 2 | `AuditMode` |
| Non configuré | 5 | `NotConfigured` |
| Avertir (Warn) | 6 | `Warn` |

Les règles vues dans les scénarios d'examen :

| Règle | Remarque |
| --- | --- |
| Block credential stealing from the Windows local security authority subsystem | Règle de protection standard ; pas de mode Warn ; non applicable quand la protection LSA est active |
| Block abuse of exploited vulnerable signed drivers | Règle de protection standard |
| Block persistence through WMI event subscription | Règle de protection standard |
| Block all Office applications from creating child processes | |
| Block Office applications from injecting code into other processes | Pas de mode Warn |
| Block executable content from email client and webmail | |
| Block process creations originating from PSExec and WMI commands | |
| Block executable files from running unless they meet a prevalence, age, or trusted list criterion | Exige la protection cloud |
| Use advanced protection against ransomware | Exige la protection cloud |
| Block untrusted and unsigned processes that run from USB | |

Les façons de les déployer :

| Méthode | Comment |
| --- | --- |
| Portail Defender | **Stratégies de sécurité des points de terminaison**, onglet des stratégies Windows, modèle **Attack surface reduction rules** |
| Intune | Sécurité des points de terminaison > stratégie de réduction de la surface d'attaque, attribuée à des groupes d'appareils (pas à des groupes d'utilisateurs) |
| Stratégie de groupe | Microsoft Defender Exploit Guard > Attack Surface Reduction > **Configure Attack Surface Reduction rules** : GUID comme nom de valeur, mode comme valeur |
| PowerShell | `Add-MpPreference` ou `Set-MpPreference` |

```powershell
# Block Office child processes, audit PSExec and WMI process creation
Add-MpPreference -AttackSurfaceReductionRules_Ids d4f940ab-401b-4efc-aadc-ad5f3c50688a,d1e49aac-8f56-4280-b9ba-993a6d77406c -AttackSurfaceReductionRules_Actions Enabled,AuditMode

# Exclusion for every ASR rule
Add-MpPreference -AttackSurfaceReductionOnlyExclusions "C:\Tools\Packager\pack.exe"
```

`Set-MpPreference` remplace toute la liste des règles ; `Add-MpPreference` la complète. Les paramètres locaux ont la priorité la plus basse. La stratégie de groupe l'emporte sur la MDM sauf si `MDMWinsOverGP` vaut 1. Avec la **protection de la configuration** (controlled configuration, en préversion), seules les stratégies Intune et Defender for Endpoint s'appliquent, et la stratégie de groupe, les scripts, Configuration Manager et les modifications locales sont ignorés.

Les exclusions sont soit **globales** (`AttackSurfaceReductionOnlyExclusions`, toutes les règles), soit **par règle** (section ASR only per rule exclusions dans Intune et le portail Defender). Plusieurs règles ont une prise en charge limitée des exclusions, dont la règle LSASS.

> **Piège d'examen.** Déployez les nouvelles règles ASR d'abord en mode **Audit** et examinez les événements dans le repérage avancé (`DeviceEvents` avec un `ActionType` qui commence par `Asr`) avant de passer en Block. Warn permet à l'utilisateur de contourner le blocage ; ce n'est pas une forme plus sûre d'Audit.

<!-- section: key-points -->
## Points clés

- Notifications par e-mail : Paramètres > Microsoft Defender XDR > Notifications par e-mail, avec les onglets Incidents, Actions et Analytique des menaces ; étendue par groupe d'appareils avec RBAC.
- Le réglage des alertes masque, résout ou transforme en comportements les alertes avant qu'elles ne créent des incidents ; Hide alert ne vaut que pour les alertes Defender for Endpoint.
- Les incidents ne fusionnent pas s'ils sont fermés, attribués à des personnes différentes ou classés différemment.
- Les fonctionnalités avancées sont des interrupteurs valables pour tout le locataire : réponse dynamique, EDR en mode bloc, autorisation ou blocage de fichiers, indicateurs réseau personnalisés, protection contre les falsifications.
- Indicateurs : 15 000 par locataire, étendue par groupes d'appareils ; les indicateurs de fichier exigent l'Antivirus Defender actif et la protection cloud.
- Les exclusions de dossiers d'automatisation ne concernent que l'enquête automatisée, pas l'analyse antivirus.
- La collecte de données personnalisée envoie des `DeviceCustom*Events` à l'espace de travail Sentinel, cible des étiquettes dynamiques, 75 000 événements par règle, par appareil et par jour.
- Modes ASR : Off 0, Block 1, Audit 2, Non configuré 5, Warn 6 ; auditer d'abord, puis bloquer.
